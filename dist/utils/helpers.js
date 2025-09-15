/**
 * 延迟执行
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * 重试执行函数
 */
export async function retry(fn, attempts = 3, delayMs = 1000) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (i < attempts - 1) {
                await delay(delayMs * (i + 1)); // 递增延迟
            }
        }
    }
    throw lastError;
}
/**
 * 生成唯一ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
/**
 * 格式化时间 - 北京时间
 */
export function formatTime(date = new Date()) {
    // 转换为北京时间 (UTC+8)
    const beijingTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    return beijingTime.toISOString().replace('T', ' ').substr(0, 19) + ' (北京时间)';
}
/**
 * 安全的JSON解析
 */
export function safeJsonParse(str, defaultValue) {
    try {
        return JSON.parse(str);
    }
    catch {
        return defaultValue;
    }
}
/**
 * 截断文本
 */
export function truncateText(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.substr(0, maxLength - 3) + '...';
}
/**
 * 验证URL格式
 */
export function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * 清理HTML标签
 */
export function stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').trim();
}
/**
 * 计算文本相似度（简单版本）
 */
export function calculateSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
}
/**
 * 批处理数组
 */
export function batchArray(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
        batches.push(array.slice(i, i + batchSize));
    }
    return batches;
}
/**
 * 去重数组
 */
export function uniqueArray(array, keyFn) {
    if (!keyFn) {
        return [...new Set(array)];
    }
    const seen = new Set();
    return array.filter(item => {
        const key = keyFn(item);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}
//# sourceMappingURL=helpers.js.map