#!/usr/bin/env node
/**
 * 主应用类
 */
declare class NewsSchedulerApp {
    private scheduler;
    private isShuttingDown;
    /**
     * 启动应用
     */
    start(): Promise<void>;
    /**
     * 设置优雅关闭
     */
    private setupGracefulShutdown;
    /**
     * 显示状态信息
     */
    private displayStatus;
    /**
     * 保持进程运行
     */
    private keepAlive;
    /**
     * 手动执行一次新闻收集
     */
    executeOnce(): Promise<void>;
}
export { NewsSchedulerApp };
//# sourceMappingURL=index.d.ts.map