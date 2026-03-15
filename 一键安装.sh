#!/bin/bash
# ==============================================================================
# 天文教学自动化系统 - 一键安装脚本 (Linux/Mac)
# ==============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_header() {
    echo ""
    echo "======================================"
    echo "  天文教学自动化系统 - 一键安装"
    echo "======================================"
    echo ""
    echo "此脚本将自动完成以下操作："
    echo "  1. 检查系统环境"
    echo "  2. 配置OpenClaw插件"
    echo "  3. 创建必要目录"
    echo "  4. 复制示例文件"
    echo "  5. 验证安装"
    echo ""
}

print_step() {
    echo -e "${BLUE}[$1/6]${NC} $2..."
}

print_ok() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

print_error() {
    echo -e "${RED}[错误]${NC} $1"
}

# 主函数
main() {
    print_header
    read -p "按Enter继续，或Ctrl+C取消..."

    # ==================================================================
    print_step "1/6" "检查OpenClaw安装"
    echo ""

    if ! command -v openclaw &> /dev/null; then
        print_error "未找到OpenClaw CLI"
        echo "请先安装OpenClaw: https://docs.openclaw.ai"
        exit 1
    fi
    print_ok "OpenClaw已安装"

    # ==================================================================
    print_step "2/6" "配置插件"
    echo ""

    # 获取脚本目录
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    WORKDIR="$HOME/.openclaw/workspace"

    # 添加插件到信任列表
    echo "添加插件到信任列表..."
    if openclaw config set plugins.allow '["astro-teach"]' &> /dev/null; then
        print_ok "已添加到信任列表"
    else
        print_warning "无法修改信任列表，可能已存在"
    fi

    # 启用插件
    echo "启用天文教学插件..."
    if openclaw config set plugins.entries.astro-teach.enabled true &> /dev/null; then
        print_ok "插件已启用"
    else
        print_warning "插件可能已启用"
    fi

    # ==================================================================
    print_step "3/6" "创建工作目录"
    echo ""

    # 创建OpenClaw工作目录中的文件夹
    mkdir -p "$WORKDIR/pipelines"
    print_ok "创建 pipelines 目录"

    mkdir -p "$WORKDIR/audio"
    print_ok "创建 audio 目录"

    mkdir -p "$WORKDIR/data"
    print_ok "创建 data 目录"

    # ==================================================================
    print_step "4/6" "复制示例文件"
    echo ""

    EXAMPLE_DIR="$SCRIPT_DIR/extensions/astro-teach/examples"

    # 复制流水线文件
    if [ -f "$EXAMPLE_DIR/pipelines/lesson-01-summer-stars.yaml" ]; then
        cp "$EXAMPLE_DIR"/pipelines/*.yaml "$WORKDIR/pipelines/" 2>/dev/null
        print_ok "流水线文件已复制"
    else
        print_warning "未找到示例流水线文件"
    fi

    # 复制数据文件
    if [ -f "$EXAMPLE_DIR/data/celestial_mapping.json" ]; then
        cp "$EXAMPLE_DIR"/data/*.json "$WORKDIR/data/" 2>/dev/null
        print_ok "数据文件已复制"
    else
        print_warning "未找到示例数据文件"
    fi

    # ==================================================================
    print_step "5/6" "复制源代码到OpenClaw扩展目录"
    echo ""

    TARGET_DIR="$HOME/.openclaw/extensions/astro-teach"

    if [ ! -d "$TARGET_DIR" ]; then
        mkdir -p "$TARGET_DIR"
        print_ok "创建插件目录"
    fi

    # 复制插件文件
    if [ -f "$SCRIPT_DIR/extensions/astro-teach/index.ts" ]; then
        cp -r "$SCRIPT_DIR/extensions/astro-teach/"* "$TARGET_DIR/"
        print_ok "插件文件已复制"
    else
        print_warning "插件源文件不在预期位置"
    fi

    # ==================================================================
    print_step "6/6" "验证安装"
    echo ""

    # 检查插件状态
    echo "正在检查插件状态..."
    if openclaw plugins list 2>/dev/null | grep -q "astro-teach"; then
        print_ok "插件已加载"
    else
        print_warning "插件可能未加载，请重启OpenClaw"
    fi

    # 检查流水线
    echo "正在检查流水线..."
    if [ -f "$WORKDIR/pipelines/lesson-01-summer-stars.yaml" ]; then
        print_ok "流水线文件已配置"
    else
        print_warning "流水线文件可能未就绪"
    fi

    # ==================================================================
    echo ""
    echo "======================================"
    echo "  安装完成！"
    echo "======================================"
    echo ""
    echo "下一步："
    echo "  1. 准备音频文件放入: $WORKDIR/audio/"
    echo "  2. 连接天文指星仪到串口"
    echo "  3. 运行测试: openclaw astro serial"
    echo "  4. 开始使用: openclaw astro start lesson-01-summer-stars"
    echo ""
    echo "完整文档："
    echo "  - 一键安装指南.md"
    echo "  - AI课程制作指南.md"
    echo "  - extensions/astro-teach/README.md"
    echo ""
}

# 运行主函数
main "$@"
