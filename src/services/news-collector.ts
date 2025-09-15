import { ofetch } from 'ofetch';
import { NewsItem, NewsSource, NewsStats, AppConfig } from '../types/index.js';
import { retry, uniqueArray, generateId, calculateSimilarity } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

/**
 * 新闻收集服务
 */
export class NewsCollector {
  private config: AppConfig;
  private cache: Map<string, { data: NewsItem[]; timestamp: number }> = new Map();

  constructor(config: AppConfig) {
    this.config = config;
  }

  /**
   * 收集所有新闻源的新闻
   */
  async collectAllNews(sources: NewsSource[]): Promise<{ news: NewsItem[]; stats: NewsStats }> {
    const startTime = Date.now();
    const stats: NewsStats = {
      totalCollected: 0,
      bySource: {},
      byCategory: {},
      duplicatesRemoved: 0,
      processingTime: 0
    };

    const allNews: NewsItem[] = [];
    const enabledSources = sources.filter(source => source.enabled);

    logger.info(`开始收集新闻，共 ${enabledSources.length} 个新闻源`);

    // 并发收集新闻
    const promises = enabledSources.map(async (source) => {
      try {
        const news = await this.collectNewsFromSource(source);
        stats.bySource[source.name] = news.length;
        stats.totalCollected += news.length;
        
        logger.debug(`从 ${source.name} 收集到 ${news.length} 条新闻`);
        return news;
      } catch (error) {
        logger.error(`收集 ${source.name} 新闻失败:`, error);
        stats.bySource[source.name] = 0;
        return [];
      }
    });

    const results = await Promise.all(promises);
    results.forEach(news => allNews.push(...news));

    // 去重
    const originalCount = allNews.length;
    const uniqueNews = this.deduplicateNews(allNews);
    stats.duplicatesRemoved = originalCount - uniqueNews.length;

    // 限制总数量
    const limitedNews = uniqueNews.slice(0, this.config.scheduler.newsTotalLimit);

    // 统计分类
    limitedNews.forEach(item => {
      const category = item.category || '未分类';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    stats.processingTime = Date.now() - startTime;
    
    logger.info(`新闻收集完成，共收集 ${stats.totalCollected} 条，去重后 ${uniqueNews.length} 条，最终 ${limitedNews.length} 条`);

    return { news: limitedNews, stats };
  }

  /**
   * 从单个新闻源收集新闻
   */
  private async collectNewsFromSource(source: NewsSource): Promise<NewsItem[]> {
    try {
      const response = await this.fetchNewsFromMCP(source.id, source.maxItems || 10);
      
      const transformedNews = this.transformMCPResponse(response, source);
      logger.info(`✅ 成功收集 ${source.name} 新闻: ${transformedNews.length} 条`);
      return transformedNews;
    } catch (error: any) {
      logger.warn(`❌ 收集 ${source.name} 新闻失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 通过NewsNow API获取新闻数据
   */
  private async fetchNewsFromMCP(sourceId: string, count: number): Promise<any> {
    logger.debug(`调用NewsNow API获取新闻: ${sourceId}, count: ${count}`);
    
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 调用NewsNow API获取真实新闻数据
        const apiUrl = `http://localhost:5173/api/s?id=${sourceId}`;
        logger.debug(`请求URL (尝试 ${attempt}/${maxRetries}): ${apiUrl}`);
        
        const response = await ofetch(apiUrl, {
          timeout: 15000, // 15秒超时，参考newsnow配置
          retry: 0, // 我们自己处理重试
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache'
          },
          // 添加错误处理选项
          ignoreResponseError: false
        });
        
        logger.debug(`NewsNow API响应成功: ${sourceId} (尝试 ${attempt})`, {
          itemsCount: response?.items?.length || 0,
          hasItems: !!response?.items
        });
        
        // 检查响应格式
        if (response && response.items && Array.isArray(response.items) && response.items.length > 0) {
          // 限制返回的新闻数量
          const limitedItems = response.items.slice(0, count);
          return {
            success: true,
            data: limitedItems
          };
        } else {
          logger.warn(`NewsNow API返回空数据: ${sourceId} (尝试 ${attempt})`);
          if (attempt === maxRetries) {
            return {
              success: false,
              data: [],
              error: 'Empty response from API'
            };
          }
          // 空数据也重试
          await this.delay(1000 * attempt); // 递增延迟
          continue;
        }
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        logger.warn(`NewsNow API请求失败: ${sourceId} (尝试 ${attempt}/${maxRetries}) - ${errorMessage}`);
        
        // 如果是最后一次尝试，记录详细错误
        if (attempt === maxRetries) {
          logger.error(`NewsNow API最终失败: ${sourceId}`, {
            error: errorMessage,
            stack: error?.stack,
            cause: error?.cause,
            code: error?.code,
            status: error?.status
          });
          break;
        }
        
        // 根据错误类型决定是否重试
        if (this.shouldRetry(error)) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 指数退避，最大5秒
          logger.debug(`等待 ${delay}ms 后重试...`);
          await this.delay(delay);
        } else {
          logger.error(`不可重试的错误，停止尝试: ${sourceId} - ${errorMessage}`);
          break;
        }
      }
    }
    
    return {
      success: false,
      data: [],
      error: lastError?.message || 'Failed after all retries'
    };
  }
  
  /**
   * 判断错误是否应该重试
   */
  private shouldRetry(error: any): boolean {
    // 网络错误、超时错误、5xx服务器错误应该重试
    if (error?.code === 'ECONNREFUSED' || 
        error?.code === 'ENOTFOUND' || 
        error?.code === 'ETIMEDOUT' ||
        error?.name === 'TimeoutError') {
      return true;
    }
    
    // HTTP 5xx 错误应该重试
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    
    // HTTP 429 (Too Many Requests) 应该重试
    if (error?.status === 429) {
      return true;
    }
    
    // 4xx 客户端错误通常不应该重试
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }
    
    // 其他未知错误默认重试
    return true;
  }
  
  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 转换MCP响应为NewsItem格式
   */
  private transformMCPResponse(response: any, source: NewsSource): NewsItem[] {
    // 处理直接的API响应格式 {items: [...]}
    const items = response.items || response.data || [];
    if (!items || !Array.isArray(items)) {
      return [];
    }

    return items.map((item: any) => ({
      id: generateId(),
      title: item.title || '无标题',
      url: item.url || '',
      description: item.description || item.summary || '',
      publishTime: item.publishTime || item.time || new Date().toISOString(),
      source: source.name,
      category: this.detectCategory(item.title || ''),
      score: this.calculateNewsScore(item),
      tags: this.extractTags(item.title || '')
    }))
  }

  /**
   * 新闻去重
   */
  private deduplicateNews(news: NewsItem[]): NewsItem[] {
    return uniqueArray(news, (item) => {
      // 基于标题和URL的组合进行去重
      return `${item.title.toLowerCase()}-${item.url}`;
    }).filter((item, index, array) => {
      // 进一步检查标题相似度
      for (let i = 0; i < index; i++) {
        if (calculateSimilarity(item.title, array[i].title) > 0.8) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 检测新闻分类（优先识别科技类）
   */
  private detectCategory(title: string): string {
    const categories = {
      '科技': [
        'AI', '人工智能', '科技', '技术', '互联网', '软件', '硬件', '芯片', '5G', '6G', '区块链',
        'ChatGPT', 'GPT', 'OpenAI', '机器学习', '深度学习', '神经网络', '算法',
        '元宇宙', 'VR', 'AR', 'MR', '虚拟现实', '增强现实',
        '云计算', '大数据', '物联网', 'IoT', '边缘计算',
        '自动驾驶', '无人驾驶', '智能汽车', '新能源', '电动车', '特斯拉',
        '量子计算', '量子', '生物技术', '基因', 'DNA',
        '苹果', 'iPhone', 'iPad', 'Mac', '华为', '小米', 'OPPO', 'vivo',
        '腾讯', '阿里巴巴', '字节跳动', '百度', '微软', '谷歌', 'Meta',
        '半导体', '台积电', '英伟达', 'NVIDIA', 'AMD', '英特尔',
        '编程', '开发', '代码', 'GitHub', '开源', 'Linux',
        '网络安全', '黑客', '数据泄露', '加密', '隐私',
        '直播', '短视频', '抖音', 'TikTok', '快手', 'B站'
      ],
      '财经': ['股票', '金融', '经济', '投资', '银行', '基金', '债券', '货币', '财经', '市场'],
      '社会': ['社会', '民生', '教育', '医疗', '环境', '交通', '住房', '就业'],
      '国际': ['国际', '全球', '美国', '欧洲', '日本', '韩国', '俄罗斯', '印度'],
      '娱乐': ['娱乐', '明星', '电影', '音乐', '游戏', '体育', '足球', '篮球']
    };

    // 优先检测科技类关键词
    const techKeywords = categories['科技'];
    if (techKeywords.some(keyword => title.toLowerCase().includes(keyword.toLowerCase()))) {
      return '科技';
    }

    // 检测其他分类
    for (const [category, keywords] of Object.entries(categories)) {
      if (category !== '科技' && keywords.some(keyword => title.includes(keyword))) {
        return category;
      }
    }

    return '其他';
  }

  /**
   * 计算新闻评分
   */
  private calculateNewsScore(item: any): number {
    let score = 50; // 基础分数

    // 根据标题长度调整
    const titleLength = (item.title || '').length;
    if (titleLength > 10 && titleLength < 100) {
      score += 10;
    }

    // 根据描述长度调整
    const descLength = (item.description || '').length;
    if (descLength > 20) {
      score += 5;
    }

    // 根据发布时间调整（越新越高分）
    if (item.publishTime) {
      const publishTime = new Date(item.publishTime).getTime();
      const now = Date.now();
      const hoursDiff = (now - publishTime) / (1000 * 60 * 60);
      
      if (hoursDiff < 1) score += 20;
      else if (hoursDiff < 6) score += 10;
      else if (hoursDiff < 24) score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 提取标签
   */
  private extractTags(title: string): string[] {
    const commonTags = ['AI', '人工智能', '区块链', '5G', '新能源', '芯片', '互联网', '科技'];
    return commonTags.filter(tag => title.includes(tag));
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('新闻缓存已清理');
  }
}