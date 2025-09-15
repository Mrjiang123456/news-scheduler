# NewsNow 定时推送服务

一个基于 Node.js 的新闻定时收集和飞书推送服务，可以自动从多个新闻源收集最新资讯并推送到飞书群聊。

## 功能特性

- 🕐 **定时任务调度**: 支持 Cron 表达式配置定时执行
- 📰 **多源新闻收集**: 集成多个热门新闻源（V2EX、知乎、微博等）
- 🤖 **飞书机器人推送**: 自动推送新闻摘要到飞书群聊
- 🔄 **智能去重**: 基于内容相似度的新闻去重机制
- 📊 **新闻聚合**: 自动分类和评分，生成新闻摘要
- 🛡️ **质量过滤**: 过滤低质量和重复内容
- 📝 **日志记录**: 完整的操作日志和错误追踪
- ⚡ **重试机制**: 网络请求失败自动重试
- 🎯 **灵活配置**: 支持环境变量和配置文件

## 快速开始

### 🚀 一键部署（推荐）

使用自动化部署脚本：

```bash
./deploy.sh
```

### 📖 部署文档

- **[快速开始指南](./QUICK_START.md)** - 3分钟快速部署
- **[详细部署文档](./DEPLOYMENT.md)** - 完整的生产环境部署指南
- **[飞书机器人配置](./docs/lark-bot-setup.md)** - 飞书机器人设置教程

### 手动安装

#### 1. 安装依赖

```bash
cd news-scheduler
npm install
npm run build
```

#### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的参数：

```env
# 飞书机器人配置（必需）
LARK_APP_ID=your_app_id
LARK_APP_SECRET=your_app_secret
LARK_CHAT_ID=your_chat_id

# LLM 配置（用于新闻摘要生成）
LLM_ENABLED=true
LLM_API_KEY=your_llm_api_key
LLM_BASE_URL=your_llm_base_url

# NewsNow API 配置
NEWSNOW_API_BASE=http://localhost:5173/api

# 新闻收集配置
NEWS_MAX_PER_SOURCE=5
NEWS_TOTAL_LIMIT=20
```

#### 3. 设置定时任务

```bash
# 添加到 crontab（每天8点执行）
crontab -e
# 添加这行：
# 0 8 * * * cd /path/to/news-scheduler && npm start
```

### 3. 运行服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start

# 执行一次（测试用）
npm start -- --once
```

## 🔧 配置说明

### 环境变量配置

项目根目录下的 `.env` 文件包含所有配置项：

```bash
# 新闻收集配置
NEWS_API_BASE_URL=http://localhost:3000
NEWS_MAX_PER_SOURCE=5
NEWS_TOTAL_LIMIT=20

# 定时任务配置
SCHEDULER_ENABLED=true
SCHEDULER_CRON=0 0 8 * * *  # 每天8点执行

# 飞书机器人配置
LARK_BOT_ENABLED=false  # 设置为 true 启用
LARK_BOT_WEBHOOK_URL=   # 飞书机器人 Webhook URL
LARK_BOT_SECRET=        # 签名密钥（可选）

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/scheduler.log
```

### 飞书机器人配置

#### 1. 创建飞书自定义机器人

1. 进入飞书群聊 → 设置 → 机器人 → 添加机器人 → 自定义机器人
2. 设置机器人名称和描述
3. 配置安全设置（推荐启用签名校验）
4. 复制生成的 Webhook URL

#### 2. 配置环境变量

```bash
# 启用飞书机器人
LARK_BOT_ENABLED=true
# 设置 Webhook URL
LARK_BOT_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/你的飞书机器人webhook地址
# 设置签名密钥（如果启用了签名校验）
LARK_BOT_SECRET=你的机器人密钥
```

#### 3. 详细配置指南

查看 [飞书机器人配置指南](./docs/lark-bot-setup.md) 获取详细的配置步骤和说明。

### 环境变量详细说明

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `NEWS_API_BASE_URL` | 新闻API基础URL | `http://localhost:3000` | 是 |
| `NEWS_MAX_PER_SOURCE` | 单个新闻源最大新闻数 | `5` | 否 |
| `NEWS_TOTAL_LIMIT` | 总新闻数限制 | `20` | 否 |
| `SCHEDULER_ENABLED` | 是否启用定时任务 | `true` | 否 |
| `SCHEDULER_CRON` | Cron表达式 | `0 0 8 * * *` | 否 |
| `LARK_BOT_ENABLED` | 是否启用飞书机器人 | `true` | 否 |
| `LARK_BOT_WEBHOOK_URL` | 飞书机器人Webhook URL | - | 是* |
| `LARK_BOT_SECRET` | 飞书机器人密钥 | - | 否 |
| `LOG_LEVEL` | 日志级别 | `info` | 否 |
| `LOG_FILE` | 日志文件路径 | - | 否 |
| `RETRY_ATTEMPTS` | 重试次数 | `3` | 否 |
| `RETRY_DELAY` | 重试延迟(ms) | `5000` | 否 |

*当 `LARK_BOT_ENABLED=true` 时必填

### Cron 表达式示例

```bash
# 每天8点
0 0 8 * * *

# 每天8点、12点、18点
0 0 8,12,18 * * *

# 每小时执行
0 0 * * * *

# 每30分钟执行
0 */30 * * * *

# 工作日9点
0 0 9 * * 1-5
```

## 支持的新闻源

- V2EX-最新分享
- 知乎热榜
- 微博实时热搜
- IT之家
- Solidot
- Hacker News
- 稀土掘金
- 36氪快讯
- 华尔街见闻
- 联合早报
- 酷安热门
- Github Trending

## 飞书机器人配置

### 1. 创建飞书机器人

1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 添加机器人能力
4. 获取 Webhook URL

### 2. 配置群聊机器人

1. 在飞书群聊中添加机器人
2. 获取群聊机器人的 Webhook URL
3. 配置到环境变量 `LARK_BOT_WEBHOOK_URL`

### 3. 安全配置（可选）

如果需要验证消息来源，可以配置签名密钥：

```env
LARK_BOT_SECRET=your-secret-key
```

## 命令行选项

```bash
# 启动定时服务
npm start

# 执行一次新闻收集
npm start -- --once

# 显示帮助信息
npm start -- --help
```

## 开发指南

### 项目结构

```
src/
├── config/          # 配置管理
│   └── index.ts
├── services/        # 核心服务
│   ├── news-collector.ts    # 新闻收集
│   ├── news-aggregator.ts   # 新闻聚合
│   ├── lark-bot.ts         # 飞书机器人
│   └── scheduler.ts        # 定时调度
├── types/           # 类型定义
│   └── index.ts
├── utils/           # 工具函数
│   ├── logger.ts    # 日志工具
│   └── helpers.ts   # 辅助函数
└── index.ts         # 主入口
```

### 添加新的新闻源

1. 在 `config/index.ts` 中添加新闻源配置
2. 在 `services/news-collector.ts` 中实现数据获取逻辑
3. 更新类型定义（如需要）

### 自定义消息格式

修改 `services/lark-bot.ts` 中的 `buildNewsCard` 方法来自定义飞书消息卡片格式。

## 监控和日志

### 日志级别

- `debug`: 详细调试信息
- `info`: 一般信息（默认）
- `warn`: 警告信息
- `error`: 错误信息

### 日志输出

- 控制台输出：所有级别的日志
- 文件输出：配置 `LOG_FILE` 环境变量

### 监控指标

服务运行时会输出以下监控信息：

- 新闻收集数量和耗时
- 去重和过滤统计
- 飞书推送结果
- 系统错误和重试情况

## 故障排除

### 常见问题

1. **新闻收集失败**
   - 检查网络连接
   - 验证新闻源API是否可用
   - 查看重试配置

2. **飞书推送失败**
   - 验证 Webhook URL 是否正确
   - 检查机器人是否已添加到群聊
   - 确认签名配置（如果启用）

3. **定时任务不执行**
   - 验证 Cron 表达式格式
   - 检查 `SCHEDULER_ENABLED` 配置
   - 查看系统时区设置

### 调试模式

```bash
# 启用调试日志
LOG_LEVEL=debug npm run dev

# 执行一次并查看详细输出
LOG_LEVEL=debug npm start -- --once
```

## 部署建议

### Docker 部署

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY .env ./

EXPOSE 3000
CMD ["npm", "start"]
```

### PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start dist/index.js --name "news-scheduler"

# 查看状态
pm2 status

# 查看日志
pm2 logs news-scheduler
```

### 系统服务

创建 systemd 服务文件 `/etc/systemd/system/news-scheduler.service`：

```ini
[Unit]
Description=NewsNow Scheduler Service
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/path/to/news-scheduler
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 致谢与引用

本项目的新闻数据来源基于 [NewsNow](https://github.com/ourongxing/newsnow) 项目提供的新闻聚合服务。

### 引用信息

- **项目名称**: NewsNow
- **项目地址**: https://github.com/ourongxing/newsnow
- **作者**: ourongxing
- **许可证**: 请参考原项目许可证

感谢 NewsNow 项目为开源社区提供的优秀新闻聚合服务，本项目在其基础上实现了定时推送和飞书机器人集成功能。

如有任何版权或许可证相关问题，请联系项目维护者。

## 更新日志

### v1.0.0

- 初始版本发布
- 支持多源新闻收集
- 飞书机器人推送
- 定时任务调度
- 新闻去重和聚合