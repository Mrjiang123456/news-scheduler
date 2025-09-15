#!/bin/bash

# 新闻收集系统快速部署脚本
# 使用方法: ./deploy.sh

set -e

echo "🚀 开始部署新闻收集系统..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js 版本
check_nodejs() {
    echo "📋 检查 Node.js 环境..."
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js 18+${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}❌ Node.js 版本过低 (当前: $(node -v))，需要 18+${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js 版本检查通过: $(node -v)${NC}"
}

# 安装依赖
install_dependencies() {
    echo "📦 安装项目依赖..."
    npm install
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
}

# 编译项目
build_project() {
    echo "🔨 编译 TypeScript 项目..."
    npm run build
    echo -e "${GREEN}✅ 项目编译完成${NC}"
}

# 配置环境变量
setup_env() {
    echo "⚙️  配置环境变量..."
    if [ ! -f ".env" ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  已创建 .env 文件，请编辑配置以下参数:${NC}"
        echo "   - LARK_APP_ID: 飞书应用 ID"
        echo "   - LARK_APP_SECRET: 飞书应用密钥"
        echo "   - LARK_CHAT_ID: 飞书群聊 ID"
        echo "   - LLM_API_KEY: LLM API 密钥"
        echo "   - LLM_BASE_URL: LLM API 地址"
        echo ""
        read -p "请编辑 .env 文件后按回车继续..." -r
    else
        echo -e "${GREEN}✅ .env 文件已存在${NC}"
    fi
}

# 创建日志目录
setup_logs() {
    echo "📝 创建日志目录..."
    mkdir -p logs
    touch logs/scheduler.log
    echo -e "${GREEN}✅ 日志目录创建完成${NC}"
}

# 测试运行
test_run() {
    echo "🧪 测试运行..."
    echo "执行一次新闻收集测试..."
    if npm start -- --once; then
        echo -e "${GREEN}✅ 测试运行成功${NC}"
    else
        echo -e "${RED}❌ 测试运行失败，请检查配置${NC}"
        exit 1
    fi
}

# 设置定时任务
setup_cron() {
    echo "⏰ 设置定时任务..."
    SCRIPT_DIR=$(pwd)
    CRON_JOB="0 8 * * * cd $SCRIPT_DIR && npm start >> logs/cron.log 2>&1"
    
    # 检查是否已存在相同的 cron 任务
    if crontab -l 2>/dev/null | grep -q "$SCRIPT_DIR.*npm start"; then
        echo -e "${YELLOW}⚠️  定时任务已存在${NC}"
    else
        # 添加新的 cron 任务
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        echo -e "${GREEN}✅ 定时任务设置完成 (每天8点执行)${NC}"
    fi
    
    echo "当前 cron 任务:"
    crontab -l | grep "$SCRIPT_DIR" || echo "无相关任务"
}

# 创建管理脚本
create_management_scripts() {
    echo "📜 创建管理脚本..."
    
    # 创建启动脚本
    cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 启动新闻收集..."
npm start
EOF
    chmod +x start.sh
    
    # 创建测试脚本
    cat > test.sh << 'EOF'
#!/bin/bash
echo "🧪 执行测试收集..."
npm start -- --once
EOF
    chmod +x test.sh
    
    # 创建日志查看脚本
    cat > logs.sh << 'EOF'
#!/bin/bash
echo "📋 查看最新日志..."
tail -f logs/scheduler.log
EOF
    chmod +x logs.sh
    
    echo -e "${GREEN}✅ 管理脚本创建完成${NC}"
    echo "   - ./start.sh: 启动新闻收集"
    echo "   - ./test.sh: 测试运行"
    echo "   - ./logs.sh: 查看日志"
}

# 显示部署完成信息
show_completion_info() {
    echo ""
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo ""
    echo "📋 接下来的步骤:"
    echo "1. 确保 NewsNow API 服务正在运行 (端口 5173)"
    echo "2. 检查 .env 文件中的配置是否正确"
    echo "3. 运行 ./test.sh 测试新闻收集功能"
    echo "4. 系统将每天上午8点自动执行新闻收集"
    echo ""
    echo "📁 重要文件:"
    echo "   - .env: 环境配置文件"
    echo "   - logs/scheduler.log: 应用日志"
    echo "   - logs/cron.log: 定时任务日志"
    echo ""
    echo "🔧 管理命令:"
    echo "   - ./test.sh: 测试运行"
    echo "   - ./logs.sh: 查看日志"
    echo "   - crontab -l: 查看定时任务"
    echo ""
    echo "📖 详细文档请参考: DEPLOYMENT.md"
}

# 主函数
main() {
    echo "新闻收集系统部署脚本 v1.0"
    echo "================================"
    
    check_nodejs
    install_dependencies
    build_project
    setup_env
    setup_logs
    test_run
    setup_cron
    create_management_scripts
    show_completion_info
}

# 执行主函数
main "$@"