/**
 * 延迟执行
 */
export declare function delay(ms: number): Promise<void>;
/**
 * 重试执行函数
 */
export declare function retry<T>(fn: () => Promise<T>, attempts?: number, delayMs?: number): Promise<T>;
/**
 * 生成唯一ID
 */
export declare function generateId(): string;
/**
 * 格式化时间 - 北京时间
 */
export declare function formatTime(date?: Date): string;
/**
 * 安全的JSON解析
 */
export declare function safeJsonParse<T>(str: string, defaultValue: T): T;
/**
 * 截断文本
 */
export declare function truncateText(text: string, maxLength: number): string;
/**
 * 验证URL格式
 */
export declare function isValidUrl(url: string): boolean;
/**
 * 清理HTML标签
 */
export declare function stripHtml(html: string): string;
/**
 * 计算文本相似度（简单版本）
 */
export declare function calculateSimilarity(text1: string, text2: string): number;
/**
 * 批处理数组
 */
export declare function batchArray<T>(array: T[], batchSize: number): T[][];
/**
 * 去重数组
 */
export declare function uniqueArray<T>(array: T[], keyFn?: (item: T) => string): T[];
//# sourceMappingURL=helpers.d.ts.map