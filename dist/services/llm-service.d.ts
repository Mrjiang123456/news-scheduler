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
export declare class LLMService {
    private apiKey;
    private baseUrl;
    private model;
    constructor(apiKey?: string, baseUrl?: string, model?: string);
    /**
     * 分析单条新闻（包含分类、评分、标签等）
     */
    analyzeNews(newsItem: any): Promise<LLMResponse>;
    /**
     * 使用LLM判断新闻是否为科技类
     */
    analyzeTechNews(title: string, description?: string): Promise<LLMResponse>;
    /**
     * 降级分析方法（关键词匹配）
     */
    private fallbackAnalysis;
    /**
     * 批量分析新闻
     */
    batchAnalyze(newsItems: Array<{
        title: string;
        description?: string;
    }>): Promise<LLMResponse[]>;
    /**
     * 计算新闻相关性评分
     */
    private calculateRelevanceScore;
    /**
     * 生成新闻摘要
     */
    generateSummary(request: SummaryRequest): Promise<SummaryResponse>;
}
//# sourceMappingURL=llm-service.d.ts.map