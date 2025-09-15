import { LarkBotConfig, NewsDigest, TaskResult } from '../types/index.js';
/**
 * 飞书机器人服务
 * 基于飞书开放平台 Webhook 机器人 API
 */
export declare class LarkBotService {
    private config;
    constructor(config: LarkBotConfig);
    /**
     * 发送新闻摘要到飞书群
     */
    sendNewsDigest(digest: NewsDigest): Promise<TaskResult>;
    /**
     * 构建卡片消息
     */
    private buildCardMessage;
    /**
     * 构建富文本消息
     */
    private buildRichTextMessage;
    /**
     * 构建文本消息（降级方案）
     */
    private buildTextMessage;
    /**
     * 发送消息到飞书
     */
    private sendMessage;
    /**
     * 生成飞书签名
     */
    private generateSignature;
    /**
     * 发送简单文本消息
     */
    sendTextMessage(text: string): Promise<TaskResult>;
    /**
     * 测试飞书机器人连接
     */
    testConnection(): Promise<TaskResult>;
    /**
     * 更新配置
     */
    updateConfig(config: LarkBotConfig): void;
}
//# sourceMappingURL=lark-bot.d.ts.map