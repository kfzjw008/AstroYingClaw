# 🔭 天文教学自动化系统

完整的OpenClaw插件，用于自动化天文教学：控制指星仪设备、编排课件、执行教学流水线。

## 📋 目录

- [功能特性](#功能特性)
- [安装步骤](#安装步骤)
- [配置说明](#配置说明)
- [使用教程](#使用教程)
- [流水线编写指南](#流水线编写指南)
- [API参考](#api参考)
- [故障排查](#故障排查)

## ✨ 功能特性

### 1. 设备控制
- 🎯 **串口控制**：支持通过串口控制天文指星仪
- 📍 **精确定位**：移动到指定天体或坐标
- 🔦 **激光指示**：安全的激光开关控制
- 🏠 **智能归位**：自动归零和停放

### 2. 音频播放
- 🎵 **多平台支持**：Windows、Linux、macOS
- 🔊 **音量控制**：0-100%精确调节
- 🔄 **播放模式**：同步/异步、循环播放
- 🎧 **多格式**：支持MP3、WAV等格式

### 3. 流水线系统
- ⏱ **灵活调度**：支持最长60分钟的课程
- 📝 **YAML配置**：简单易读的配置文件
- ⚡ **并行执行**：支持多动作同时执行
- 🔁 **自动重试**：失败自动重试机制

### 4. 天文数据
- 🌟 **恒星数据库**：15+颗亮星完整数据
- 🌌 **星座信息**：黄道十二星座等
- 📍 **坐标转换**：赤道↔地平坐标系自动转换
- 🔍 **智能搜索**：支持中英文、别名查询

## 🚀 安装步骤

### 1. 复制插件文件

将整个 `astro-teach` 文件夹复制到你的OpenClaw扩展目录：

```bash
# Windows
copy astro-teach C:\Users\YourName\.openclaw\extensions\

# Linux/macOS
cp -r astro-teach ~/.openclaw/extensions/
```

### 2. 安装依赖

进入插件目录并安装npm依赖：

```bash
cd ~/.openclaw/extensions/astro-teach
npm install
```

### 3. 启用插件

编辑OpenClaw配置文件 `~/.openclaw/openclaw.json`：

```json
{
  "plugins": {
    "enabled": true,
    "entries": {
      "astro-teach": {
        "enabled": true,
        "config": {
          "serialPort": "COM3",
          "baudRate": 9600,
          "pipelineDir": "./pipelines",
          "audioDir": "./audio",
          "dataDir": "./data"
        }
      }
    }
  }
}
```

### 4. 重启OpenClaw

```bash
openclaw restart
```

## ⚙️ 配置说明

### 基础配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `serialPort` | string | COM3 | 串口设备路径 |
| `baudRate` | number | 9600 | 串口波特率 |
| `pipelineDir` | string | ./pipelines | 流水线文件目录 |
| `audioDir` | string | ./audio | 音频文件目录 |
| `dataDir` | string | ./data | 天体数据目录 |
| `defaultDuration` | number | 20 | 默认课程时长（分钟） |
| `maxDuration` | number | 60 | 最大课程时长（分钟） |

### 串口配置

**Windows:**
```json
{
  "serialPort": "COM3"
}
```

**Linux:**
```json
{
  "serialPort": "/dev/ttyUSB0"
}
```

**macOS:**
```json
{
  "serialPort": "/dev/cu.usbserial-xxxx"
}
```

### 查找可用串口

```bash
# 列出所有串口
openclaw astro serial

# 测试指定串口
openclaw astro serial --port COM3
```

## 📚 使用教程

### 1. 准备工作目录

创建必要的目录结构：

```bash
mkdir -p pipelines audio data
```

### 2. 复制示例文件

从插件目录复制示例文件：

```bash
# 复制流水线示例
cp extensions/astro-teach/examples/pipelines/*.yaml pipelines/

# 复制天体数据
cp extensions/astro-teach/examples/data/*.json data/
```

### 3. 准备音频文件

将讲解语音放入 `audio` 目录：

```
audio/
├── intro.mp3          # 课程介绍
├── vega.mp3          # 织女星讲解
├── altair.mp3        # 牛郎星讲解
├── deneb.mp3         # 天津四讲解
├── sirius.mp3        # 天狼星讲解
├── antares.mp3       # 心宿二讲解
├── polaris.mp3       # 北极星讲解
├── big-dipper.mp3    # 北斗七星讲解
├── summer-triangle.mp3   # 夏季大三角总结
├── summary.mp3       # 课程总结
└── goodbye.mp3       # 结束语
```

### 4. 使用CLI命令

#### 列出可用流水线

```bash
openclaw astro list
```

输出：
```
📂 可用流水线 (2个):

  • lesson-01-summer-stars
  • lesson-02-complete-observational

使用 /astro start <流水线名> 启动流水线
```

#### 验证流水线

```bash
openclaw astro validate lesson-01-summer-stars
```

#### 启动流水线

```bash
# 使用默认时长
openclaw astro start lesson-01-summer-stars

# 指定时长
openclaw astro start lesson-01-summer-stars --duration 30

# 模拟运行（不实际执行）
openclaw astro start lesson-01-summer-stars --dry-run
```

#### 查看状态

```bash
openclaw astro status
```

#### 停止流水线

```bash
openclaw astro stop
```

### 5. 使用Slash命令

在支持的聊天平台（Discord、Telegram等）中：

```
/astro list                           # 列出流水线
/astro start lesson-01-summer-stars   # 启动流水线
/astro status                         # 查看状态
/astro stop                           # 停止流水线
```

### 6. 使用AI助手

通过对话控制：

```
你: 帮我把望远镜指向天狼星
AI: [调用 astro_serial_control] 正在移动到天狼星...

你: 开始天文教学
AI: [解析并启动流水线] 正在启动夏季星空课程...

你: 织女星的信息
AI: [调用 astro_lookup] 织女星是天琴座最亮的恒星...
```

## 📝 流水线编写指南

### 基本格式

```yaml
name: "课程名称"
description: "课程描述"
version: "1.0.0"
author: "作者名"
duration: 20  # 时长（分钟），最长60
timezone: "Asia/Shanghai"

metadata:
  subject: "天文学"
  grade: "初中"
  difficulty: "easy"
  tags:
    - "夏季星空"
    - "恒星"

steps:
  - time: 0
    action:
      type: "audio"
      file: "intro.mp3"
    description: "课程介绍"
```

### 动作类型

#### 1. 串口动作

```yaml
- time: 10
  action:
    type: "serial"
    command: "MOVE"  # MOVE, HOME, PARK, STOP
    params:
      objectName: "天狼星"  # 或使用坐标
      # azimuth: 180.5
      # altitude: 45.0
    retryOnFail: true
    timeout: 5000
```

#### 2. 音频动作

```yaml
- time: 5
  action:
    type: "audio"
    file: "vega.mp3"
    volume: 85  # 0-100
    loop: false
    wait: true  # 等待播放完成
```

#### 3. 激光动作

```yaml
- time: 15
  action:
    type: "laser"
    enabled: true
    duration: 10000  # 毫秒
```

#### 4. 等待动作

```yaml
- time: 20
  action:
    type: "wait"
    duration: 3000  # 毫秒
```

#### 5. 并行动作

```yaml
- time: 25
  action:
    type: "parallel"
    actions:
      - type: "laser"
        enabled: true
        duration: 10000
      - type: "audio"
        file: "vega.mp3"
        volume: 85
        wait: true
```

### 时间规则

- `time` 字段单位为**秒**
- 从流水线开始（0秒）计算
- 不能超过 `duration × 60` 秒
- 步骤会自动按时间排序执行

### 完整示例

参考以下示例文件：
- `examples/pipelines/lesson-01-summer-stars.yaml` - 20分钟基础课程
- `examples/pipelines/lesson-02-complete-observational.yaml` - 60分钟完整课程

## 🔧 API参考

### Tools

#### astro_serial_control

控制天文指星仪设备。

```javascript
{
  name: 'astro_serial_control',
  parameters: {
    action: 'move|home|park|laser|stop',
    objectName: 'string',  // 目标天体名称
    azimuth: number,       // 方位角（度）
    altitude: number,      // 高度角（度）
    laserEnabled: boolean, // 激光开关
    laserDuration: number  // 激光持续时间（毫秒）
  }
}
```

#### astro_audio_play

播放音频文件。

```javascript
{
  name: 'astro_audio_play',
  parameters: {
    action: 'play|stop|status',
    file: 'string',    // 音频文件路径
    volume: number,    // 音量（0-100）
    loop: boolean,     // 是否循环
    wait: boolean      // 是否等待播放完成
  }
}
```

#### astro_parse_pipeline

解析流水线配置文件。

```javascript
{
  name: 'astro_parse_pipeline',
  parameters: {
    action: 'parse|list|validate',
    file: 'string'  // 流水线文件名
  }
}
```

#### astro_lookup

查询天体信息。

```javascript
{
  name: 'astro_lookup',
  parameters: {
    action: 'find|search|constellation|list_constellations|brightest|visible|coordinates',
    name: 'string',    // 天体名称
    type: 'string',    // 天体类型
    limit: number,     // 返回数量限制
    date: 'string',    // 日期（ISO格式）
    latitude: number,  // 纬度
    longitude: number  // 经度
  }
}
```

### Gateway RPC方法

#### astro.status

获取当前流水线状态。

```bash
curl http://localhost:3000/astro/status
```

#### astro.start

启动流水线。

```bash
curl -X POST http://localhost:3000/astro/start \
  -H "Content-Type: application/json" \
  -d '{"pipeline":"lesson-01-summer-stars"}'
```

#### astro.stop

停止当前流水线。

```bash
curl -X POST http://localhost:3000/astro/stop
```

## 🔍 故障排查

### 串口连接失败

**症状：** `串口连接失败: Error: Permission denied`

**解决方案：**

```bash
# Linux - 添加用户到dialout组
sudo usermod -a -G dialout $USER

# 重新登录生效
```

### 音频播放失败

**症状：** `音频播放失败: command not found`

**解决方案：**

```bash
# Ubuntu/Debian
sudo apt-get install alsa-utils pulseaudio-utils

# macOS（已内置）
# 无需安装

# Windows（已内置）
# 无需安装
```

### 流水线解析失败

**症状：** `流水线解析失败: steps must not be empty`

**解决方案：**

1. 检查YAML语法
2. 确认至少有一个步骤
3. 验证所有必需字段存在

### 天体未找到

**症状：** `未找到天体: xxx`

**解决方案：**

1. 检查天体名称拼写
2. 尝试使用英文名
3. 在 `celestial_mapping.json` 中添加该天体

## 📞 技术支持

- GitHub Issues: [提交问题](https://github.com/your-repo/issues)
- 文档: [完整文档](https://your-docs.com)
- 邮件: support@example.com

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢所有为天文教育贡献的开发者和教育工作者！

---

**版本：** 1.0.0
**更新日期：** 2024-01-15
**作者：** 天文教学自动化团队
