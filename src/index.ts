#!/usr/bin/env node

import { getAppConfig, validateConfig, getNewsSources } from './config/index.js';
import { NewsScheduler } from './services/scheduler.js';
import { logger, updateLoggerConfig } from './utils/logger.js';
import { delay } from './utils/helpers.js';

/**
 * 主应用类
 */
class NewsSchedulerApp {
  private scheduler: NewsScheduler | null = null;
  private isShuttingDown: boolean = false;

  /**
   * 启动应用
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 NewsNow 定时推送服务启动中...');
      
      // 加载配置
      const config = getAppConfig();
      
      // 配置日志
      updateLoggerConfig(config.logLevel, config.logFile);
      
      // 验证配置
      const validation = validateConfig(config);
      if (!validation.valid) {
        logger.error('配置验证失败:', validation.errors);
        console.error('❌ 配置验证失败:');
        validation.errors.forEach(error => console.error(`   - ${error}`));
        process.exit(1);
      }
      
      logger.info('配置验证通过');
      console.log('✅ 配置验证通过');
      
      // 创建调度器
      this.scheduler = new NewsScheduler(config);
      
      // 运行系统测试
      console.log('🔧 运行系统测试...');
      const testResult = await this.scheduler.test();
      
      if (!testResult.success) {
        logger.error('系统测试失败:', testResult.message);
        console.error('❌ 系统测试失败:', testResult.message);
        
        if (testResult.data) {
          console.log('测试详情:', JSON.stringify(testResult.data, null, 2));
        }
        
        // 测试失败时仍然可以启动，但会发出警告
        console.log('⚠️  系统测试失败，但服务将继续启动');
      } else {
        console.log('✅ 系统测试通过');
      }
      
      // 启动定时任务
      if (config.scheduler.enabled) {
        const startResult = this.scheduler.start();
        
        if (startResult.success) {
          logger.info('定时任务启动成功');
          console.log('✅ 定时任务启动成功');
          console.log(`📅 执行计划: ${config.scheduler.cronExpression}`);
        } else {
          logger.error('定时任务启动失败:', startResult.message);
          console.error('❌ 定时任务启动失败:', startResult.message);
        }
      } else {
        console.log('⏸️  定时任务未启用');
      }
      
      // 设置优雅关闭
      this.setupGracefulShutdown();
      
      // 显示状态信息
      this.displayStatus();
      
      console.log('🎉 NewsNow 定时推送服务启动完成！');
      console.log('💡 使用 Ctrl+C 优雅关闭服务');
      
      // 保持进程运行
      await this.keepAlive();
      
    } catch (error) {
      logger.error('应用启动失败:', error);
      console.error('❌ 应用启动失败:', (error as Error).message);
      process.exit(1);
    }
  }

  /**
   * 设置优雅关闭
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      
      this.isShuttingDown = true;
      console.log(`\n🛑 收到 ${signal} 信号，开始优雅关闭...`);
      
      try {
        if (this.scheduler) {
          const stopResult = this.scheduler.stop();
          if (stopResult.success) {
            console.log('✅ 定时任务已停止');
          } else {
            console.log('⚠️  停止定时任务时出现问题:', stopResult.message);
          }
        }
        
        console.log('👋 NewsNow 定时推送服务已关闭');
        process.exit(0);
        
      } catch (error) {
        console.error('❌ 关闭过程中出现错误:', (error as Error).message);
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  /**
   * 显示状态信息
   */
  private displayStatus(): void {
    if (!this.scheduler) return;
    
    const status = this.scheduler.getStatus();
    
    console.log('\n📊 服务状态:');
    console.log(`   启用状态: ${status.enabled ? '✅ 已启用' : '❌ 未启用'}`);
    console.log(`   运行状态: ${status.running ? '🟢 运行中' : '🔴 已停止'}`);
    console.log(`   执行状态: ${status.isExecuting ? '⚡ 执行中' : '💤 空闲'}`);
    console.log(`   Cron表达式: ${status.cronExpression}`);
    console.log(`   执行次数: ${status.executionCount}`);
    
    if (status.lastExecutionTime) {
      console.log(`   上次执行: ${new Date(status.lastExecutionTime).toLocaleString('zh-CN')}`);
    }
    
    if (status.nextExecutionTime) {
      console.log(`   下次执行: ${new Date(status.nextExecutionTime).toLocaleString('zh-CN')}`);
    }
    
    console.log('\n⚙️  配置信息:');
    console.log(`   单源新闻数: ${status.config.newsMaxPerSource}`);
    console.log(`   总新闻限制: ${status.config.newsTotalLimit}`);
    console.log(`   重试次数: ${status.config.retryAttempts}`);
    console.log(`   重试延迟: ${status.config.retryDelay}ms`);
  }

  /**
   * 保持进程运行
   */
  private async keepAlive(): Promise<void> {
    while (!this.isShuttingDown) {
      await delay(5000); // 每5秒检查一次
      
      // 可以在这里添加健康检查逻辑
      if (this.scheduler) {
        const status = this.scheduler.getStatus();
        
        // 每小时显示一次状态（可选）
        const now = new Date();
        if (now.getMinutes() === 0 && now.getSeconds() < 5) {
          logger.info('服务运行正常', {
            running: status.running,
            executionCount: status.executionCount
          });
        }
      }
    }
  }

  /**
   * 手动执行一次新闻收集
   */
  async executeOnce(): Promise<void> {
    try {
      const config = getAppConfig();
      const validation = validateConfig(config);
      
      if (!validation.valid) {
        console.error('❌ 配置验证失败:', validation.errors.join(', '));
        return;
      }
      
      updateLoggerConfig(config.logLevel, config.logFile);
      
      const scheduler = new NewsScheduler(config);
      
      console.log('🚀 开始执行新闻收集...');
      const result = await scheduler.executeNow();
      
      if (result.success) {
        console.log('✅ 新闻收集执行成功:', result.message);
        if (result.data) {
          console.log(`📰 收集新闻: ${result.data.newsCount} 条`);
          console.log(`⏱️  执行时间: ${result.data.executionTime}ms`);
        }
      } else {
        console.error('❌ 新闻收集执行失败:', result.message);
      }
      
    } catch (error) {
      console.error('❌ 执行过程中出现错误:', (error as Error).message);
    }
  }
}

// 主函数
async function main() {
  const app = new NewsSchedulerApp();
  
  // 检查命令行参数
  const args = process.argv.slice(2);
  
  if (args.includes('--once') || args.includes('-o')) {
    // 执行一次后退出
    await app.executeOnce();
  } else if (args.includes('--help') || args.includes('-h')) {
    // 显示帮助信息
    console.log('NewsNow 定时推送服务');
    console.log('');
    console.log('用法:');
    console.log('  npm start           启动定时服务');
    console.log('  npm start -- --once 执行一次新闻收集');
    console.log('  npm start -- --help 显示帮助信息');
    console.log('');
    console.log('环境变量配置请参考 .env.example 文件');
  } else {
    // 启动定时服务
    await app.start();
  }
}

// 启动应用
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ 应用启动失败:', error);
    process.exit(1);
  });
}

export { NewsSchedulerApp };