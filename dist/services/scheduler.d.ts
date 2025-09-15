import { AppConfig, TaskResult } from '../types/index.js';
/**
 * 定时任务调度器
 */
export declare class NewsScheduler {
    private config;
    private newsCollector;
    private newsAggregator;
    private larkBot;
    private cronJob;
    private isRunning;
    private lastExecutionTime;
    private executionCount;
    constructor(config: AppConfig);
    /**
     * 启动定时任务
     */
    start(): TaskResult;
    /**
     * 停止定时任务
     */
    stop(): TaskResult;
    /**
     * 立即执行新闻收集
     */
    executeNow(): Promise<TaskResult>;
    /**
     * 执行新闻收集和推送
     */
    private executeNewsCollection;
    /**
     * 获取启用的新闻源
     */
    private getEnabledNewsSources;
    /**
     * 获取调度器状态
     */
    getStatus(): any;
    /**
     * 获取下次执行时间
     */
    private getNextExecutionTime;
    /**
     * 测试系统功能
     */
    test(): Promise<TaskResult>;
    /**
     * 更新配置
     */
    updateConfig(config: AppConfig): void;
}
//# sourceMappingURL=scheduler.d.ts.map