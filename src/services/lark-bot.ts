import { LarkBotConfig, NewsItem, NewsDigest, LarkMessageCard, TaskResult } from '../types/index.js';
import { retry, truncateText, formatTime } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import * as crypto from 'crypto';

/**
 * 飞书机器人服务
 * 基于飞书开放平台 Webhook 机器人 API
 */
export class LarkBotService {
  private config: LarkBotConfig;

  constructor(config: LarkBotConfig) {
    this.config = config;
  }

  /**
   * 发送新闻摘要到飞书群
   */
  async sendNewsDigest(digest: NewsDigest): Promise<TaskResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        message: '飞书机器人未启用',
        timestamp: new Date().toISOString()
      };
    }

    if (!this.config.webhookUrl) {
      return {
        success: false,
        message: '飞书机器人Webhook URL未配置',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // 优先使用卡片消息，如果失败则降级为富文本消息，最后降级为普通文本
      let result;
      try {
        const cardMessage = this.buildCardMessage(digest);
        result = await this.sendMessage(cardMessage);
      } catch (error) {
        logger.warn('卡片消息发送失败，降级为富文本消息', {
          error: (error as Error).message,
          stack: (error as Error).stack
        });
        try {
          const richTextMessage = this.buildRichTextMessage(digest);
          result = await this.sendMessage(richTextMessage);
        } catch (error2) {
          logger.warn('富文本消息发送失败，降级为文本消息', {
            error: (error2 as Error).message,
            stack: (error2 as Error).stack
          });
          const textMessage = this.buildTextMessage(digest);
          result = await this.sendMessage(textMessage);
        }
      }
      
      logger.info('新闻摘要发送成功', { totalNews: digest.totalCount });
      
      return {
        success: true,
        message: `成功发送 ${digest.totalCount} 条新闻摘要`,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('发送新闻摘要失败:', error);
      
      return {
        success: false,
        message: `发送失败: ${(error as Error).message}`,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 构建卡片消息
   */
  private buildCardMessage(digest: NewsDigest): any {
    // 构建新闻列表内容
    let newsContent = "";
    digest.topNews.slice(0, 8).forEach((news, index) => {
      newsContent += `**${index + 1}. [${truncateText(news.title, 50)}](${news.url})**\n`;
      newsContent += `📰 ${news.source} | 🏷️ ${news.category || '未分类'} | ⭐ ${news.score || 0}分\n`;
      if (news.description) {
        newsContent += `${truncateText(news.description, 80)}\n`;
      }
      if (index < digest.topNews.slice(0, 8).length - 1) {
        newsContent += "\n";
      }
    });

    // 构建统计信息
    const categoryStats = Object.entries(digest.categories)
      .map(([cat, count]) => `${cat}(${count})`)
      .join(', ');

    // 构建完整的内容
    const fullContent = `📊 **数据统计**\n📈 总计: **${digest.totalCount}** 条新闻\n📂 分类: ${categoryStats}\n\n💡 **今日摘要**\n${digest.summary}\n\n🔥 **热门新闻**\n\n${newsContent}\n\n🤖 由 NewsNow 定时推送 | ⏰ ${formatTime()}`;

    return {
      msg_type: "interactive",
      card: {
        schema: "2.0",
        config: {
          update_multi: true,
          style: {
            text_size: {
              normal_v2: {
                default: "normal",
                pc: "normal",
                mobile: "heading"
              }
            }
          }
        },
        body: {
          direction: "vertical",
          padding: "12px 12px 12px 12px",
          elements: [
            {
              tag: "markdown",
              content: fullContent,
              text_align: "left",
              text_size: "normal_v2",
              margin: "0px 0px 0px 0px"
            },
            {
              tag: "button",
              text: {
                tag: "plain_text",
                content: "🌐 查看更多新闻"
              },
              type: "default",
              width: "default",
              size: "medium",
              behaviors: [
                {
                   type: "open_url",
                   default_url: "https://你的新闻网站地址.com/",
                   pc_url: "",
                   ios_url: "",
                   android_url: ""
                 }
              ],
              margin: "0px 0px 0px 0px"
            }
          ]
        },
        header: {
          title: {
            tag: "plain_text",
            content: "📰 今日新闻速递"
          },
          subtitle: {
            tag: "plain_text",
            content: ""
          },
          template: "blue",
          padding: "12px 12px 12px 12px"
        }
      }
    };
  }

  /**
   * 构建富文本消息
   */
  private buildRichTextMessage(digest: NewsDigest): any {
    const content = [
      [
        {
          tag: 'text',
          text: '📰 今日新闻速递\n\n'
        }
      ],
      [
        {
          tag: 'text',
          text: `📊 新闻摘要 (${formatTime(new Date(digest.generatedAt))})\n`
        }
      ],
      [
        {
          tag: 'text',
          text: `📈 总计: ${digest.totalCount} 条新闻\n📂 分类: ${Object.entries(digest.categories).map(([cat, count]) => `${cat}(${count})`).join(', ')}\n\n`
        }
      ],
      [
        {
          tag: 'text',
          text: `💡 ${digest.summary}\n\n`
        }
      ]
    ];

    // 添加热门新闻
    if (digest.topNews.length > 0) {
      content.push([
        {
          tag: 'text',
          text: '🔥 热门新闻\n\n'
        }
      ]);

      digest.topNews.slice(0, 20).forEach((news, index) => {
        content.push([
          {
            tag: 'text',
            text: `${index + 1}. `
          },
          {
            tag: 'a',
            text: truncateText(news.title, 50),
            href: news.url
          } as any,
          {
            tag: 'text',
            text: `\n📰 ${news.source} | 🏷️ ${news.category || '未分类'} | ⭐ ${news.score || 0}分\n${truncateText(news.description || '', 80)}\n\n`
          }
        ]);
      });
    }

    // 添加底部信息
    content.push([
      {
        tag: 'text',
        text: `🤖 由 NewsNow 定时推送 | ⏰ ${formatTime()}`
      }
    ]);

    return {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: '📰 今日新闻速递',
            content: content
          }
        }
      }
    };
  }

  /**
   * 构建文本消息（降级方案）
   */
  private buildTextMessage(digest: NewsDigest): any {
    let text = `📰 今日新闻速递\n\n`;
    text += `📊 新闻摘要 (${formatTime(new Date(digest.generatedAt))})\n`;
    text += `📈 总计: ${digest.totalCount} 条新闻\n`;
    text += `📂 分类: ${Object.entries(digest.categories).map(([cat, count]) => `${cat}(${count})`).join(', ')}\n\n`;
    text += `💡 ${digest.summary}\n\n`;

    if (digest.topNews.length > 0) {
      text += `🔥 热门新闻:\n\n`;
      digest.topNews.slice(0, 20).forEach((news, index) => {
        text += `${index + 1}. ${truncateText(news.title, 50)}\n`;
        text += `📰 ${news.source} | 🏷️ ${news.category || '未分类'} | ⭐ ${news.score || 0}分\n`;
        text += `🔗 ${news.url}\n`;
        if (news.description) {
          text += `${truncateText(news.description, 80)}\n`;
        }
        text += `\n`;
      });
    }

    text += `🤖 由 NewsNow 定时推送 | ⏰ ${formatTime()}`;

    return {
      msg_type: 'text',
      content: {
        text: text
      }
    };
  }

  /**
   * 发送消息到飞书
   */
  private async sendMessage(message: any): Promise<any> {
    const payload: any = { ...message };

    // 添加签名（如果配置了密钥）
    if (this.config.secret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = this.generateSignature(timestamp, this.config.secret);
      payload.timestamp = timestamp;
      payload.sign = signature;
    }

    return await retry(async () => {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // 飞书 webhook 成功响应格式: {"StatusCode":0,"StatusMessage":"success"}
      if (result.StatusCode !== 0 && result.code !== 0) {
        throw new Error(`飞书API错误: ${result.StatusMessage || result.msg || '未知错误'}`);
      }

      return result;
    }, 3, 2000);
  }

  /**
   * 生成飞书签名
   */
  private generateSignature(timestamp: string, secret: string): string {
    const stringToSign = timestamp + '\n' + secret;
    return crypto.createHmac('sha256', stringToSign).digest('base64');
  }

  /**
   * 发送简单文本消息
   */
  async sendTextMessage(text: string): Promise<TaskResult> {
    if (!this.config.enabled || !this.config.webhookUrl) {
      return {
        success: false,
        message: '飞书机器人未正确配置',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const message = {
        msg_type: 'text',
        content: {
          text: text
        }
      };

      const result = await this.sendMessage(message);
      
      return {
        success: true,
        message: '文本消息发送成功',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: `发送失败: ${(error as Error).message}`,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 测试飞书机器人连接
   */
  async testConnection(): Promise<TaskResult> {
    const testMessage = `🤖 NewsNow 定时推送服务测试\n⏰ 测试时间: ${formatTime()}\n✅ 飞书机器人连接正常！`;
    
    logger.info('测试飞书机器人连接');
    return await this.sendTextMessage(testMessage);
  }

  /**
   * 更新配置
   */
  updateConfig(config: LarkBotConfig): void {
    this.config = config;
    logger.info('飞书机器人配置已更新');
  }
}