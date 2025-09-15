import { NewsItem, NewsDigest, AppConfig } from '../types/index.js';
/**
 * 新闻聚合服务
 */
export declare class NewsAggregator {
    private config;
    private llmService;
    constructor(config: AppConfig);
    /**
     * 生成新闻摘要（集成LLM智能分析）
     */
    generateDigest(news: NewsItem[]): Promise<NewsDigest>;
    /**
     * 按相关性排序新闻（优先展示科技类新闻）
     */
    private sortNewsByRelevance;
    /**
     * 计算包含科技类权重的最终评分
     */
    private calculateFinalScore;
    /**
     * 统计新闻分类
     */
    private categorizeNews;
    /**
     * 生成摘要文本（突出科技类新闻）
     */
    private generateSummaryText;
    /**
     * 提取科技新闻的关键词
     */
    private extractTechKeywords;
    /**
     * 提取热门话题
     */
    private extractHotTopics;
    /**
     * 从文本中提取关键词
     */
    private extractKeywords;
    /**
     * 使用LLM增强新闻分析
     */
    private enhanceNewsWithLLM;
    /**
     * 计算包含LLM评分的增强评分
     */
    private calculateEnhancedScore;
    /**
     * 使用LLM生成增强摘要文本
     */
    private generateSummaryTextWithLLM;
    /**
     * 去重新闻（基于内容相似度）
     */
    deduplicateNews(news: NewsItem[], similarityThreshold?: number): NewsItem[];
    /**
     * 计算文本相似度
     */
    private calculateTextSimilarity;
    /**
     * 过滤低质量新闻
     */
    filterQualityNews(news: NewsItem[], minScore?: number): NewsItem[];
    /**
     * 检查是否为低质量标题
     */
    private isLowQualityTitle;
}
//# sourceMappingURL=news-aggregator.d.ts.map