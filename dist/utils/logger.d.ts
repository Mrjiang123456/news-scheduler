import { LogLevel } from '../types/index.js';
/**
 * 简单的日志记录器
 */
export declare class Logger {
    private logLevel;
    private logFile?;
    constructor(level?: LogLevel, logFile?: string);
    private shouldLog;
    private formatMessage;
    private writeLog;
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, data?: any): void;
}
export declare const logger: Logger;
/**
 * 更新日志配置
 */
export declare function updateLoggerConfig(level: LogLevel, logFile?: string): void;
//# sourceMappingURL=logger.d.ts.map