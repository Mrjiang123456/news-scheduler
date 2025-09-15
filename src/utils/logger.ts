import { LogLevel } from '../types/index.js';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * 简单的日志记录器
 */
export class Logger {
  private logLevel: LogLevel;
  private logFile?: string;

  constructor(level: LogLevel = 'info', logFile?: string) {
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

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  private writeLog(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, data);
    
    // 输出到控制台
    console.log(formattedMessage);
    
    // 写入文件
    if (this.logFile) {
      try {
        appendFileSync(this.logFile, formattedMessage + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  debug(message: string, data?: any): void {
    this.writeLog('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.writeLog('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.writeLog('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.writeLog('error', message, data);
  }
}

// 默认日志实例
export const logger = new Logger();

/**
 * 更新日志配置
 */
export function updateLoggerConfig(level: LogLevel, logFile?: string): void {
  (logger as any).logLevel = level;
  (logger as any).logFile = logFile;
}