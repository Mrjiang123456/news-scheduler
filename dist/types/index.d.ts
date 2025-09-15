export interface NewsItem {
    id: string;
    title: string;
    url: string;
    description?: string;
    publishTime?: string;
    source: string;
    category?: string;
    score?: number;
    tags?: string[];
}
export interface NewsSource {
    id: string;
    name: string;
    enabled: boolean;
    maxItems?: number;
}
export interface SchedulerConfig {
    enabled: boolean;
    cronExpression: string;
    newsMaxPerSource: number;
    newsTotalLimit: number;
    retryAttempts: number;
    retryDelay: number;
}
export interface LarkBotConfig {
    enabled: boolean;
    webhookUrl: string;
    secret?: string;
}
export interface LLMConfig {
    enabled: boolean;
    apiKey: string;
    baseUrl: string;
    model: string;
}
export interface AppConfig {
    newsApiBaseUrl: string;
    scheduler: SchedulerConfig;
    larkBot: LarkBotConfig;
    llm: LLMConfig;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logFile?: string;
    dataDir: string;
    cacheDuration: number;
}
export interface NewsDigest {
    totalCount: number;
    categories: Record<string, number>;
    topNews: NewsItem[];
    summary: string;
    generatedAt: string;
}
export interface LarkMessageCard {
    msg_type: 'interactive';
    card: {
        schema?: string;
        config?: {
            wide_screen_mode?: boolean;
            enable_forward?: boolean;
            update_multi?: boolean;
            style?: {
                text_size?: {
                    normal_v2?: {
                        default?: string;
                        pc?: string;
                        mobile?: string;
                    };
                };
            };
        };
        header?: {
            title: {
                tag: 'plain_text';
                content: string;
            };
            subtitle?: {
                tag: 'plain_text';
                content: string;
            };
            template?: string;
            padding?: string;
        };
        body?: {
            direction?: string;
            padding?: string;
            elements: Array<{
                tag: string;
                content?: string;
                text_align?: string;
                text_size?: string;
                margin?: string;
                text?: {
                    tag: string;
                    content: string;
                };
                type?: string;
                width?: string;
                size?: string;
                behaviors?: Array<{
                    type: string;
                    default_url?: string;
                    pc_url?: string;
                    ios_url?: string;
                    android_url?: string;
                }>;
                [key: string]: any;
            }>;
        };
        elements?: Array<{
            tag: string;
            [key: string]: any;
        }>;
    };
}
export interface TaskResult {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
    timestamp: string;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';
export interface NewsStats {
    totalCollected: number;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
    duplicatesRemoved: number;
    processingTime: number;
}
//# sourceMappingURL=index.d.ts.map