import { logger } from '../utils/logger.js';
import { LLMService } from './llm-service.js';
/**
 * 新闻聚合服务
 */
export class NewsAggregator {
    config;
    llmService;
    constructor(config) {
        this.config = config;
        this.llmService = new LLMService(this.config.llm.apiKey, this.config.llm.baseUrl, this.config.llm.model);
    }
    /**
     * 生成新闻摘要（集成LLM智能分析）
     */
    async generateDigest(news) {
        logger.info(`开始生成新闻摘要，共 ${news.length} 条新闻`);
        if (news.length === 0) {
            return {
                totalCount: 0,
                topNews: [],
                categories: {},
                summary: '暂无新闻数据',
                generatedAt: new Date().toISOString()
            };
        }
        // 使用LLM增强新闻分析
        const enhancedNews = await this.enhanceNewsWithLLM(news);
        // 按相关性排序（包含LLM评分）
        const sortedNews = this.sortNewsByRelevance(enhancedNews);
        // 统计分类
        const categories = this.categorizeNews(sortedNews);
        // 选择热门新闻
        const topNews = sortedNews.slice(0, 20);
        // 生成摘要文本
        const summary = await this.generateSummaryTextWithLLM(sortedNews, categories);
        const digest = {
            totalCount: news.length,
            categories,
            topNews,
            summary,
            generatedAt: new Date().toISOString()
        };
        logger.info('新闻摘要生成完成', {
            totalCount: digest.totalCount,
            topNewsCount: topNews.length,
            categoriesCount: Object.keys(categories).length
        });
        return digest;
    }
    /**
     * 按相关性排序新闻（优先展示科技类新闻）
     */
    sortNewsByRelevance(news) {
        const sortedNews = [...news].sort((a, b) => {
            // 计算包含科技类权重的总分
            const scoreA = this.calculateFinalScore(a);
            const scoreB = this.calculateFinalScore(b);
            if (scoreA !== scoreB) {
                return scoreB - scoreA;
            }
            // 评分相同时按发布时间排序
            const timeA = new Date(a.publishTime || 0).getTime();
            const timeB = new Date(b.publishTime || 0).getTime();
            return timeB - timeA;
        });
        // 记录科技类新闻的排序情况
        const techNews = sortedNews.filter(item => item.category === '科技');
        logger.info(`科技类新闻排序情况`, {
            totalNews: sortedNews.length,
            techNewsCount: techNews.length,
            topTechNews: techNews.slice(0, 5).map((item, index) => ({
                rank: sortedNews.indexOf(item) + 1,
                title: item.title.substring(0, 50) + '...',
                score: this.calculateFinalScore(item),
                category: item.category
            }))
        });
        return sortedNews;
    }
    /**
     * 计算包含科技类权重的最终评分
     */
    calculateFinalScore(item) {
        let score = item.score || 0;
        // 科技类新闻加权
        if (item.category === '科技') {
            score += 30; // 科技类新闻额外加30分
        }
        // 科技相关关键词额外加分
        const techKeywords = ['AI', '人工智能', '科技', '技术', '互联网', '软件', '硬件', '芯片', '5G', '区块链', 'ChatGPT', 'GPT', '元宇宙', 'VR', 'AR'];
        const title = item.title.toLowerCase();
        const techKeywordCount = techKeywords.filter(keyword => title.includes(keyword.toLowerCase())).length;
        score += techKeywordCount * 5; // 每个科技关键词加5分
        return score;
    }
    /**
     * 统计新闻分类
     */
    categorizeNews(news) {
        const categories = {};
        news.forEach(item => {
            const category = item.category || '其他';
            categories[category] = (categories[category] || 0) + 1;
        });
        // 按数量排序
        const sortedEntries = Object.entries(categories)
            .sort(([, a], [, b]) => b - a);
        const result = {};
        sortedEntries.forEach(([category, count]) => {
            result[category] = count;
        });
        return result;
    }
    /**
     * 生成摘要文本（突出科技类新闻）
     */
    generateSummaryText(news, categories) {
        if (news.length === 0) {
            return '今日暂无新闻更新。';
        }
        // 科技类新闻统计
        const techNewsCount = categories['科技'] || 0;
        const techNews = news.filter(item => item.category === '科技');
        const topCategories = Object.entries(categories)
            .slice(0, 3)
            .map(([cat, count]) => `${cat}(${count}条)`);
        const hotTopics = this.extractHotTopics(news);
        let summary = `今日共收集到 ${news.length} 条新闻，主要涵盖 ${topCategories.join('、')} 等领域。`;
        // 突出科技类新闻
        if (techNewsCount > 0) {
            summary += ` 🔥 科技前沿：本日重点关注 ${techNewsCount} 条科技资讯`;
            // 提取科技新闻的热门关键词
            const techKeywords = this.extractTechKeywords(techNews);
            if (techKeywords.length > 0) {
                summary += `，聚焦 ${techKeywords.slice(0, 3).join('、')} 等热点`;
            }
            summary += '。';
        }
        if (hotTopics.length > 0) {
            summary += ` 热门话题包括：${hotTopics.slice(0, 3).join('、')}。`;
        }
        // 添加时效性描述
        const recentNews = news.filter(item => {
            if (!item.publishTime)
                return false;
            const publishTime = new Date(item.publishTime).getTime();
            const now = Date.now();
            return (now - publishTime) < 6 * 60 * 60 * 1000; // 6小时内
        });
        if (recentNews.length > 0) {
            summary += ` 其中 ${recentNews.length} 条为6小时内的最新资讯。`;
        }
        return summary;
    }
    /**
     * 提取科技新闻的关键词
     */
    extractTechKeywords(techNews) {
        const techKeywords = ['AI', '人工智能', '科技', '技术', '互联网', '软件', '硬件', '芯片', '5G', '区块链', 'ChatGPT', 'GPT', '元宇宙', 'VR', 'AR', '新能源', '电动车', '自动驾驶'];
        const keywordCount = {};
        techNews.forEach(item => {
            techKeywords.forEach(keyword => {
                if (item.title.includes(keyword)) {
                    keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
                }
            });
        });
        return Object.entries(keywordCount)
            .filter(([, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([keyword]) => keyword);
    }
    /**
     * 提取热门话题
     */
    extractHotTopics(news) {
        const topicCount = {};
        // 从标题中提取关键词
        news.forEach(item => {
            const title = item.title;
            const tags = item.tags || [];
            // 统计标签
            tags.forEach(tag => {
                topicCount[tag] = (topicCount[tag] || 0) + 1;
            });
            // 提取常见关键词
            const keywords = this.extractKeywords(title);
            keywords.forEach(keyword => {
                topicCount[keyword] = (topicCount[keyword] || 0) + 1;
            });
        });
        // 返回出现频率最高的话题
        return Object.entries(topicCount)
            .filter(([, count]) => count >= 2) // 至少出现2次
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([topic]) => topic);
    }
    /**
     * 从文本中提取关键词
     */
    extractKeywords(text) {
        const keywords = [];
        // 常见的热门关键词模式
        const patterns = [
            /AI|人工智能/g,
            /区块链|比特币|加密货币/g,
            /5G|6G/g,
            /新能源|电动车|特斯拉/g,
            /芯片|半导体/g,
            /元宇宙|VR|AR/g,
            /ChatGPT|GPT/g,
            /苹果|iPhone|iPad/g,
            /华为|小米|OPPO|vivo/g,
            /腾讯|阿里巴巴|字节跳动|百度/g
        ];
        patterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                keywords.push(...matches);
            }
        });
        return [...new Set(keywords)]; // 去重
    }
    /**
     * 使用LLM增强新闻分析
     */
    async enhanceNewsWithLLM(news) {
        try {
            // 批量处理新闻，每批最多10条
            const batchSize = 10;
            const enhancedNews = [];
            for (let i = 0; i < news.length; i += batchSize) {
                const batch = news.slice(i, i + batchSize);
                const batchPromises = batch.map(async (item) => {
                    try {
                        const llmResponse = await this.llmService.analyzeNews(item);
                        return {
                            ...item,
                            score: this.calculateEnhancedScore(item, llmResponse),
                            category: llmResponse.category || item.category,
                            tags: [...(item.tags || []), ...(llmResponse.tags || [])]
                        };
                    }
                    catch (error) {
                        logger.warn(`LLM分析新闻失败: ${item.title}`, error);
                        return item; // 返回原始新闻
                    }
                });
                const batchResults = await Promise.all(batchPromises);
                enhancedNews.push(...batchResults);
            }
            logger.info(`LLM增强分析完成，处理了 ${enhancedNews.length} 条新闻`);
            return enhancedNews;
        }
        catch (error) {
            logger.error('LLM增强分析失败，使用原始新闻', error);
            return news;
        }
    }
    /**
     * 计算包含LLM评分的增强评分
     */
    calculateEnhancedScore(item, llmResponse) {
        let score = item.score || 0;
        // LLM评分权重
        if (llmResponse?.relevanceScore) {
            score += llmResponse.relevanceScore * 0.3; // LLM评分占30%权重
        }
        // 科技类新闻加权
        if (item.category === '科技' || llmResponse?.category === '科技') {
            score += 30; // 科技类新闻额外加30分
        }
        // 科技相关关键词额外加分
        const techKeywords = ['AI', '人工智能', '科技', '技术', '互联网', '软件', '硬件', '芯片', '5G', '区块链', 'ChatGPT', 'GPT', '元宇宙', 'VR', 'AR'];
        const title = item.title.toLowerCase();
        const techKeywordCount = techKeywords.filter(keyword => title.includes(keyword.toLowerCase())).length;
        score += techKeywordCount * 5; // 每个科技关键词加5分
        // LLM标签加分
        if (llmResponse?.tags) {
            score += llmResponse.tags.length * 2; // 每个LLM标签加2分
        }
        return Math.max(0, score); // 确保评分不为负数
    }
    /**
     * 使用LLM生成增强摘要文本
     */
    async generateSummaryTextWithLLM(news, categories) {
        try {
            // 先生成基础摘要
            const baseSummary = this.generateSummaryText(news, categories);
            // 使用LLM优化摘要
            const llmResponse = await this.llmService.generateSummary({
                newsCount: news.length,
                categories,
                topNews: news.slice(0, 5),
                baseSummary
            });
            return llmResponse.summary || baseSummary;
        }
        catch (error) {
            logger.warn('LLM摘要生成失败，使用基础摘要', error);
            return this.generateSummaryText(news, categories);
        }
    }
    /**
     * 去重新闻（基于内容相似度）
     */
    deduplicateNews(news, similarityThreshold = 0.8) {
        const result = [];
        for (const item of news) {
            let isDuplicate = false;
            for (const existing of result) {
                // 检查URL是否相同
                if (item.url === existing.url) {
                    isDuplicate = true;
                    break;
                }
                // 检查标题相似度
                const similarity = this.calculateTextSimilarity(item.title, existing.title);
                if (similarity > similarityThreshold) {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate) {
                result.push(item);
            }
        }
        logger.info(`新闻去重完成，原始 ${news.length} 条，去重后 ${result.length} 条`);
        return result;
    }
    /**
     * 计算文本相似度
     */
    calculateTextSimilarity(text1, text2) {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }
    /**
     * 过滤低质量新闻
     */
    filterQualityNews(news, minScore = 30) {
        const filtered = news.filter(item => {
            // 基本质量检查
            if (!item.title || item.title.length < 5)
                return false;
            if (!item.url || !item.url.startsWith('http'))
                return false;
            // 评分检查
            const score = item.score || 0;
            if (score < minScore)
                return false;
            // 标题质量检查
            if (this.isLowQualityTitle(item.title))
                return false;
            return true;
        });
        logger.info(`新闻质量过滤完成，原始 ${news.length} 条，过滤后 ${filtered.length} 条`);
        return filtered;
    }
    /**
     * 检查是否为低质量标题
     */
    isLowQualityTitle(title) {
        const lowQualityPatterns = [
            /^\s*$/, // 空标题
            /^\d+$/, // 纯数字
            /测试|test/i, // 测试内容
            /广告|推广/i, // 广告内容
            /^.{1,3}$/, // 过短标题
        ];
        return lowQualityPatterns.some(pattern => pattern.test(title));
    }
}
//# sourceMappingURL=news-aggregator.js.map