# 快速开始指南

## 一键部署

使用自动化部署脚本快速设置新闻收集系统：

```bash
./deploy.sh
```

## 手动部署（3步完成）

### 1. 安装和编译
```bash
npm install
npm run build
```

### 2. 配置环境
```bash
cp .env.example .env
# 编辑 .env 文件，配置以下必需参数：
# LARK_APP_ID=your_app_id
# LARK_APP_SECRET=your_app_secret  
# LARK_CHAT_ID=your_chat_id
```

### 3. 设置定时任务
```bash
# 添加到 crontab（每天8点执行）
crontab -e
# 添加这行：
# 0 8 * * * cd /path/to/news-scheduler && npm start
```

## 测试运行

```bash
# 执行一次新闻收集测试
npm start -- --once

# 或使用快捷脚本
./test.sh
```

## 查看日志

```bash
# 查看实时日志
tail -f logs/scheduler.log

# 或使用快捷脚本
./logs.sh
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm start` | 执行新闻收集 |
| `npm start -- --once` | 执行一次性收集 |
| `npm run build` | 重新编译项目 |
| `./test.sh` | 测试运行 |
| `./logs.sh` | 查看日志 |
| `crontab -l` | 查看定时任务 |

## 故障排除

### 新闻收集失败
1. 检查 NewsNow API 服务是否运行在 http://localhost:5173
2. 验证 .env 文件配置是否正确
3. 查看 logs/scheduler.log 中的错误信息

### 飞书推送失败
1. 确认飞书机器人配置正确
2. 检查 LARK_APP_ID、LARK_APP_SECRET、LARK_CHAT_ID
3. 验证机器人是否已加入目标群聊

### 定时任务不执行
1. 检查 cron 服务：`sudo systemctl status cron`
2. 查看 cron 日志：`tail -f logs/cron.log`
3. 验证路径和权限设置

## 更多信息

- 详细部署文档：[DEPLOYMENT.md](./DEPLOYMENT.md)
- 飞书机器人配置：[docs/lark-bot-setup.md](./docs/lark-bot-setup.md)
- 项目说明：[README.md](./README.md)

---

🎉 **部署完成后，系统将每天上午8点自动收集新闻并推送到飞书群聊！**