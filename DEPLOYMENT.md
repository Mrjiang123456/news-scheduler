# 新闻收集系统部署指南

本文档详细说明如何将新闻收集系统部署到服务器上，并配置每天8点自动推送新闻。

## 系统要求

- Node.js 18+ 
- npm 或 yarn
- Linux/macOS 服务器
- 稳定的网络连接

## 部署方式

本系统支持多种部署方式，请根据您的需求选择：

- **🚀 [一键部署](#一键部署)** - 使用自动化脚本快速部署
- **🐳 [Docker 部署](#docker-部署)** - 容器化部署（推荐生产环境）
- **⚙️ [systemd 部署](#systemd-部署)** - 系统服务部署
- **📋 [手动部署](#手动部署)** - 传统手动部署方式

---

## 一键部署

使用自动化部署脚本，适合快速测试和开发环境：

```bash
./deploy.sh
```

---

## Docker 部署

### 快速启动

```bash
# 一键 Docker 部署
./docker-deploy.sh
```

### 手动 Docker 部署

1. **构建镜像**
```bash
# 构建新闻调度器镜像
docker build -t news-scheduler .

# 构建 NewsNow API 镜像（如果需要）
cd ../newsnow
docker build -t newsnow-api .
```

2. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件配置参数
```

3. **启动服务**
```bash
# 启动所有服务
docker-compose up -d

# 启动定时任务
docker-compose --profile cron up -d
```

4. **管理命令**
```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f news-scheduler

# 手动执行一次
docker exec news-scheduler npm start -- --once

# 停止服务
docker-compose down
```

---

## systemd 部署

适合 Linux 生产环境，提供系统级服务管理：

```bash
# 安装为系统服务
sudo ./install-systemd.sh
```

安装后的管理命令：
```bash
# 查看服务状态
sudo systemctl status news-scheduler.timer

# 手动执行一次
sudo systemctl start news-scheduler.service

# 查看日志
journalctl -u news-scheduler.service -f

# 停止定时器
sudo systemctl stop news-scheduler.timer
```

---

## 手动部署

### 1. 服务器环境准备

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
# 或
sudo yum update -y  # CentOS/RHEL

# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 2. 项目部署

```bash
# 克隆项目到服务器
git clone <your-repository-url>
cd trae-notice/news-scheduler

# 安装依赖
npm install

# 编译 TypeScript
npm run build
```

### 3. 环境配置

复制并配置环境变量文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下关键参数：

```bash
# 飞书机器人配置
LARK_APP_ID=your_app_id
LARK_APP_SECRET=your_app_secret
LARK_CHAT_ID=your_chat_id

# LLM 配置（用于新闻摘要生成）
LLM_ENABLED=true
LLM_API_KEY=your_llm_api_key
LLM_BASE_URL=your_llm_base_url

# NewsNow API 配置
NEWSNOW_API_BASE=http://localhost:5173/api

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/scheduler.log
```

### 4. 飞书机器人配置

参考 `docs/lark-bot-setup.md` 文档配置飞书机器人：

1. 在飞书开放平台创建应用
2. 获取 App ID 和 App Secret
3. 配置机器人权限
4. 获取群聊 Chat ID

### 5. NewsNow 服务部署

新闻收集系统依赖 NewsNow API 服务，需要同时部署：

```bash
# 进入 newsnow 目录
cd ../newsnow

# 安装依赖
npm install

# 构建项目
npm run build

# 启动服务（生产环境）
npm run start
```

## 定时任务配置

### 方式一：使用 Cron（推荐）

1. 编辑 crontab：
```bash
crontab -e
```

2. 添加定时任务（每天8点执行）：
```bash
# 每天上午8点执行新闻收集
0 8 * * * cd /path/to/trae-notice/news-scheduler && npm start >> /var/log/news-scheduler.log 2>&1
```

3. 验证 cron 任务：
```bash
crontab -l
```

### 方式二：使用 PM2（进程管理）

1. 安装 PM2：
```bash
npm install -g pm2
```

2. 创建 PM2 配置文件 `ecosystem.config.js`：
```javascript
module.exports = {
  apps: [{
    name: 'news-scheduler',
    script: 'dist/index.js',
    cwd: '/path/to/trae-notice/news-scheduler',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    cron_restart: '0 8 * * *', // 每天8点重启执行
    exec_mode: 'fork'
  }]
};
```

3. 启动 PM2 服务：
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 方式三：使用 systemd 定时器

1. 创建服务文件 `/etc/systemd/system/news-scheduler.service`：
```ini
[Unit]
Description=News Scheduler Service
After=network.target

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/trae-notice/news-scheduler
ExecStart=/usr/bin/npm start
Environment=NODE_ENV=production
```

2. 创建定时器文件 `/etc/systemd/system/news-scheduler.timer`：
```ini
[Unit]
Description=Run News Scheduler daily at 8 AM
Requires=news-scheduler.service

[Timer]
OnCalendar=*-*-* 08:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

3. 启用并启动定时器：
```bash
sudo systemctl daemon-reload
sudo systemctl enable news-scheduler.timer
sudo systemctl start news-scheduler.timer
```

## 监控和日志

### 日志查看

```bash
# 查看应用日志
tail -f logs/scheduler.log

# 查看 cron 日志
tail -f /var/log/cron

# 查看系统日志
journalctl -u news-scheduler.service -f
```

### 健康检查

创建健康检查脚本 `health-check.sh`：

```bash
#!/bin/bash

# 检查 NewsNow API 服务
if curl -f http://localhost:5173/api/health > /dev/null 2>&1; then
    echo "NewsNow API is running"
else
    echo "NewsNow API is down"
    # 重启服务
    cd /path/to/trae-notice/newsnow
    npm run start &
fi

# 检查最近的新闻收集日志
if grep -q "新闻收集任务执行完成" logs/scheduler.log; then
    echo "News collection is working"
else
    echo "News collection may have issues"
fi
```

## 故障排除

### 常见问题

1. **新闻收集失败**
   - 检查 NewsNow API 服务是否正常运行
   - 验证网络连接和防火墙设置
   - 查看日志文件中的错误信息

2. **飞书推送失败**
   - 验证飞书机器人配置
   - 检查 App ID、App Secret 和 Chat ID
   - 确认机器人权限设置正确

3. **定时任务不执行**
   - 检查 cron 服务状态：`sudo systemctl status cron`
   - 验证 crontab 语法：`crontab -l`
   - 查看 cron 日志：`grep CRON /var/log/syslog`

### 调试命令

```bash
# 手动执行一次新闻收集
npm start -- --once

# 测试飞书机器人连接
npm run test:lark

# 检查配置文件
npm run config:validate
```

## 安全建议

1. **环境变量保护**
   - 设置适当的文件权限：`chmod 600 .env`
   - 不要将敏感信息提交到版本控制

2. **网络安全**
   - 配置防火墙规则
   - 使用 HTTPS 连接
   - 定期更新系统和依赖包

3. **访问控制**
   - 使用专用用户运行服务
   - 限制文件和目录权限
   - 定期审查日志文件

## 维护和更新

### 定期维护任务

```bash
# 清理旧日志（保留最近30天）
find logs/ -name "*.log" -mtime +30 -delete

# 更新依赖包
npm update
npm audit fix

# 重新编译
npm run build
```

### 版本更新

```bash
# 备份当前版本
cp -r /path/to/trae-notice /path/to/backup/trae-notice-$(date +%Y%m%d)

# 拉取最新代码
git pull origin main

# 安装新依赖
npm install

# 重新编译
npm run build

# 重启服务
pm2 restart news-scheduler  # 如果使用 PM2
```

## 性能优化

1. **内存管理**
   - 监控内存使用情况
   - 设置合适的内存限制
   - 定期重启长时间运行的进程

2. **网络优化**
   - 配置连接池
   - 设置合适的超时时间
   - 使用缓存减少API调用

3. **存储优化**
   - 定期清理日志文件
   - 压缩历史数据
   - 监控磁盘空间使用

---

部署完成后，系统将每天上午8点自动收集新闻并推送到配置的飞书群聊中。如有问题，请查看日志文件或联系技术支持。