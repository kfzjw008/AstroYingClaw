# 🚀 快速开始指南

5分钟内启动你的第一次天文教学课程！

## 步骤1：复制文件到OpenClaw（1分钟）

```bash
# Windows
xcopy /E /I astro-teach C:\Users\YourName\.openclaw\extensions\astro-teach

# Linux/macOS
cp -r astro-teach ~/.openclaw/extensions/
```

## 步骤2：安装依赖（1分钟）

```bash
cd ~/.openclaw/extensions/astro-teach
npm install
```

## 步骤3：创建工作目录（1分钟）

```bash
# 在你的项目目录创建结构
mkdir -p pipelines audio data

# 复制示例文件
cp ~/.openclaw/extensions/astro-teach/examples/pipelines/* pipelines/
cp ~/.openclaw/extensions/astro-teach/examples/data/* data/
```

## 步骤4：配置OpenClaw（1分钟）

编辑 `~/.openclaw/openclaw.json`：

```json
{
  "plugins": {
    "enabled": true,
    "entries": {
      "astro-teach": {
        "enabled": true
      }
    }
  }
}
```

## 步骤5：重启并测试（1分钟）

```bash
# 重启OpenClaw
openclaw restart

# 测试串口（可选）
openclaw astro serial

# 列出流水线
openclaw astro list
```

## ✅ 完成！

现在你可以：

### 通过CLI
```bash
openclaw astro start lesson-01-summer-stars
```

### 通过对话
```
你: 开始天文教学
AI: 正在启动"夏季星空入门"课程...
```

### 通过Slash命令
```
/astro start lesson-01-summer-stars
```

## 📋 准备清单

在开始之前，确保：

- [ ] 串口设备已连接（指星仪）
- [ ] 音频文件已放入 `audio/` 目录
- [ ] 流水线文件已放入 `pipelines/` 目录
- [ ] 天体数据文件已放入 `data/` 目录

## 🎵 音频文件清单

你需要准备以下音频文件（可以使用TTS工具生成）：

| 文件名 | 内容 | 时长建议 |
|--------|------|----------|
| intro.mp3 | 课程欢迎语 | 10秒 |
| vega.mp3 | 织女星讲解 | 30秒 |
| altair.mp3 | 牛郎星讲解 | 30秒 |
| deneb.mp3 | 天津四讲解 | 30秒 |
| sirius.mp3 | 天狼星讲解 | 30秒 |
| antares.mp3 | 心宿二讲解 | 40秒 |
| polaris.mp3 | 北极星讲解 | 30秒 |
| big-dipper.mp3 | 北斗七星讲解 | 40秒 |
| summer-triangle.mp3 | 夏季大三角总结 | 20秒 |
| summary.mp3 | 课程总结 | 15秒 |
| goodbye.mp3 | 结束语 | 5秒 |

## 🎙️ 使用TTS生成音频

### Windows（PowerShell）
```powershell
Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speak.SetOutputToWaveFile("intro.mp3")
$speak.Speak("欢迎来到天文教学课程，今天我们将一起探索夏季星空的奥秘")
$speak.Dispose()
```

### Linux（espeak）
```bash
espeak "欢迎来到天文教学课程" --stdout | ffmpeg -i - intro.mp3
```

### macOS（say）
```bash
say "欢迎来到天文教学课程" -o output.aiff
ffmpeg -i output.aiff intro.mp3
```

### 在线TTS服务
- [Azure TTS](https://azure.microsoft.com/services/cognitive-services/text-to-speech/)
- [Google Cloud TTS](https://cloud.google.com/text-to-speech)
- [Amazon Polly](https://aws.amazon.com/polly/)

## 🎯 第一次运行

### 模拟运行（推荐首次使用）

```bash
openclaw astro start lesson-01-summer-stars --dry-run
```

这会显示所有将要执行的步骤，但不会实际控制设备。

### 实际运行

```bash
openclaw astro start lesson-01-summer-stars
```

### 查看状态

```bash
openclaw astro status
```

输出：
```
📊 流水线状态: 运行中
📁 流水线: lesson-01-summer-stars
⏱ 进度: 25%
⏰ 已用时间: 5分0秒
⏳ 剩余时间: 15分0秒
📍 当前步骤: 指向织女星
```

### 停止运行

```bash
openclaw astro stop
```

## 🔧 常见问题

### Q: 串口连接失败？
A:
1. 检查串口号是否正确
2. 确认设备已连接
3. Linux用户需要添加到dialout组

### Q: 音频无法播放？
A:
1. 检查音频文件路径
2. 确认文件格式（推荐MP3）
3. 检查系统音量

### Q: 天体未找到？
A:
1. 使用标准天体名称
2. 参考内置天体列表
3. 在celestial_mapping.json中添加

## 📚 下一步

- 阅读 [README.md](README.md) 了解完整功能
- 查看 [examples/pipelines/](examples/pipelines/) 学习流水线编写
- 创建你自己的课程流程！

## 🎉 开始你的天文教学之旅！

准备好了吗？运行你的第一个课程：

```bash
openclaw astro start lesson-01-summer-stars
```

祝教学愉快！🔭✨
