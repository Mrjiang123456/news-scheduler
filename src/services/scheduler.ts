import * as cron from 'node-cron';
import { AppConfig, TaskResult, NewsSource } from '../types/index.js';
import { NewsCollector } from './news-collector.js';
import { NewsAggregator } from './news-aggregator.js';
import { LarkBotService } from './lark-bot.js';
import { logger } from '../utils/logger.js';
import { delay } from '../utils/helpers.js';

/**
 * 定时任务调度器
 */
export class NewsScheduler {
  private config: AppConfig;
  private newsCollector: NewsCollector;
  private newsAggregator: NewsAggregator;
  private larkBot: LarkBotService;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private lastExecutionTime: Date | null = null;
  private executionCount: number = 0;

  constructor(config: AppConfig) {
    this.config = config;
    this.newsCollector = new NewsCollector(config);
    this.newsAggregator = new NewsAggregator(config);
    this.larkBot = new LarkBotService(config.larkBot);
  }

  /**
   * 启动定时任务
   */
  start(): TaskResult {
    if (!this.config.scheduler.enabled) {
      return {
        success: false,
        message: '定时任务未启用',
        timestamp: new Date().toISOString()
      };
    }

    if (this.cronJob) {
      return {
        success: false,
        message: '定时任务已在运行中',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // 验证cron表达式
      if (!cron.validate(this.config.scheduler.cronExpression)) {
        throw new Error(`无效的cron表达式: ${this.config.scheduler.cronExpression}`);
      }

      // 创建定时任务
      this.cronJob = cron.schedule(this.config.scheduler.cronExpression, async () => {
        await this.executeNewsCollection();
      }, {
        scheduled: false,
        timezone: 'Asia/Shanghai'
      });

      // 启动任务
      this.cronJob.start();
      
      logger.info(`定时任务已启动，cron表达式: ${this.config.scheduler.cronExpression}`);
      
      return {
        success: true,
        message: `定时任务启动成功，执行计划: ${this.config.scheduler.cronExpression}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('启动定时任务失败:', error);
      
      return {
        success: false,
        message: `启动失败: ${(error as Error).message}`,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 停止定时任务
   */
  stop(): TaskResult {
    if (!this.cronJob) {
      return {
        success: false,
        message: '定时任务未运行',
        timestamp: new Date().toISOString()
      };
    }

    try {
      this.cronJob.stop();
      this.cronJob = null;
      
      logger.info('定时任务已停止');
      
      return {
        success: true,
        message: '定时任务停止成功',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('停止定时任务失败:', error);
      
      return {
        success: false,
        message: `停止失败: ${(error as Error).message}`,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 立即执行新闻收集
   */
  async executeNow(): Promise<TaskResult> {
    if (this.isRunning) {
      return {
        success: false,
        message: '新闻收集任务正在执行中，请稍后再试',
        timestamp: new Date().toISOString()
      };
    }

    return await this.executeNewsCollection();
  }

  /**
   * 执行新闻收集和推送
   */
  private async executeNewsCollection(): Promise<TaskResult> {
    if (this.isRunning) {
      logger.warn('新闻收集任务已在运行中，跳过本次执行');
      return {
        success: false,
        message: '任务正在执行中',
        timestamp: new Date().toISOString()
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      logger.info('开始执行新闻收集任务');
      
      // 获取新闻源配置
      const sources = this.getEnabledNewsSources();
      
      if (sources.length === 0) {
        throw new Error('没有启用的新闻源');
      }
      
      // 收集新闻
      logger.info(`开始从 ${sources.length} 个新闻源收集新闻`);
      const { news, stats } = await this.newsCollector.collectAllNews(sources);
      
      if (news.length === 0) {
        logger.warn('未收集到任何新闻');
        return {
          success: false,
          message: '未收集到任何新闻',
          timestamp: new Date().toISOString()
        };
      }
      
      // 过滤和去重
      const filteredNews = this.newsAggregator.filterQualityNews(news);
      const uniqueNews = this.newsAggregator.deduplicateNews(filteredNews);
      
      // 生成摘要
      const digest = await this.newsAggregator.generateDigest(uniqueNews);
      
      // 发送到飞书
      let larkResult: TaskResult | null = null;
      if (this.config.larkBot.enabled) {
        larkResult = await this.larkBot.sendNewsDigest(digest);
        
        if (!larkResult.success) {
          logger.error('飞书推送失败:', larkResult.message);
        }
      }
      
      // 更新执行统计
      this.lastExecutionTime = new Date();
      this.executionCount++;
      
      const executionTime = Date.now() - startTime;
      
      logger.info('新闻收集任务执行完成', {
        newsCount: uniqueNews.length,
        executionTime: `${executionTime}ms`,
        larkSuccess: larkResult?.success || false
      });
      
      return {
        success: true,
        message: `成功收集 ${uniqueNews.length} 条新闻并${larkResult?.success ? '成功' : '失败'}推送到飞书`,
        data: {
          newsCount: uniqueNews.length,
          stats,
          digest,
          larkResult,
          executionTime
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('新闻收集任务执行失败:', error);
      
      return {
        success: false,
        message: `执行失败: ${(error as Error).message}`,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 获取启用的新闻源
   */
  private getEnabledNewsSources(): NewsSource[] {
    // 暂时使用硬编码的新闻源
    return [
      { id: 'v2ex-share', name: 'V2EX-最新分享', enabled: true, maxItems: 5 },
      { id: 'zhihu', name: '知乎', enabled: true, maxItems: 5 },
      { id: 'weibo', name: '微博-实时热搜', enabled: false, maxItems: 3 }, // 暂时禁用，API返回432错误
      { id: 'ithome', name: 'IT之家', enabled: true, maxItems: 5 },
      { id: 'solidot', name: 'Solidot', enabled: true, maxItems: 5 },
      { id: 'hackernews', name: 'Hacker News', enabled: true, maxItems: 5 },
      { id: 'juejin', name: '稀土掘金', enabled: true, maxItems: 5 }
    ]
  }

  /**
   * 获取调度器状态
   */
  getStatus(): any {
    return {
      enabled: this.config.scheduler.enabled,
      running: this.cronJob !== null,
      isExecuting: this.isRunning,
      cronExpression: this.config.scheduler.cronExpression,
      lastExecutionTime: this.lastExecutionTime?.toISOString() || null,
      executionCount: this.executionCount,
      nextExecutionTime: this.cronJob ? this.getNextExecutionTime() : null,
      config: {
        newsMaxPerSource: this.config.scheduler.newsMaxPerSource,
        newsTotalLimit: this.config.scheduler.newsTotalLimit,
        retryAttempts: this.config.scheduler.retryAttempts,
        retryDelay: this.config.scheduler.retryDelay
      }
    };
  }

  /**
   * 获取下次执行时间
   */
  private getNextExecutionTime(): string | null {
    if (!this.cronJob) return null;
    
    try {
      // 这里需要使用cron库来计算下次执行时间
      // 简化实现，返回当前时间加1小时
      const next = new Date();
      next.setHours(next.getHours() + 1);
      return next.toISOString();
    } catch {
      return null;
    }
  }

  /**
   * 测试系统功能
   */
  async test(): Promise<TaskResult> {
    logger.info('开始系统功能测试');
    
    const results: any = {
      config: null,
      larkBot: null,
      newsCollection: null
    };
    
    try {
      // 测试配置
      results.config = {
        valid: true,
        cronExpression: this.config.scheduler.cronExpression,
        cronValid: cron.validate(this.config.scheduler.cronExpression)
      };
      
      // 测试飞书机器人
      if (this.config.larkBot.enabled) {
        results.larkBot = await this.larkBot.testConnection();
      } else {
        results.larkBot = { success: false, message: '飞书机器人未启用' };
      }
      
      // 测试新闻收集（少量数据）
      const testSources = this.getEnabledNewsSources().slice(0, 2);
      testSources.forEach(source => source.maxItems = 2);
      
      const { news, stats } = await this.newsCollector.collectAllNews(testSources);
      results.newsCollection = {
        success: news.length > 0,
        newsCount: news.length,
        stats
      };
      
      const allSuccess = results.config.cronValid && 
                        (results.larkBot.success || !this.config.larkBot.enabled) && 
                        results.newsCollection.success;
      
      return {
        success: allSuccess,
        message: allSuccess ? '系统测试通过' : '系统测试发现问题',
        data: results,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('系统测试失败:', error);
      
      return {
        success: false,
        message: `测试失败: ${(error as Error).message}`,
        error: (error as Error).message,
        data: results,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: AppConfig): void {
    this.config = config;
    this.larkBot.updateConfig(config.larkBot);
    logger.info('调度器配置已更新');
  }
}