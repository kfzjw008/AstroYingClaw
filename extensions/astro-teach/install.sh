#!/bin/bash

# 天文教学自动化系统 - 安装验证脚本

echo "🔭 天文教学自动化系统 - 安装验证"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_item() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

echo "1. 检查Node.js环境..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    check_item 0 "Node.js已安装 ($NODE_VERSION)"
else
    check_item 1 "Node.js未安装"
    exit 1
fi

echo ""
echo "2. 检查npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    check_item 0 "npm已安装 ($NPM_VERSION)"
else
    check_item 1 "npm未安装"
    exit 1
fi

echo ""
echo "3. 检查TypeScript..."
if command -v tsc &> /dev/null; then
    TSC_VERSION=$(tsc -v)
    check_item 0 "TypeScript已安装 ($TSC_VERSION)"
else
    echo -e "${YELLOW}⚠${NC} TypeScript未安装（将使用npx tsc）"
fi

echo ""
echo "4. 检查插件文件..."
FILES=(
    "openclaw.plugin.json"
    "package.json"
    "index.ts"
    "config.ts"
    "types.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        check_item 0 "$file"
    else
        check_item 1 "$file"
    fi
done

echo ""
echo "5. 检查工具模块..."
TOOLS=(
    "tools/serial_control.ts"
    "tools/audio_play.ts"
    "tools/pipeline_parser.ts"
    "tools/astro_lookup.ts"
)

for tool in "${TOOLS[@]}"; do
    if [ -f "$tool" ]; then
        check_item 0 "$tool"
    else
        check_item 1 "$tool"
    fi
done

echo ""
echo "6. 检查服务模块..."
if [ -f "services/pipeline_executor.ts" ]; then
    check_item 0 "services/pipeline_executor.ts"
else
    check_item 1 "services/pipeline_executor.ts"
fi

echo ""
echo "7. 检查技能文件..."
if [ -f "skills/astro-teacher/SKILL.md" ]; then
    check_item 0 "skills/astro-teacher/SKILL.md"
else
    check_item 1 "skills/astro-teacher/SKILL.md"
fi

echo ""
echo "8. 检查示例文件..."
if [ -f "examples/pipelines/lesson-01-summer-stars.yaml" ]; then
    check_item 0 "examples/pipelines/lesson-01-summer-stars.yaml"
else
    check_item 1 "examples/pipelines/lesson-01-summer-stars.yaml"
fi

if [ -f "examples/data/celestial_mapping.json" ]; then
    check_item 0 "examples/data/celestial_mapping.json"
else
    check_item 1 "examples/data/celestial_mapping.json"
fi

echo ""
echo "9. 检查文档..."
DOCS=(
    "README.md"
    "QUICKSTART.md"
    "STRUCTURE.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        check_item 0 "$doc"
    else
        check_item 1 "$doc"
    fi
done

echo ""
echo "10. 检查依赖..."
if [ -f "package.json" ]; then
    if [ -d "node_modules" ]; then
        check_item 0 "node_modules目录存在"
    else
        echo -e "${YELLOW}⚠${NC} node_modules目录不存在（需要运行 npm install）"
    fi
fi

echo ""
echo "======================================"
echo "✅ 验证完成！"
echo ""
echo "下一步："
echo "1. 如果有错误，请先修复"
echo "2. 运行 npm install 安装依赖"
echo "3. 复制插件到OpenClaw扩展目录"
echo "4. 配置OpenClaw并重启"
echo ""
echo "详细说明请查看 README.md 和 QUICKSTART.md"
