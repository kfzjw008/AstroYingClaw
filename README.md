# AstroYingClaw 🌟

**天文教学自动化系统** - OpenClaw 插件

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org)

## 📖 简介

AstroYingClaw 是一个功能强大的天文教学自动化插件，专为 OpenClaw 平台设计。通过控制天文指星仪、编排课件、执行自动化教学流水线，让天文教学更加生动有趣。

### ✨ 核心功能

- 🌌 **天体数据库** - 内置 42+ 颗恒星和行星的精确坐标数据
- 🎯 **指星仪控制** - 通过串口自动控制指星仪，指向指定天体
- 📺 **课件展示** - 自动展示教学内容，支持预生成文本
- 🔊 **语音朗读** - 使用 TTS 自动朗读课程内容
- 📋 **流水线编排** - 使用 YAML 配置教学流程
- 🚀 **自动化执行** - 按时间线自动执行所有教学步骤

## 🎯 主要特性

### 1. 天体查询
```bash
# 查询天体信息
openclaw astro lookup 织女星

# 查询当前位置的天体
openclaw astro lookup --at 2024-03-16T20:00:00
```

### 2. 流水线管理
```bash
# 列出所有课程
openclaw astro list

# 启动课程
openclaw astro start lesson-01-summer-stars

# 查看状态
openclaw astro status

# 停止课程
openclaw astro stop
```

### 3. 串口测试
```bash
# 测试串口连接
openclaw astro serial --port COM3
```

## 📁 项目结构

```
llmtianwen/
├── extensions/
│   └── astro-teach/          # 主插件目录
│       ├── commands/          # CLI 命令
│       ├── config.ts          # 配置管理
│       ├── index.ts           # 插件入口
│       ├── services/          # 后台服务
│       │   └── pipeline_executor.ts
│       ├── skills/            # AI 技能
│       ├── tools/             # 工具集
│       │   ├── astro_lookup.ts
│       │   ├── audio_play.ts
│       │   ├── pipeline_parser.ts
│       │   └── serial_control.ts
│       └── types.ts           # 类型定义
└── pipelines/                 # 课程流水线
    ├── beijing-geography-intro.yaml
    └── lesson-01-summer-stars.yaml
```

## 🚀 快速开始

### 安装

1. 克隆仓库到 OpenClaw 插件目录：
```bash
git clone https://github.com/kfzjw008/AstroYingClaw.git ~/.openclaw/extensions/astro-teach
```

2. 重启 OpenClaw Gateway

### 配置

编辑 `~/.openclaw/openclaw.json`：

```json
{
  "plugins": {
    "entries": {
      "astro-teach": {
        "enabled": true,
        "config": {
          "serialPort": "COM3",
          "baudRate": 9600,
          "pipelineDir": "./pipelines"
        }
      }
    }
  }
}
```

### 运行

```bash
# 列出可用课程
openclaw astro list

# 启动夏季星空课程
openclaw astro start lesson-01-summer-stars
```

## 📚 课程配置

课程使用 YAML 格式配置：

```yaml
name: "夏季星空探索"
duration: 20
description: "20分钟夏季星空入门课程"

steps:
  - time: 0
    description: "课程介绍"
    content: "欢迎来到天文课程..."
    action:
      type: serial
      command: HOME

  - time: 30
    description: "织女星讲解"
    content: "现在让我们认识织女星..."
    action:
      type: serial
      command: MOVE
      params:
        objectName: "织女星"
```

## 🔧 硬件要求

- **指星仪**：支持串口控制的天文指星仪
- **串口连接**：USB 转 RS232 或 TTL
- **推荐**：Celestron SkyQ、SynScan 等兼容设备

## 🛠️ 开发

### 技术栈

- **语言**: TypeScript
- **运行时**: Node.js 18+
- **平台**: Windows, Linux, macOS

### 本地开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 测试
npm test
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 👥 作者

AstroTeach Contributors

## 📮 联系方式

- GitHub Issues: [https://github.com/kfzjw008/AstroYingClaw/issues](https://github.com/kfzjw008/AstroYingClaw/issues)

---

**🌟 让星空成为你的课堂！**
