# 🔭 AstroGuide - OpenClaw 硬件技能

> **智慧天文指星仪控制技能 v2.1** | 课件自动生成版

---

## 📖 项目简介

`AstroGuide` 是专为 **OpenClaw（小龙虾）框架**设计的全能型硬件控制+生产力技能。当 OpenClaw Agent 在对话中识别到用户询问星空、星座、天体相关问题时，会自动调用此技能，实现**边指星边讲解**的沉浸式天文学习体验，同时自动生成本地讲稿和课件！

### ✨ v2.1 新特性

| 特性 | 描述 |
|------|------|
| **📚 课件自动生成** | 自动生成约 2000 字 Markdown 讲稿和 4-5 页 PowerPoint 课件 |
| **🎓 连续讲解** | 支持一次传入多步骤脚本，自动按顺序执行 |
| **🔄 顺序执行** | 每步：生成课件 → 发送坐标 → 播放语音 → 等待完成 → 下一步 |
| **📊 进度追踪** | 实时显示当前步骤和完成进度 |
| **⏱️ 步骤延迟** | 可配置步骤间延迟，确保硬件响应 |
| **🛡️ Mock 模式** | 无硬件时自动降级，打印高亮虚拟日志 |

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenClaw Agent                          │
│                     (小龙虾对话框架)                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ 识别到天文问题
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AstroGuide Skill v2.1                        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐    │
│  │          阶段 1: 课件自动生成（生产力模块）             │    │
│  ├───────────────────────────────────────────────────────┤    │
│  │  📝 生成 Markdown 讲稿 (~2000 字)                       │    │
│  │  📊 生成 PowerPoint 课件 (4-5 页)                       │    │
│  │  💾 保存到 output/ 目录                                │    │
│  └───────────────────────────────────────────────────────┘    │
│                          │                                     │
│                          ▼                                     │
│  ┌───────────────────────────────────────────────────────┐    │
│  │          阶段 2: 硬件控制执行                           │    │
│  ├───────────────────────────────────────────────────────┤    │
│  │  接收 lesson_script 数组                                │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 步骤 1: text + ra + dec                         │   │    │
│  │  │   ├── 发送坐标 → 串口                            │   │    │
│  │  │   └── 播放语音 → TTS (阻塞等待)                   │   │    │
│  │  ├─────────────────────────────────────────────────┤   │    │
│  │  │ 步骤 2: text + ra + dec                         │   │    │
│  │  │   ├── 发送坐标 → 串口                            │   │    │
│  │  │   └── 播放语音 → TTS (阻塞等待)                   │   │    │
│  │  ├─────────────────────────────────────────────────┤   │    │
│  │  │ ... (继续执行所有步骤)                           │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 安装部署

### 1. 系统要求

- Python 3.7+
- 已安装 OpenClaw 框架
- （可选）硬件设备：激光笔 + 陀螺仪云台 + 串口控制器

### 2. 安装依赖

```bash
pip install pyserial edge-tts pyttsx3 python-pptx
```

或使用项目提供的 requirements.txt：

```bash
pip install -r requirements.txt
```

### 3. 部署到 OpenClaw

将本文件夹复制到您的 OpenClaw 工作区：

```bash
cp -r astro_guide/ ~/openclaw/workspace/skills/
```

### 4. 配置 OpenClaw Agent

在 OpenClaw 的 Agent 配置文件中添加技能描述：

```json
{
  "name": "AstronomyGuide",
  "system_prompt": "你是一位资深的天文学专家和科普讲解员，同时也是一位优秀的教育内容创作者。当用户询问关于星空、星座、天体的问题时，必须发挥大模型的长文本创作能力，同时生成三个部分的内容：\n\n1. **lesson_script**：3-8个步骤的硬件动作剧本，每步包含口语化解说词（30-80字）和目标天体坐标（赤经ra、赤纬dec）。\n\n2. **lecture_md**：约2000字的深度科普讲稿（Markdown 格式），包含完整的知识体系、历史背景、科学原理、观测方法、延伸阅读和参考资料等章节。\n\n3. **ppt_slides**：4-5页 PPT 大纲数组，每页包含标题（title）和核心知识点列表（bullets，每页3-6个要点）。\n\n将所有内容打包后一次性传给 point_star_and_speak 技能。",
  "tools": ["point_star_and_speak"],
  "tool_definitions": {
    "point_star_and_speak": {
      "description": "全能型天文教育工具，自动生成 Markdown 讲稿和 PowerPoint 课件，并控制物理指星仪进行连续多步讲解",
      "parameters": {
        "lesson_script": "硬件动作剧本数组，每个元素包含 text（解说词）、ra（赤经0-24）、dec（赤纬-90~90）",
        "lecture_md": "深度科普讲稿（Markdown 格式），约 2000 字，包含引言、核心知识、延伸阅读、总结、参考资料",
        "ppt_slides": "PPT 页面数组，每页包含 title（标题）和 bullets（核心知识点列表）"
      }
    }
  }
}
```

---

## 🎮 使用方法

### 交互示例

```
👤 用户: 给我讲讲猎户座

🤖 OpenClaw: [自动调用 point_star_and_speak]
   参数提取:
   lesson_script = [
     {"text": "猎户座是冬季夜空最容易辨认的星座之一", "ra": 5.5, "dec": 7.0},
     {"text": "注意看猎户座腰部的三颗亮星，被称为猎户腰带", "ra": 5.6, "dec": -1.9},
     {"text": "在腰带下方，你可以看到猎户座最亮的恒星参宿七", "ra": 5.2, "dec": -8.2}
   ]
   lecture_md = "# 猎户座\\n\\n猎户座是冬季夜空最引人注目的星座之一..."（约 2000 字）
   ppt_slides = [
     {"title": "猎户座概述", "bullets": ["冬季星座", "易于辨认", "包含多颗亮星"]},
     {"title": "猎户腰带", "bullets": ["三颗亮星", "参宿一、参宿二、参宿三", "天球赤道附近"]},
     ...
   ]

⚡ 执行流程:
   ============================================================
   📚 [生产力模块] 开始生成课件
   ============================================================

   📁 输出目录已准备: /path/to/output
   📝 Markdown 讲稿已生成: output/天文讲稿_20250315_123000.md
      字数: 2156 字
   📊 PowerPoint 课件已生成: output/天文课件_20250315_123000.pptx
      页数: 5 页

   ============================================================
   ✅ [生产力模块] 课件生成成功！
   ============================================================
   📝 Markdown 讲稿: output/天文讲稿_20250315_123000.md
   📊 PowerPoint 课件: output/天文课件_20250315_123000.pptx
   ============================================================

   [随后开始硬件控制...]

   ============================================================
   🎓 开始硬件讲解：共 3 个步骤
   ...（后续硬件控制流程）
```

### 命令行测试

```bash
# 完整测试（包含课件生成）
python run_hardware.py \
  '[{"text":"猎户座是冬季夜空最容易辨认的星座","ra":5.5,"dec":7.0}]' \
  '# 猎户座\n\n猎户座是冬季夜空最引人注目的星座之一...' \
  '[{"title":"猎户座概述","bullets":["冬季星座","易于辨认"]}]'

# Mock 模式测试
ASTRO_GUIDE_FORCE_MOCK=true python run_hardware.py \
  '[{"text":"测试解说","ra":12.0,"dec":45.0}]' \
  '# 测试讲稿\n\n这是测试内容...' \
  '[{"title":"测试","bullets":["要点1","要点2"]}]'
```

---

## ⚙️ 配置选项

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `ASTRO_GUIDE_SERIAL_PORT` | 串口设备名称 | 自动检测 |
| `ASTRO_GUIDE_TTS_ENGINE` | TTS 引擎 | `edge` |
| `ASTRO_GUIDE_STEP_DELAY` | 步骤间延迟（秒） | `0.5` |
| `ASTRO_GUIDE_OUTPUT_DIR` | 输出目录 | `output` |
| `ASTRO_GUIDE_FORCE_MOCK` | 强制 Mock 模式 | `false` |

### 串口配置示例

```bash
# Windows
export ASTRO_GUIDE_SERIAL_PORT=COM3

# Linux
export ASTRO_GUIDE_SERIAL_PORT=/dev/ttyUSB0

# macOS
export ASTRO_GUIDE_SERIAL_PORT=/dev/cu.usbserial-*
```

---

## 🔌 硬件接口规范

### 串口通信协议

**发送格式**：JSON 字符串 + 换行符

```json
{
  "cmd": "point_to",
  "ra": 5.5,
  "dec": 7.0,
  "timestamp": "2025-03-15T12:00:00"
}
```

---

## 🛠️ 开发相关

### 项目结构

```
astro_guide/
├── skill.json          # OpenClaw 技能定义文件（核心）
├── run_hardware.py     # 技能执行脚本（核心）
├── requirements.txt    # Python 依赖
├── .env.example       # 配置模板
├── .gitignore         # Git 忽略规则
└── README.md          # 本文档
```

### skill.json 说明

```json
{
  "name": "point_star_and_speak",
  "version": "2.1.0",
  "entrypoint": "python run_hardware.py '{lesson_script}' '{lecture_md}' '{ppt_slides}'",
  "parameters": {
    "lesson_script": "硬件动作剧本数组",
    "lecture_md": "深度科普讲稿（Markdown，约2000字）",
    "ppt_slides": "PPT 页面数组（4-5页）"
  }
}
```

### 返回值格式

```json
{
  "status": "success",
  "msg": "✅ 任务完成！成功生成课件并执行 3/3 个硬件步骤",
  "files_generated": {
    "markdown_file": "output/天文讲稿_20250315_123000.md",
    "pptx_file": "output/天文课件_20250315_123000.pptx"
  },
  "total_steps": 3,
  "completed_steps": 3
}
```

---

## 🚀 版本更新

### v2.1.0 (2025-03-15)

- ✨ 新增课件自动生成功能
- ✨ 支持 Markdown 讲稿生成（约 2000 字）
- ✨ 支持 PowerPoint 课件生成（4-5 页）
- ✨ 新增 `CoursewareGenerator` 类
- 📝 更新文档和示例

### v2.0.0 (2025-03-15)

- ✨ 新增连续多步讲解功能
- ✨ 支持 lesson_script 数组参数
- ✨ 新增步骤进度显示
- ✨ 新增步骤间延迟配置

### v1.0.0 (2025-03-10)

- 🎉 初始版本发布

---

## 📝 故障排查

### 问题：无法生成 PPT

**解决方案**：
```bash
# 安装 python-pptx
pip install python-pptx
```

### 问题：输出目录不存在

**解决方案**：
```bash
# 脚本会自动创建 output 目录，无需手动操作
# 如需自定义目录：
export ASTRO_GUIDE_OUTPUT_DIR=/custom/path
```

### 问题：串口连接失败

**解决方案**：
```bash
# 使用 Mock 模式测试
export ASTRO_GUIDE_FORCE_MOCK=true
```

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [OpenClaw（小龙虾）](https://github.com/openclaw) - 强大的 Agent 框架
- python-pptx - PowerPoint 文件生成库
- 所有"养虾人"社区成员

---

**🦐 Made with love for OpenClaw Ecosystem**
