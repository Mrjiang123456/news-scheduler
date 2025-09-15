import { ofetch } from 'ofetch';
import { logger } from '../utils/logger.js';

export interface LLMResponse {
  isTechNews: boolean;
  confidence: number;
  techKeywords: string[];
  reasoning: string;
  relevanceScore?: number;
  category?: string;
  tags?: string[];
}

export interface SummaryRequest {
  newsCount: number;
  categories: Record<string, number>;
  topNews: any[];
  baseSummary: string;
}

export interface SummaryResponse {
  summary: string;
}

export class LLMService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(apiKey?: string, baseUrl?: string, model?: string) {
    this.apiKey = apiKey || process.env.VOLC_API_KEY || '';
    this.baseUrl = baseUrl || 'https://ark.cn-beijing.volces.com/api/v3';
    this.model = model || process.env.VOLC_MODEL || 'ep-20241215120932-txvkx';
  }

  /**
   * 分析单条新闻（包含分类、评分、标签等）
   */
  async analyzeNews(newsItem: any): Promise<LLMResponse> {
    const techAnalysis = await this.analyzeTechNews(newsItem.title, newsItem.description);
    
    return {
      ...techAnalysis,
      relevanceScore: this.calculateRelevanceScore(newsItem, techAnalysis),
      category: techAnalysis.isTechNews ? '科技' : newsItem.category,
      tags: techAnalysis.techKeywords
    };
  }

  /**
   * 使用LLM判断新闻是否为科技类
   */
  async analyzeTechNews(title: string, description?: string): Promise<LLMResponse> {
    try {
      const content = `标题: ${title}${description ? `\n描述: ${description}` : ''}`;
      
      const prompt = `请分析以下新闻是否属于科技类新闻。科技类新闻包括但不限于：人工智能、机器学习、软件开发、硬件技术、互联网、移动应用、区块链、云计算、大数据、物联网、自动驾驶、新能源技术、生物技术、量子计算、网络安全、科技公司动态等。

新闻内容：
${content}

请以JSON格式回复，包含以下字段：
{
  "isTechNews": boolean, // 是否为科技类新闻
  "confidence": number, // 置信度(0-1)
  "techKeywords": string[], // 识别到的科技关键词
  "reasoning": string // 判断理由
}`;

      const response = await ofetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的新闻分类专家，擅长识别科技类新闻。请严格按照JSON格式回复，不要添加任何其他内容。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 500
        }
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('LLM返回结果为空');
      }

      // 尝试解析JSON响应
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM返回格式不正确');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        isTechNews: parsed.isTechNews || false,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        techKeywords: Array.isArray(parsed.techKeywords) ? parsed.techKeywords : [],
        reasoning: parsed.reasoning || ''
      };

    } catch (error: any) {
      logger.error('LLM分析失败', { error: error?.message || String(error), title });
      
      // 降级到关键词匹配
      return this.fallbackAnalysis(title, description);
    }
  }

  /**
   * 降级分析方法（关键词匹配）
   */
  private fallbackAnalysis(title: string, description?: string): LLMResponse {
    const techKeywords = [
      'AI', '人工智能', '机器学习', '深度学习', '神经网络',
      '科技', '技术', '互联网', '软件', '硬件', '芯片', '5G', '6G',
      '区块链', 'ChatGPT', 'GPT', 'OpenAI', '算法',
      '元宇宙', 'VR', 'AR', 'MR', '虚拟现实', '增强现实',
      '云计算', '大数据', '物联网', 'IoT', '边缘计算',
      '自动驾驶', '无人驾驶', '智能汽车', '新能源', '电动车',
      '量子计算', '量子', '生物技术', '基因', 'DNA',
      '苹果', 'iPhone', 'iPad', '华为', '小米', '腾讯', '阿里巴巴',
      '字节跳动', '百度', '微软', '谷歌', 'Meta', '英伟达', 'NVIDIA',
      '半导体', '台积电', 'AMD', '英特尔', '编程', '开发', '代码',
      'GitHub', '开源', 'Linux', '网络安全', '黑客', '数据泄露'
    ];

    const content = `${title} ${description || ''}`.toLowerCase();
    const foundKeywords = techKeywords.filter(keyword => 
      content.includes(keyword.toLowerCase())
    );

    const isTechNews = foundKeywords.length > 0;
    const confidence = Math.min(0.8, foundKeywords.length * 0.2);

    return {
      isTechNews,
      confidence,
      techKeywords: foundKeywords,
      reasoning: isTechNews ? `关键词匹配: ${foundKeywords.join(', ')}` : '未找到科技相关关键词'
    };
  }

  /**
   * 批量分析新闻
   */
  async batchAnalyze(newsItems: Array<{ title: string; description?: string }>): Promise<LLMResponse[]> {
    const results: LLMResponse[] = [];
    
    // 限制并发数量避免API限流
    const batchSize = 3;
    for (let i = 0; i < newsItems.length; i += batchSize) {
      const batch = newsItems.slice(i, i + batchSize);
      const batchPromises = batch.map(item => 
        this.analyzeTechNews(item.title, item.description)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 添加延迟避免API限流
      if (i + batchSize < newsItems.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * 计算新闻相关性评分
   */
  private calculateRelevanceScore(newsItem: any, analysis: LLMResponse): number {
    let score = 50; // 基础分
    
    // 科技类新闻加分
    if (analysis.isTechNews) {
      score += analysis.confidence * 30; // 根据置信度加分
    }
    
    // 标题长度评分
    const titleLength = (newsItem.title || '').length;
    if (titleLength > 10 && titleLength < 100) {
      score += 10;
    }
    
    // 描述长度评分
    const descLength = (newsItem.description || '').length;
    if (descLength > 20) {
      score += 5;
    }
    
    // 时效性评分
    if (newsItem.publishedAt) {
      const publishTime = new Date(newsItem.publishedAt).getTime();
      const now = Date.now();
      const hoursDiff = (now - publishTime) / (1000 * 60 * 60);
      
      if (hoursDiff < 1) score += 20;
      else if (hoursDiff < 6) score += 10;
      else if (hoursDiff < 24) score += 5;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * 生成新闻摘要
   */
  async generateSummary(request: SummaryRequest): Promise<SummaryResponse> {
    try {
      const prompt = `请基于以下新闻数据生成一个简洁的新闻摘要：

新闻总数：${request.newsCount}
分类统计：${JSON.stringify(request.categories)}
热门新闻标题：${request.topNews.map(n => n.title).slice(0, 3).join('、')}

基础摘要：${request.baseSummary}

请生成一个更加生动、有吸引力的新闻摘要，重点突出科技类新闻。`;

      const response = await ofetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的新闻编辑，擅长生成简洁有吸引力的新闻摘要。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 300
        }
      });

      const result = response.choices[0]?.message?.content;
      return {
        summary: result || request.baseSummary
      };
    } catch (error: any) {
      logger.error('LLM摘要生成失败', { error: error?.message || String(error) });
      return {
        summary: request.baseSummary
      };
    }
  }
}