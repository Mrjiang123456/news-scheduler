import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
/**
 * 简单的日志记录器
 */
export class Logger {
    logLevel;
    logFile;
    constructor(level = 'info', logFile) {
        this.logLevel = level;
        this.logFile = logFile;
        // 确保日志目录存在
        if (logFile) {
            const dir = dirname(logFile);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
        }
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const dataStr = data ? ` ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
    }
    writeLog(level, message, data) {
        if (!this.shouldLog(level))
            return;
        const formattedMessage = this.formatMessage(level, message, data);
        // 输出到控制台
        console.log(formattedMessage);
        // 写入文件
        if (this.logFile) {
            try {
                appendFileSync(this.logFile, formattedMessage + '\n');
            }
            catch (error) {
                console.error('Failed to write to log file:', error);
            }
        }
    }
    debug(message, data) {
        this.writeLog('debug', message, data);
    }
    info(message, data) {
        this.writeLog('info', message, data);
    }
    warn(message, data) {
        this.writeLog('warn', message, data);
    }
    error(message, data) {
        this.writeLog('error', message, data);
    }
}
// 默认日志实例
export const logger = new Logger();
/**
 * 更新日志配置
 */
export function updateLoggerConfig(level, logFile) {
    logger.logLevel = level;
    logger.logFile = logFile;
}
//# sourceMappingURL=logger.js.map