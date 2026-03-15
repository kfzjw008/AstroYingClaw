/**
 * 音频播放工具
 * 支持Windows、Linux、macOS平台
 */

import { spawn, exec, execSync } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import type { Logger } from 'openclaw/plugin-sdk/core';
import type { AstroConfig } from '../config';
import { resolvePath } from '../config';

interface PlayingAudio {
  process: any;
  file: string;
  startTime: number;
}

export class AudioPlayTool {
  private logger: Logger;
  private config: AstroConfig;
  private currentAudio: PlayingAudio | null = null;
  private platform: NodeJS.Platform;

  constructor(logger: Logger, config: AstroConfig) {
    this.logger = logger;
    this.config = config;
    this.platform = process.platform;
  }

  private detectBackend(): 'windows' | 'linux' | 'macos' {
    if (this.config.audioBackend !== 'auto') {
      return this.config.audioBackend;
    }
    return this.platform === 'win32' ? 'windows' :
           this.platform === 'darwin' ? 'macos' : 'linux';
  }

  private getPlayCommand(backend: 'windows' | 'linux' | 'macos'): string {
    switch (backend) {
      case 'windows':
        return 'powershell -c (New-Object Media.SoundPlayer "{file}").PlaySync()';
      case 'macos':
        return 'afplay "{file}"';
      case 'linux':
        // 尝试多种播放器
        return 'paplay "{file}" || aplay "{file}" || play "{file}"';
    }
  }

  async play(file: string, options: { volume?: number; loop?: boolean; wait?: boolean } = {}): Promise<{ success: boolean; error?: string }> {
    try {
      const fullPath = await this.resolveAudioPath(file);
      if (!fullPath) {
        return { success: false, error: `音频文件不存在: ${file}` };
      }

      const backend = this.detectBackend();
      this.logger.info(`[音频工具] 播放: ${fullPath} (后端: ${backend})`);

      if (options.wait) {
        await this.playSync(fullPath, backend, options.volume);
      } else {
        await this.playAsync(fullPath, backend, options.volume, options.loop);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`[音频工具] 播放失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async resolveAudioPath(file: string): Promise<string | null> {
    // 检查是否是绝对路径
    if (path.isAbsolute(file)) {
      const exists = await fs.access(file).then(() => true).catch(() => false);
      return exists ? file : null;
    }

    // 在音频目录中查找
    const audioDir = resolvePath(this.config, this.config.audioDir);
    const fullPath = path.join(audioDir, file);

    const exists = await fs.access(fullPath).then(() => true).catch(() => false);
    return exists ? fullPath : null;
  }

  private async playSync(file: string, backend: 'windows' | 'linux' | 'macos', volume?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let command: string;
      let args: string[] = [];

      switch (backend) {
        case 'windows':
          // 使用PowerShell播放
          command = 'powershell';
          args = [
            '-c',
            `(Add-Type -AssemblyName presentation.core);`
          + `$player = New-Object System.Windows.Media.MediaPlayer;`
          + `$player.Open('${file.replace(/\\/g, '\\\\')}');`
          + `$player.Volume = ${((volume || 100) / 100).toFixed(2)};`
          + `$player.Play();`
          + `Start-Sleep -Milliseconds 100;`
          + `while ($player.Position -lt $player.NaturalDuration.TimeSpan) { Start-Sleep -Milliseconds 100 };`
          + `$player.Close()`
          ];
          break;

        case 'macos':
          command = 'afplay';
          args = [file];
          if (volume !== undefined) {
            args.push('-v', (volume / 100).toString());
          }
          break;

        case 'linux':
          // 尝试多种播放器
          command = 'paplay';
          args = [file];
          if (volume !== undefined) {
            args.push('--volume', (volume * 655).toString());
          }
          break;
      }

      const proc = spawn(command, args, { stdio: 'ignore' });

      proc.on('error', (err) => {
        // Linux fallback
        if (backend === 'linux' && command === 'paplay') {
          const fallbackProc = spawn('aplay', [file], { stdio: 'ignore' });
          fallbackProc.on('close', () => resolve());
          fallbackProc.on('error', reject);
        } else {
          reject(err);
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`播放器退出，代码: ${code}`));
        }
      });
    });
  }

  private async playAsync(file: string, backend: 'windows' | 'linux' | 'macos', volume?: number, loop?: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      // 停止当前播放
      this.stop();

      let command: string;
      let args: string[] = [];

      switch (backend) {
        case 'windows':
          // 异步播放（使用Start-Job）
          command = 'powershell';
          const psScript = `(Add-Type -AssemblyName presentation.core);`
            + `$player = New-Object System.Windows.Media.MediaPlayer;`
            + `$player.Open('${file.replace(/\\/g, '\\\\')}');`
            + `$player.Volume = ${((volume || 100) / 100).toFixed(2)};`
            + `$player.Play();`
            + `${loop ? '$player.MediaEnded += { $player.Position = TimeSpan.Zero; $player.Play() }' : ''}`;
          args = ['-c', psScript];
          break;

        case 'macos':
          command = 'afplay';
          args = [file];
          if (volume !== undefined) {
            args.push('-v', (volume / 100).toString());
          }
          if (loop) {
            args.push('--loop');
          }
          break;

        case 'linux':
          command = 'paplay';
          args = [file];
          if (volume !== undefined) {
            args.push('--volume', (volume * 655).toString());
          }
          if (loop) {
            args.push('--loop');
          }
          break;
      }

      const proc = spawn(command, args, {
        stdio: 'ignore',
        detached: true
      });

      proc.unref();

      this.currentAudio = {
        process: proc,
        file: file,
        startTime: Date.now()
      };

      this.logger.debug(`[音频工具] 开始异步播放: ${file}`);

      // 监听进程结束
      proc.on('close', (code) => {
        if (this.currentAudio?.file === file) {
          this.currentAudio = null;
          this.logger.debug(`[音频工具] 播放结束: ${file}`);
        }
      });

      resolve();
    });
  }

  stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.process.kill();
        this.logger.info('[音频工具] 停止播放');
      } catch (error) {
        this.logger.warn(`[音频工具] 停止播放失败: ${error.message}`);
      }
      this.currentAudio = null;
    }
  }

  /**
   * 文本转语音（TTS）
   * 使用系统TTS引擎朗读文本
   */
  async textToSpeech(text: string, options: { volume?: number; wait?: boolean } = {}): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.info(`[音频工具] TTS朗读: ${text.substring(0, 50)}...`);

      const backend = this.detectBackend();

      if (backend === 'windows') {
        // Windows: 使用 PowerShell（对 UTF-8 支持更好）
        // 使用 Base64 编码传递文本，避免所有转义问题
        const textBase64 = Buffer.from(text, 'utf16le').toString('base64');

        const psScript = `
Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$text = [System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String('${textBase64}'))
$speak.Speak($text)
`;

        this.logger.debug(`[音频工具] PowerShell脚本:\n${psScript}`);

        try {
          const tempDir = process.env.TEMP || 'C:\\Users\\kfzha\\.openclaw\\tmp';
          const tempFile = path.join(tempDir, `tts_${Date.now()}.ps1`);

          this.logger.debug(`[音频工具] 临时脚本: ${tempFile}`);

          // 确保 temp 目录存在
          await fs.mkdir(tempDir, { recursive: true });

          // 写入脚本文件（UTF-8 BOM）
          const utf8Bom = Buffer.from([0xEF, 0xBB, 0xBF]);
          const scriptContent = Buffer.concat([utf8Bom, Buffer.from(psScript, 'utf8')]);
          await fs.writeFile(tempFile, scriptContent);
          this.logger.debug(`[音频工具] 脚本已写入，执行 powershell...`);

          // 同步执行（等待语音播放完成）
          try {
            const output = execSync(`powershell -ExecutionPolicy Bypass -File "${tempFile}"`, {
              encoding: 'utf8',
              timeout: 30000
            });
            this.logger.debug(`[音频工具] PowerShell 输出: ${output}`);
          } catch (execError) {
            this.logger.error(`[音频工具] PowerShell 执行错误: ${execError.message}`);
            // 删除临时文件
            await fs.unlink(tempFile).catch(() => {});
            return { success: false, error: execError.message };
          }

          // 删除临时文件
          await fs.unlink(tempFile).catch(() => {});

          this.logger.info(`[音频工具] TTS完成`);
          return { success: true };
        } catch (error) {
          this.logger.error(`[音频工具] TTS异常: ${error.message}`);
          return { success: false, error: error.message };
        }
      } else if (backend === 'macos') {
        // macOS: 使用 say 命令
        return new Promise((resolve) => {
          exec(`say "${text.replace(/"/g, '\\"')}"`, (error) => {
            if (error) {
              resolve({ success: false, error: error.message });
            } else {
              resolve({ success: true });
            }
          });
        });
      } else {
        // Linux: 使用 espeak 或其他 TTS 工具
        return new Promise((resolve) => {
          exec(`espeak "${text.replace(/"/g, '\\"')}" 2>/dev/null || echo "TTS not available"`, (error) => {
            if (error) {
              resolve({ success: false, error: 'TTS not available on this system' });
            } else {
              resolve({ success: true });
            }
          });
        });
      }
    } catch (error) {
      this.logger.error(`[音频工具] TTS异常: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getDuration(file: string): Promise<number | null> {
    try {
      const fullPath = await this.resolveAudioPath(file);
      if (!fullPath) {
        return null;
      }

      // 简单估算：基于文件大小
      // 更精确的方法是使用ffprobe等工具
      const stats = await fs.stat(fullPath);
      const fileSizeMB = stats.size / (1024 * 1024);

      // 粗略估算：MP3约1MB/分钟，这个估算很粗略
      return Math.round(fileSizeMB * 60);
    } catch (error) {
      this.logger.warn(`[音频工具] 获取时长失败: ${error.message}`);
      return null;
    }
  }

  isPlaying(): boolean {
    return this.currentAudio !== null;
  }

  getCurrentFile(): string | null {
    return this.currentAudio?.file || null;
  }

  getToolDefinition() {
    return {
      name: 'astro_audio_play',
      description: '播放音频文件，支持MP3、WAV等格式，可控制音量和播放模式',
      parameters: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            description: '音频文件名（相对于audio目录）或绝对路径'
          },
          action: {
            type: 'string',
            enum: ['play', 'stop', 'status'],
            description: '播放动作'
          },
          volume: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: '音量（0-100）'
          },
          loop: {
            type: 'boolean',
            description: '是否循环播放'
          },
          wait: {
            type: 'boolean',
            description: '是否等待播放完成'
          }
        },
        required: ['action']
      }
    };
  }

  async execute(params: any): Promise<any> {
    const { action, ...rest } = params;

    switch (action) {
      case 'play':
        return await this.play(rest.file, {
          volume: rest.volume,
          loop: rest.loop,
          wait: rest.wait
        });

      case 'stop':
        this.stop();
        return { success: true };

      case 'status':
        return {
          success: true,
          isPlaying: this.isPlaying(),
          currentFile: this.getCurrentFile()
        };

      default:
        return { success: false, error: `未知动作: ${action}` };
    }
  }
}
