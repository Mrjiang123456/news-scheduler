#!/bin/bash

# Docker 容器化部署脚本
# 使用方法: ./docker-deploy.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🐳 新闻收集系统 Docker 部署脚本${NC}"
echo "================================"

# 检查 Docker 和 Docker Compose
check_docker() {
    echo "📋 检查 Docker 环境..."
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose 未安装，请先安装 Docker Compose${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker 环境检查通过${NC}"
    docker --version
    docker-compose --version 2>/dev/null || docker compose version
}

# 检查环境配置
check_env() {
    echo "⚙️  检查环境配置..."
    
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  .env 文件不存在，正在创建...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}请编辑 .env 文件配置以下参数:${NC}"
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

# 构建镜像
build_images() {
    echo "🔨 构建 Docker 镜像..."
    
    # 构建 NewsNow API 镜像
    echo "构建 NewsNow API 镜像..."
    if [ -d "../newsnow" ]; then
        docker build -t newsnow-api ../newsnow
    else
        echo -e "${YELLOW}⚠️  NewsNow 目录不存在，跳过 API 服务构建${NC}"
    fi
    
    # 构建新闻调度器镜像
    echo "构建新闻调度器镜像..."
    docker build -t news-scheduler .
    
    echo -e "${GREEN}✅ 镜像构建完成${NC}"
}

# 启动服务
start_services() {
    echo "🚀 启动服务..."
    
    # 创建网络
    docker network create news-network 2>/dev/null || true
    
    # 启动服务
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d
    else
        docker compose up -d
    fi
    
    echo -e "${GREEN}✅ 服务启动完成${NC}"
}

# 设置定时任务
setup_cron() {
    echo "⏰ 设置定时任务..."
    
    # 启动 cron 服务
    if command -v docker-compose &> /dev/null; then
        docker-compose --profile cron up -d
    else
        docker compose --profile cron up -d
    fi
    
    echo -e "${GREEN}✅ 定时任务设置完成${NC}"
}

# 显示服务状态
show_status() {
    echo ""
    echo -e "${GREEN}🎉 Docker 部署完成！${NC}"
    echo ""
    echo "📋 服务状态:"
    if command -v docker-compose &> /dev/null; then
        docker-compose ps
    else
        docker compose ps
    fi
    
    echo ""
    echo "🔧 管理命令:"
    echo "   - docker-compose logs -f news-scheduler  # 查看调度器日志"
    echo "   - docker-compose logs -f newsnow-api     # 查看 API 日志"
    echo "   - docker-compose restart news-scheduler  # 重启调度器"
    echo "   - docker-compose down                    # 停止所有服务"
    echo "   - docker-compose up -d                   # 启动所有服务"
    echo ""
    echo "🧪 测试命令:"
    echo "   - docker exec -it news-scheduler npm start -- --once  # 手动执行一次"
    echo "   - curl http://localhost:5173/api/health              # 检查 API 健康状态"
}

# 测试部署
test_deployment() {
    echo "🧪 测试部署..."
    
    # 等待服务启动
    echo "等待服务启动..."
    sleep 10
    
    # 检查 API 服务
    if curl -f http://localhost:5173/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ NewsNow API 服务正常${NC}"
    else
        echo -e "${YELLOW}⚠️  NewsNow API 服务可能未就绪${NC}"
    fi
    
    # 测试新闻收集
    read -p "是否现在测试新闻收集？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "执行测试收集..."
        docker exec news-scheduler npm start -- --once
    fi
}

# 清理函数
cleanup() {
    echo "🧹 清理旧容器和镜像..."
    
    # 停止并删除旧容器
    if command -v docker-compose &> /dev/null; then
        docker-compose down 2>/dev/null || true
    else
        docker compose down 2>/dev/null || true
    fi
    
    # 删除悬空镜像
    docker image prune -f
    
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 显示帮助信息
show_help() {
    echo "使用方法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --clean    清理旧容器和镜像后重新部署"
    echo "  --no-test  跳过部署测试"
    echo "  --help     显示此帮助信息"
    echo ""
}

# 主函数
main() {
    local clean_first=false
    local run_test=true
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean)
                clean_first=true
                shift
                ;;
            --no-test)
                run_test=false
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                echo -e "${RED}未知选项: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 执行部署流程
    if [ "$clean_first" = true ]; then
        cleanup
    fi
    
    check_docker
    check_env
    build_images
    start_services
    setup_cron
    show_status
    
    if [ "$run_test" = true ]; then
        test_deployment
    fi
}

# 执行主函数
main "$@"