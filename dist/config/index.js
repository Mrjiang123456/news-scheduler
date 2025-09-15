import { config } from 'dotenv';
// 加载环境变量
config();
/**
 * 获取应用配置
 */
export function getAppConfig() {
    return {
        newsApiBaseUrl: process.env.NEWS_API_BASE_URL || 'http://localhost:3000',
        scheduler: {
            enabled: process.env.SCHEDULER_ENABLED === 'true',
            cronExpression: process.env.SCHEDULER_CRON || '0 0 8 * * *',
            newsMaxPerSource: parseInt(process.env.NEWS_MAX_PER_SOURCE || '5'),
            newsTotalLimit: parseInt(process.env.NEWS_TOTAL_LIMIT || '20'),
            retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
            retryDelay: parseInt(process.env.RETRY_DELAY || '5000')
        },
        larkBot: {
            enabled: process.env.LARK_BOT_ENABLED === 'true',
            webhookUrl: process.env.LARK_BOT_WEBHOOK_URL || '',
            secret: process.env.LARK_BOT_SECRET
        },
        llm: {
            enabled: process.env.LLM_ENABLED === 'true',
            apiKey: process.env.LLM_API_KEY || '',
            baseUrl: process.env.LLM_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
            model: process.env.LLM_MODEL || 'ep-20241220143914-xxxxx'
        },
        logLevel: process.env.LOG_LEVEL || 'info',
        logFile: process.env.LOG_FILE,
        dataDir: process.env.DATA_DIR || './data',
        cacheDuration: parseInt(process.env.CACHE_DURATION || '3600000')
    };
}
/**
 * 验证配置是否有效
 */
export function validateConfig(config) {
    const errors = [];
    // 验证新闻API基础URL
    if (!config.newsApiBaseUrl) {
        errors.push('NEWS_API_BASE_URL is required');
    }
    // 验证调度器配置
    if (config.scheduler.enabled) {
        if (!config.scheduler.cronExpression) {
            errors.push('SCHEDULER_CRON is required when scheduler is enabled');
        }
        if (config.scheduler.newsMaxPerSource <= 0) {
            errors.push('NEWS_MAX_PER_SOURCE must be greater than 0');
        }
        if (config.scheduler.newsTotalLimit <= 0) {
            errors.push('NEWS_TOTAL_LIMIT must be greater than 0');
        }
    }
    // 验证飞书机器人配置
    if (config.larkBot.enabled) {
        if (!config.larkBot.webhookUrl) {
            errors.push('LARK_BOT_WEBHOOK_URL is required when Lark bot is enabled');
        }
        if (!config.larkBot.webhookUrl.startsWith('https://open.feishu.cn/') &&
            !config.larkBot.webhookUrl.startsWith('https://open.larkoffice.com/')) {
            errors.push('LARK_BOT_WEBHOOK_URL must be a valid Feishu webhook URL');
        }
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * 获取新闻源列表
 */
export function getNewsSources() {
    return [
        { id: 'v2ex-share', name: 'V2EX-最新分享', enabled: true },
        { id: 'zhihu', name: '知乎', enabled: true },
        { id: 'weibo', name: '微博-实时热搜', enabled: false }, // 暂时禁用，API返回432错误
        { id: 'zaobao', name: '联合早报', enabled: true },
        { id: 'coolapk', name: '酷安-今日最热', enabled: true },
        { id: 'mktnews-flash', name: 'MKTNews-快讯', enabled: true },
        { id: 'wallstreetcn-quick', name: '华尔街见闻-实时快讯', enabled: true },
        { id: 'wallstreetcn-news', name: '华尔街见闻-最新资讯', enabled: true },
        { id: '36kr-quick', name: '36氪-快讯', enabled: true },
        { id: 'ithome', name: 'IT之家', enabled: true },
        { id: 'solidot', name: 'Solidot', enabled: true },
        { id: 'hackernews', name: 'Hacker News', enabled: true },
        { id: 'github-trending-today', name: 'Github-Today', enabled: true },
        { id: 'juejin', name: '稀土掘金', enabled: true }
    ];
}
//# sourceMappingURL=index.js.map