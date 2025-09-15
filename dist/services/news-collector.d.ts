import { NewsItem, NewsSource, NewsStats, AppConfig } from '../types/index.js';
/**
 * 新闻收集服务
 */
export declare class NewsCollector {
    private config;
    private cache;
    constructor(config: AppConfig);
    /**
     * 收集所有新闻源的新闻
     */
    collectAllNews(sources: NewsSource[]): Promise<{
        news: NewsItem[];
        stats: NewsStats;
    }>;
    /**
     * 从单个新闻源收集新闻
     */
    private collectNewsFromSource;
    /**
     * 通过NewsNow API获取新闻数据
     */
    private fetchNewsFromMCP;
    /**
     * 判断错误是否应该重试
     */
    private shouldRetry;
    /**
     * 延迟函数
     */
    private delay;
    /**
     * 转换MCP响应为NewsItem格式
     */
    private transformMCPResponse;
    /**
     * 新闻去重
     */
    private deduplicateNews;
    /**
     * 检测新闻分类（优先识别科技类）
     */
    private detectCategory;
    /**
     * 计算新闻评分
     */
    private calculateNewsScore;
    /**
     * 提取标签
     */
    private extractTags;
    /**
     * 清理缓存
     */
    clearCache(): void;
}
//# sourceMappingURL=news-collector.d.ts.map