# 📦 完整安装部署文档

## 系统要求

### 软件要求
- **Node.js**: 18.0.0 或更高版本
- **npm**: 9.0.0 或更高版本
- **OpenClaw**: 最新版本
- **TypeScript**: 5.0+ (可选，用于开发)

### 硬件要求
- **串口设备**: 天文指星仪或兼容设备
- **音频系统**: 支持音频播放的操作系统
- **存储空间**: 至少100MB可用空间

## 安装步骤

### 步骤1：获取插件文件

你已经有了完整的插件文件，位于：
```
D:/NewLab/Claude/llmtianwen/extensions/astro-teach/
```

### 步骤2：验证文件完整性

#### Windows:
```cmd
cd D:\NewLab\Claude\llmtianwen\extensions\astro-teach
install.bat
```

#### Linux/macOS:
```bash
cd /path/to/extensions/astro-teach
chmod +x install.sh
./install.sh
```

### 步骤3：安装依赖

```bash
cd astro-teach
npm install
```

### 步骤4：复制到OpenClaw扩展目录

#### Windows:
```cmd
xcopy /E /I astro-teach C:\Users\YourName\.openclaw\extensions\astro-teach
```

#### Linux/macOS:
```bash
cp -r astro-teach ~/.openclaw/extensions/
```

或者使用软链接（开发时推荐）：

#### Linux/macOS:
```bash
ln -s /path/to/extensions/astro-teach ~/.openclaw/extensions/astro-teach
```

### 步骤5：配置OpenClaw

编辑 `~/.openclaw/openclaw.json`：

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
          "dataDir": "./data",
          "defaultDuration": 20,
          "maxDuration": 60,
          "timezone": "Asia/Shanghai",
          "audioBackend": "auto",
          "logLevel": "info",
          "enableLaser": true,
          "laserSafetyDelay": 300,
          "serialTimeout": 5000,
          "retryAttempts": 3
        }
      }
    }
  }
}
```

### 步骤6：创建工作目录

在你的项目目录中：

```bash
mkdir -p pipelines audio data
```

### 步骤7：复制示例文件

```bash
# 复制流水线
cp ~/.openclaw/extensions/astro-teach/examples/pipelines/*.yaml pipelines/

# 复制天体数据
cp ~/.openclaw/extensions/astro-teach/examples/data/*.json data/
```

### 步骤8：准备音频文件

将讲解语音放入 `audio/` 目录。你需要以下文件：

- intro.mp3 - 课程介绍
- vega.mp3 - 织女星讲解
- altair.mp3 - 牛郎星讲解
- deneb.mp3 - 天津四讲解
- sirius.mp3 - 天狼星讲解
- antares.mp3 - 心宿二讲解
- polaris.mp3 - 北极星讲解
- big-dipper.mp3 - 北斗七星讲解
- summer-triangle.mp3 - 夏季大三角总结
- summary.mp3 - 课程总结
- goodbye.mp3 - 结束语

### 步骤9：重启OpenClaw

```bash
openclaw restart
```

### 步骤10：验证安装

```bash
# 列出流水线
openclaw astro list

# 测试串口
openclaw astro serial

# 验证流水线
openclaw astro validate lesson-01-summer-stars
```

## 配置说明

### 串口配置

不同操作系统的串口路径：

**Windows:**
```
COM1, COM2, COM3, ...
```

**Linux:**
```
/dev/ttyUSB0, /dev/ttyUSB1, ...
/dev/ttyACM0, /dev/ttyACM1, ...
```

**macOS:**
```
/dev/cu.usbserial-xxxx
/dev/cu.usbmodem-xxxx
```

### 查找可用串口

**Windows:**
```cmd
openclaw astro serial
```

**Linux:**
```bash
ls /dev/ttyUSB*
dmesg | grep tty
```

**macOS:**
```bash
ls /dev/cu.*
```

### 音频后端

系统会自动检测，也可以手动指定：

```json
{
  "audioBackend": "auto"  // auto, windows, linux, macos
}
```

### 时区设置

使用IANA时区标识符：

```
Asia/Shanghai    # 中国标准时间
America/New_York # 美国东部时间
Europe/London    # 英国时间
```

完整列表：https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

## 故障排查

### 问题1：串口连接失败

**症状：**
```
串口连接失败: Error: Permission denied
```

**解决方案：**

**Linux:**
```bash
sudo usermod -a -G dialout $USER
# 重新登录后生效
```

**或者临时解决：**
```bash
sudo chmod 666 /dev/ttyUSB0
```

### 问题2：npm install失败

**症状：**
```
npm ERR! code EACCES
```

**解决方案：**

**方法1：使用sudo**
```bash
sudo npm install
```

**方法2：修改npm目录**
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### 问题3：插件未加载

**症状：**
```
插件未找到
```

**解决方案：**

1. 检查插件路径：
```bash
ls ~/.openclaw/extensions/astro-teach/
```

2. 检查配置：
```bash
cat ~/.openclaw/openclaw.json | grep astro-teach
```

3. 重启OpenClaw：
```bash
openclaw restart
```

### 问题4：音频无法播放

**症状：**
```
音频播放失败: command not found
```

**解决方案：**

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install alsa-utils pulseaudio-utils
```

**Fedora:**
```bash
sudo dnf install alsa-utils pulseaudio-utils
```

**macOS:**
```bash
# macOS已内置，无需安装
```

**Windows:**
```bash
# Windows已内置，无需安装
```

### 问题5：流水线解析失败

**症状：**
```
流水线解析失败: YAML parse error
```

**解决方案：**

1. 验证YAML语法：
```bash
openclaw astro validate lesson-01-summer-stars
```

2. 检查文件编码（应为UTF-8）

3. 确认缩进使用空格而非Tab

### 问题6：天体未找到

**症状：**
```
未找到天体: xxx
```

**解决方案：**

1. 使用标准天体名称
2. 检查 `celestial_mapping.json`
3. 添加自定义天体数据

## 卸载

### 完全卸载

```bash
# 1. 停用插件
# 编辑 ~/.openclaw/openclaw.json
# 设置 "astro-teach.enabled": false

# 2. 删除插件文件
rm -rf ~/.openclaw/extensions/astro-teach

# 3. 重启OpenClaw
openclaw restart
```

### 保留配置卸载

```bash
# 仅删除插件文件
rm -rf ~/.openclaw/extensions/astro-teach

# 配置保留在 openclaw.json 中
```

## 更新

### 更新插件

```bash
# 1. 备份配置
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup

# 2. 删除旧版本
rm -rf ~/.openclaw/extensions/astro-teach

# 3. 复制新版本
cp -r astro-teach ~/.openclaw/extensions/

# 4. 重新安装依赖
cd ~/.openclaw/extensions/astro-teach
npm install

# 5. 恢复配置（如果需要）
# 编辑 ~/.openclaw/openclaw.json

# 6. 重启OpenClaw
openclaw restart
```

## 开发模式

### 使用软链接

```bash
# 创建软链接
ln -s /path/to/astro-teach ~/.openclaw/extensions/astro-teach

# 修改源代码后，只需重启OpenClaw
openclaw restart
```

### 监视模式

```bash
# 在插件目录运行
cd astro-teach
npm run dev

# TypeScript会自动编译
```

## 生产部署

### 编译

```bash
cd astro-teach
npm run build
```

### 打包

```bash
npm pack
# 生成 astro-teach-1.0.0.tgz
```

### 部署

```bash
# 复制以下文件到目标机器
- dist/
- node_modules/
- openclaw.plugin.json
- package.json
```

## 性能优化

### 1. 减少日志

```json
{
  "logLevel": "warn"
}
```

### 2. 调整超时

```json
{
  "serialTimeout": 3000
}
```

### 3. 禁用激光

```json
{
  "enableLaser": false
}
```

## 安全注意事项

1. **串口权限**：限制串口访问权限
2. **激光安全**：启用激光安全延迟
3. **设备保护**：设置合理的运动范围
4. **数据备份**：定期备份流水线和数据文件

## 下一步

安装完成后：

1. 阅读 [QUICKSTART.md](QUICKSTART.md) 快速开始
2. 查看 [README.md](README.md) 了解完整功能
3. 参考 [examples/pipelines/](examples/pipelines/) 学习流水线编写
4. 创建你自己的天文课程！

## 技术支持

如有问题，请联系：

- 邮箱: support@example.com
- GitHub: https://github.com/your-repo/issues
- 文档: https://your-docs.com

---

**祝你使用愉快！** 🔭✨
