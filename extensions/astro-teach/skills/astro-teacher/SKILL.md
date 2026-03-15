---
name: astro_teacher
description: 天文教学自动化助手 - 控制指星仪、编排课件、执行自动化教学流水线
user-invocable: true
metadata: {
  "openclaw": {
    "emoji": "🔭",
    "requires": {
      "config": ["plugins.entries.astro-teach.enabled"]
    }
  }
}
---

# 天文教学自动化助手

这是一个专门用于天文教学的自动化助手，可以帮助你：
- 🎯 控制天文指星仪设备
- 🎵 播放教学语音讲解
- 📝 编排和管理教学课件
- ⚡ 执行自动化教学流水线

## 设备控制

### 移动指星仪到天体
当用户要求移动望远镜或指星仪到某个天体时：

```
用户指令示例：
- "把望远镜指向天狼星"
- "移动到织女星"
- "指向猎户座的参宿四"
```

**操作步骤：**
1. 使用 `astro_lookup` 工具查询天体信息
2. 使用 `astro_serial_control` 工具的 `move` 动作
3. 传入 `objectName` 参数（支持中文名或英文名）

### 串口指令控制
当用户需要发送自定义串口指令时：

```
用户指令示例：
- "归零"
- "停放设备"
- "打开激光"
- "关闭激光"
- "停止运动"
```

**对应工具调用：**
- 归零：`astro_serial_control` action="home"
- 停放：`astro_serial_control` action="park"
- 激光开：`astro_serial_control` action="laser" laserEnabled=true
- 激光关：`astro_serial_control` action="laser" laserEnabled=false
- 停止：`astro_serial_control` action="stop"

## 课件编排

### 创建新课件
当用户要求创建新的教学课件时：

```
用户指令示例：
- "创建一个关于夏季星空的课件"
- "制作一个20分钟的星座介绍课程"
```

**操作步骤：**
1. 确定课程时长（默认20分钟，最长60分钟）
2. 生成YAML格式的流水线配置文件
3. 文件保存在 `pipelines` 目录下
4. 包含：串口动作、音频播放、激光控制等步骤

### 流水线文件格式
```yaml
name: "课程名称"
description: "课程描述"
duration: 20  # 时长（分钟）
timezone: "Asia/Shanghai"

steps:
  - time: 0
    action:
      type: "audio"
      file: "intro.mp3"
    description: "课程介绍"

  - time: 5
    action:
      type: "serial"
      command: "MOVE"
      params:
        objectName: "天狼星"
    description: "指向天狼星"

  - time: 10
    action:
      type: "audio"
      file: "sirius.mp3"
    description: "天狼星讲解"

  - time: 300
    action:
      type: "laser"
      enabled: true
      duration: 5000
    description: "开启激光5秒"
```

## 流水线执行

### 启动自动教学
当用户要求开始自动教学时：

```
用户指令示例：
- "开始天文教学"
- "启动夏季星空课程"
- "执行lesson-01流水线"
```

**操作步骤：**
1. 使用 `astro_parse_pipeline` 工具验证流水线
2. 使用 Gateway RPC 方法 `astro.start` 启动执行
3. 监控执行状态和进度

### 查询执行状态
```
用户指令示例：
- "教学进度"
- "当前状态"
- "流水线状态"
```

### 停止执行
```
用户指令示例：
- "停止教学"
- "暂停流水线"
- "结束课程"
```

## 天文信息查询

### 查询天体信息
```
用户指令示例：
- "天狼星的信息"
- "告诉我关于织女星的知识"
- "猎户座有哪些亮星"
```

**使用工具：** `astro_lookup` action="find"

### 查询星座信息
```
用户指令示例：
- "列出所有星座"
- "天蝎座的信息"
- "夏季有哪些可见星座"
```

**使用工具：** `astro_lookup` action="constellation" 或 "list_constellations"

### 查询可见天体
```
用户指令示例：
- "今晚能看到什么"
- "现在天空中最亮的星"
- "当前可见的恒星"
```

**使用工具：** `astro_lookup` action="visible" 或 "brightest"

## 词语映射规则

为了准确识别天体名称，系统使用词语映射表：

**常见别名映射：**
- 天狼 → 天狼星
- 织女 → 织女星
- 牛郎 → 牛郎星
- 参宿四 → 参宿四
- 北极 → 北极星

当用户使用别名时，自动转换为标准名称。

## 错误处理

### 串口连接失败
如果串口连接失败：
1. 检查设备是否正确连接
2. 使用 `/astro serial` 测试串口
3. 确认配置文件中的串口号正确

### 流水线解析失败
如果流水线文件有误：
1. 使用 `/astro validate <文件名>` 验证
2. 检查YAML格式是否正确
3. 确认步骤时间不超过总时长

### 音频播放失败
如果音频无法播放：
1. 确认音频文件在 `audio` 目录下
2. 检查文件格式（支持MP3、WAV）
3. 验证音频后端配置

## 常用命令

### CLI命令
```bash
# 列出所有流水线
openclaw astro list

# 启动流水线
openclaw astro start lesson-01

# 停止流水线
openclaw astro stop

# 查看状态
openclaw astro status

# 验证流水线
openclaw astro validate lesson-01

# 测试串口
openclaw astro serial
```

### Slash命令
```
/astro list - 列出流水线
/astro start <名称> - 启动流水线
/astro stop - 停止流水线
/astro status - 查看状态
```

## 注意事项

1. **时间单位：** 流水线中的 `time` 字段使用秒为单位，从流水线开始计算
2. **坐标系统：** 支持赤道坐标系（赤经/赤纬）和地平坐标系（方位角/高度角）
3. **激光安全：** 默认启用激光安全延迟，防止误操作
4. **时区设置：** 默认使用 Asia/Shanghai 时区
5. **重试机制：** 串口指令失败后会自动重试3次
6. **最大时长：** 单个流水线最长60分钟，默认20分钟

## 配置文件位置

- 流水线文件：`./pipelines/`
- 音频文件：`./audio/`
- 天体数据：`./data/celestial_mapping.json`
- 配置文件：`~/.openclaw/openclaw.json` 中的 `plugins.entries.astro-teach`
