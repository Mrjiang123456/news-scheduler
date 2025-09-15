#!/bin/bash

# systemd 服务安装脚本
# 使用方法: sudo ./install-systemd.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 请使用 sudo 运行此脚本${NC}"
    exit 1
fi

echo "🔧 开始安装 systemd 服务..."

# 获取当前目录
CURRENT_DIR=$(pwd)
SERVICE_DIR="/opt/trae-notice/news-scheduler"

# 创建服务用户
create_user() {
    echo "👤 创建服务用户..."
    if ! id "news-scheduler" &>/dev/null; then
        useradd --system --no-create-home --shell /bin/false news-scheduler
        echo -e "${GREEN}✅ 用户 news-scheduler 创建成功${NC}"
    else
        echo -e "${YELLOW}⚠️  用户 news-scheduler 已存在${NC}"
    fi
}

# 创建服务目录
setup_directories() {
    echo "📁 设置服务目录..."
    
    # 创建服务目录
    mkdir -p "$SERVICE_DIR"
    
    # 复制项目文件
    cp -r "$CURRENT_DIR"/* "$SERVICE_DIR/"
    
    # 创建日志目录
    mkdir -p /var/log/news-scheduler
    mkdir -p "$SERVICE_DIR/logs"
    
    # 设置权限
    chown -R news-scheduler:news-scheduler "$SERVICE_DIR"
    chown -R news-scheduler:news-scheduler /var/log/news-scheduler
    
    # 设置目录权限
    chmod 755 "$SERVICE_DIR"
    chmod 755 /var/log/news-scheduler
    
    echo -e "${GREEN}✅ 目录设置完成${NC}"
}

# 安装 systemd 服务文件
install_systemd_files() {
    echo "⚙️  安装 systemd 服务文件..."
    
    # 更新服务文件中的路径
    sed "s|/opt/trae-notice/news-scheduler|$SERVICE_DIR|g" systemd/news-scheduler.service > /etc/systemd/system/news-scheduler.service
    cp systemd/news-scheduler.timer /etc/systemd/system/
    
    # 设置文件权限
    chmod 644 /etc/systemd/system/news-scheduler.service
    chmod 644 /etc/systemd/system/news-scheduler.timer
    
    echo -e "${GREEN}✅ systemd 文件安装完成${NC}"
}

# 重新加载 systemd
reload_systemd() {
    echo "🔄 重新加载 systemd..."
    systemctl daemon-reload
    echo -e "${GREEN}✅ systemd 重新加载完成${NC}"
}

# 启用并启动服务
enable_service() {
    echo "🚀 启用定时器服务..."
    
    # 启用定时器
    systemctl enable news-scheduler.timer
    systemctl start news-scheduler.timer
    
    echo -e "${GREEN}✅ 定时器服务已启用并启动${NC}"
}

# 显示服务状态
show_status() {
    echo ""
    echo -e "${GREEN}🎉 systemd 服务安装完成！${NC}"
    echo ""
    echo "📋 服务状态:"
    systemctl status news-scheduler.timer --no-pager -l
    echo ""
    echo "⏰ 下次执行时间:"
    systemctl list-timers news-scheduler.timer --no-pager
    echo ""
    echo "🔧 管理命令:"
    echo "   - systemctl status news-scheduler.timer    # 查看定时器状态"
    echo "   - systemctl start news-scheduler.service   # 手动执行一次"
    echo "   - systemctl stop news-scheduler.timer     # 停止定时器"
    echo "   - systemctl disable news-scheduler.timer  # 禁用定时器"
    echo "   - journalctl -u news-scheduler.service -f # 查看服务日志"
    echo ""
    echo "📁 重要路径:"
    echo "   - 服务目录: $SERVICE_DIR"
    echo "   - 日志目录: /var/log/news-scheduler/"
    echo "   - 配置文件: $SERVICE_DIR/.env"
}

# 测试服务
test_service() {
    echo "🧪 测试服务运行..."
    read -p "是否现在测试运行服务？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "执行测试..."
        systemctl start news-scheduler.service
        sleep 2
        echo "查看执行结果:"
        journalctl -u news-scheduler.service --no-pager -n 20
    fi
}

# 主函数
main() {
    echo "systemd 服务安装脚本 v1.0"
    echo "================================"
    
    create_user
    setup_directories
    install_systemd_files
    reload_systemd
    enable_service
    show_status
    test_service
}

# 执行主函数
main "$@"