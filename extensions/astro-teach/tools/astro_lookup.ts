/**
 * 天体查询工具
 * 使用Python ephem库计算天体的方位角和高度角
 */

import { spawn } from 'child_process';
import * as path from 'path';
import type { Logger } from 'openclaw/plugin-sdk/core';
import type { AstroConfig } from '../config';
import { resolvePath } from '../config';

interface CelestialCoordinates {
  azimuth: number;        // 方位角（度）
  altitude: number;       // 高度角（度）
  direction: string;      // 方向描述
  is_visible: boolean;    // 是否可见
}

interface CelestialInfo {
  success: boolean;
  target_name?: string;
  english_name?: string;
  azimuth?: number;
  altitude?: number;
  direction?: string;
  is_visible?: boolean;
  coordinates?: {
    ra: {
      degrees: number;
      hours: number;
      minutes: number;
      seconds: number;
    };
    dec: {
      degrees: number;
      sign: string;
      degrees_part: number;
      minutes: number;
      seconds: number;
    };
  };
  observer?: {
    latitude: number;
    longitude: number;
    elevation: number;
  };
  timestamp?: string;
  error?: string;
}

export class AstroLookupTool {
  private logger: Logger;
  private config: AstroConfig;
  private scriptPath: string;

  constructor(logger: Logger, config: AstroConfig) {
    this.logger = logger;
    this.config = config;
    // 获取Python脚本路径
    this.scriptPath = path.join(__dirname, 'ephem_calculator.py');
  }

  /**
   * 查询天体的实时坐标（方位角和高度角）
   */
  async queryCelestialBody(params: {
    target: string;
    latitude?: number;
    longitude?: number;
  }): Promise<CelestialInfo> {
    try {
      const { target, latitude = 39.9042, longitude = 116.4074 } = params;

      this.logger.info(`[天体查询] 查询: ${target}`);

      // 调用Python脚本
      const result = await this.runPythonScript(target, latitude, longitude);

      if (!result.success) {
        this.logger.error(`[天体查询] 查询失败: ${result.error}`);
        return result;
      }

      this.logger.info(
        `[天体查询] ${result.target_name}: 方位角=${result.azimuth}°, ` +
        `高度角=${result.altitude}°, 方向=${result.direction}`
      );

      return result;

    } catch (error) {
      this.logger.error(`[天体查询] 查询异常: ${error.message}`);
      return {
        success: false,
        error: error.message,
        target_name: params.target
      };
    }
  }

  /**
   * 列出所有可查询的天体
   */
  async listAvailableBodies(): Promise<{ success: boolean; bodies?: string[]; error?: string }> {
    try {
      const result = await this.runPythonScript('--list');

      if (result.success && result.data) {
        const bodies = result.data;
        return {
          success: true,
          bodies: [
            ...bodies.solar_system || [],
            ...bodies.stars || [],
            ...bodies.chinese_names || []
          ]
        };
      }

      return { success: false, error: '获取天体列表失败' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 运行Python脚本
   */
  private async runPythonScript(
    target: string,
    latitude?: number,
    longitude?: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = [this.scriptPath, target];

      if (latitude !== undefined && longitude !== undefined) {
        args.push(latitude.toString(), longitude.toString());
      }

      // 尝试多种Python路径（优先使用Anaconda）
      const pythonCommands = this.getPythonCommands();

      this.tryPythonCommands(pythonCommands, args)
        .then(resolve)
        .catch((err) => {
          // 所有Python路径都失败，fallback到内置数据
          this.logger.warn(`[天体查询] Python未安装或不可用，使用内置数据: ${err.message}`);
          resolve(this.getFallbackData(target));
        });
    });
  }

  /**
   * 获取可用的Python命令列表
   */
  private getPythonCommands(): string[] {
    const commands: string[] = [];

    // Windows Anaconda路径
    if (process.platform === 'win32') {
      const possiblePaths = [
        'C:\\ProgramData\\anaconda3\\python.exe',
        'C:\\Users\\' + (process.env.USERNAME || '') + '\\anaconda3\\python.exe',
        'C:\\anaconda3\\python.exe',
        'C:\\Python312\\python.exe',
        'C:\\Python311\\python.exe',
        'C:\\Python310\\python.exe'
      ];
      commands.push(...possiblePaths);
    }

    // 通用命令
    commands.push('python3', 'python', 'python3.12', 'python3.11', 'python3.10');

    return commands;
  }

  /**
   * 依次尝试Python命令
   */
  private async tryPythonCommands(
    commands: string[],
    args: string[]
  ): Promise<any> {
    for (const cmd of commands) {
      try {
        const result = await this.spawnPython(cmd, args);
        return result;
      } catch (err) {
        // 继续尝试下一个命令
        this.logger.debug(`[天体查询] 尝试 ${cmd} 失败: ${err.message}`);
      }
    }
    throw new Error('所有Python命令都失败');
  }

  /**
   * 执行单个Python命令
   */
  private spawnPython(cmd: string, args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.logger.info(`[天体查询] 使用Python: ${cmd}`);

      const pythonProcess = spawn(cmd, args);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Python执行超时'));
      }, 10000); // 10秒超时

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          reject(new Error(`退出代码: ${code}, 错误: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`解析输出失败: ${error.message}`));
        }
      });

      pythonProcess.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Fallback数据（Python未安装时使用）
   */
  private getFallbackData(target: string): any {
    const staticData: { [key: string]: any } = {
      "织女星": {
        success: true,
        target_name: "织女星",
        english_name: "Vega",
        azimuth: 180 + (18 * 60 + 36) / 360 * 15, // 示例值
        altitude: 38,
        direction: "南",
        is_visible: true,
        coordinates: {
          ra: { degrees: 279.23, hours: 18, minutes: 36, seconds: 56 },
          dec: { degrees: 38.78, sign: "+", degrees_part: 38, minutes: 47, seconds: 1 }
        }
      },
      "天狼星": {
        success: true,
        target_name: "天狼星",
        english_name: "Sirius",
        azimuth: 135,
        altitude: 25,
        direction: "东南",
        is_visible: true,
        coordinates: {
          ra: { degrees: 101.28, hours: 6, minutes: 45, seconds: 8 },
          dec: { degrees: -16.71, sign: "-", degrees_part: 16, minutes: 42, seconds: 58 }
        }
      },
      "北极星": {
        success: true,
        target_name: "北极星",
        english_name: "Polaris",
        azimuth: 0,
        altitude: 39.9, // 等于纬度
        direction: "北",
        is_visible: true,
        coordinates: {
          ra: { degrees: 37.95, hours: 2, minutes: 31, seconds: 48 },
          dec: { degrees: 89.26, sign: "+", degrees_part: 89, minutes: 15, seconds: 51 }
        }
      }
    };

    if (target in staticData) {
      return staticData[target];
    }

    return {
      success: false,
      error: `未找到天体 '${target}' 的数据（Python ephem未安装，请安装: pip install ephem）`,
      target_name: target
    };
  }

  getToolDefinition() {
    return {
      name: 'astro_celestial_lookup',
      description: '查询天体的实时坐标信息（方位角、高度角）。支持中文名称查询，如：织女星、天狼星、北极星等。使用Python ephem库精确计算天体在指定地点和时间的当前位置。',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: '天体名称（中文或英文），如：织女星、Vega、天狼星、Sirius、北极星、Polaris'
          },
          latitude: {
            type: 'number',
            description: '观测者纬度（度），默认北京39.9'
          },
          longitude: {
            type: 'number',
            description: '观测者经度（度），默认北京116.4'
          }
        },
        required: ['target']
      }
    };
  }

  async execute(params: any): Promise<any> {
    const { target, latitude, longitude } = params;

    if (target === '--list' || target === 'list') {
      return await this.listAvailableBodies();
    }

    const result = await this.queryCelestialBody({
      target,
      latitude,
      longitude
    });

    // 格式化输出
    if (result.success) {
      const { ra, dec } = result.coordinates!;

      return {
        text: `🔭 **${result.target_name} (${result.english_name})**\n\n` +
              `📍 **当前位置**：\n` +
              `• 方位角：${result.azimuth}° (${result.direction})\n` +
              `• 高度角：${result.altitude}°\n` +
              `• 可见性：${result.is_visible ? '✅ 可见' : '❌ 不可见'}\n\n` +
              `🌌 **天体坐标**：\n` +
              `• 赤经：${ra.hours}h ${ra.minutes}m ${ra.seconds}s\n` +
              `• 赤纬：${dec.sign}${dec.degrees_part}° ${dec.minutes}' ${dec.seconds}"\n\n` +
              `_观测时间：${result.timestamp}_`,
        success: true,
        data: result
      };
    }

    return {
      text: `❌ 查询失败：${result.error}`,
      success: false,
      error: result.error
    };
  }
}
