/**
 * 串口控制工具
 * 通过串口控制天文指星仪设备
 */

import { SerialPort } from 'serialport';
import type { Logger } from 'openclaw/plugin-sdk/core';
import type { AstroConfig } from '../config';
import type { CelestialObject, CelestialCoordinates, SerialCommand } from '../types';
import { loadCelestialMapping } from '../utils/celestial';

export class SerialControlTool {
  private port?: SerialPort;
  private logger: Logger;
  private config: AstroConfig;
  private celestialData: Map<string, CelestialObject>;

  constructor(logger: Logger, config: AstroConfig) {
    this.logger = logger;
    this.config = config;
    this.celestialData = new Map();
    this.loadMappingData();
  }

  private async loadMappingData() {
    try {
      const mapping = await loadCelestialMapping(this.config.dataDir);
      for (const obj of Object.values(mapping)) {
        if (!obj || !obj.name) continue;

        this.celestialData.set(obj.name, obj);

        if (obj.englishName) {
          this.celestialData.set(obj.englishName.toLowerCase(), obj);
        }

        if (obj.designation) {
          this.celestialData.set(obj.designation.toLowerCase(), obj);
        }
      }
      this.logger.info(`[串口工具] 加载了 ${this.celestialData.size} 个天体数据`);
    } catch (error) {
      this.logger.warn(`[串口工具] 无法加载天体映射数据: ${error.message}`);
    }
  }

  async connect(): Promise<boolean> {
    try {
      this.port = new SerialPort({
        path: this.config.serialPort,
        baudRate: this.config.baudRate,
        autoOpen: false
      });

      await new Promise<void>((resolve, reject) => {
        this.port!.open((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      this.logger.info(`[串口工具] 已连接到 ${this.config.serialPort} @ ${this.config.baudRate}`);
      return true;
    } catch (error) {
      this.logger.error(`[串口工具] 连接失败: ${error.message}`);
      return false;
    }
  }

  disconnect(): void {
    if (this.port && this.port.isOpen) {
      this.port.close();
      this.logger.info('[串口工具] 已断开连接');
    }
  }

  private async sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.port || !this.port.isOpen) {
        reject(new Error('串口未连接'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('串口通信超时'));
      }, this.config.serialTimeout);

      this.port.write(command + '\n', (err) => {
        clearTimeout(timeout);
        if (err) {
          reject(err);
        } else {
          this.logger.debug(`[串口工具] 发送: ${command}`);
          resolve('OK');
        }
      });
    });
  }

  async moveToObject(objectName: string): Promise<{ success: boolean; coordinates?: CelestialCoordinates; error?: string }> {
    // 查找天体
    const celestial = this.findCelestialObject(objectName);
    if (!celestial) {
      return { success: false, error: `未找到天体: ${objectName}` };
    }

    if (!celestial.coordinates) {
      return { success: false, error: `天体 ${objectName} 没有坐标数据` };
    }

    const coords = celestial.coordinates;
    return this.moveToCoordinates(coords);
  }

  async moveToCoordinates(coords: CelestialCoordinates): Promise<{ success: boolean; coordinates?: CelestialCoordinates; error?: string }> {
    try {
      // 如果有赤经赤纬，先转换为方位角高度角
      let targetAz = coords.azimuth;
      let targetAlt = coords.altitude;

      if (coords.rightAscension !== undefined && coords.declination !== undefined) {
        const converted = this.convertEquatorialToHorizontal(coords);
        targetAz = converted.azimuth;
        targetAlt = converted.altitude;
      }

      if (targetAz === undefined || targetAlt === undefined) {
        return { success: false, error: '无法确定目标坐标' };
      }

      const command = `MOVE_TO ${targetAz.toFixed(4)} ${targetAlt.toFixed(4)}`;
      await this.sendCommand(command);

      this.logger.info(`[串口工具] 移动到方位角=${targetAz.toFixed(2)}°, 高度角=${targetAlt.toFixed(2)}°`);
      return { success: true, coordinates: { azimuth: targetAz, altitude: targetAlt } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async home(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.sendCommand('HOME');
      this.logger.info('[串口工具] 归零');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async park(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.sendCommand('PARK');
      this.logger.info('[串口工具] 停放');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async setLaser(enabled: boolean, duration?: number): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config.enableLaser) {
        return { success: false, error: '激光功能已禁用' };
      }

      // 激光安全延迟
      await this.delay(this.config.laserSafetyDelay);

      if (enabled) {
        await this.sendCommand('LASER_ON');
        if (duration) {
          setTimeout(async () => {
            await this.sendCommand('LASER_OFF');
          }, duration);
        }
      } else {
        await this.sendCommand('LASER_OFF');
      }

      this.logger.info(`[串口工具] 激光 ${enabled ? '开启' : '关闭'}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async stop(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.sendCommand('STOP');
      this.logger.info('[串口工具] 停止');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private findCelestialObject(name: string): CelestialObject | undefined {
    const normalizedName = name.toLowerCase().trim();
    return this.celestialData.get(normalizedName);
  }

  private convertEquatorialToHorizontal(coords: CelestialCoordinates): { azimuth: number; altitude: number } {
    // 简化的坐标转换（实际应使用天文库进行精确计算）
    // 这里使用近似公式，实际项目中应使用 skyfield 或 astroquery

    const now = new Date();
    const lst = this.getLocalSiderealTime(now);

    const ra = coords.rightAscension!;
    const dec = coords.declination!;
    const lat = 30.0; // 假设纬度30°N（应从配置读取）
    const hourAngle = lst - ra;

    const haRad = hourAngle * Math.PI / 12;
    const decRad = dec * Math.PI / 180;
    const latRad = lat * Math.PI / 180;

    const sinAlt = Math.sin(decRad) * Math.sin(latRad) +
                   Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
    const altRad = Math.asin(sinAlt);

    const cosAz = (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) /
                  (Math.cos(altRad) * Math.cos(latRad));
    const azRad = Math.acos(Math.max(-1, Math.min(1, cosAz)));

    let az = azRad * 180 / Math.PI;
    if (Math.sin(haRad) > 0) {
      az = 360 - az;
    }

    return {
      azimuth: az,
      altitude: altRad * 180 / Math.PI
    };
  }

  private getLocalSiderealTime(date: Date): number {
    // 简化的LST计算（实际应使用精确公式）
    const jd = this.getJulianDate(date);
    const T = (jd - 2451545.0) / 36525;
    let lst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
              0.000387933 * T * T - T * T * T / 38710000;
    lst = lst % 360;
    if (lst < 0) lst += 360;
    return lst / 15; // 转换为小时
  }

  private getJulianDate(date: Date): number {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();

    if (month <= 2) {
      date.setUTCFullYear(year - 1);
      date.setUTCMonth(month + 12);
    }

    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    const JD = Math.floor(365.25 * (year + 4716)) +
               Math.floor(30.6001 * (month + 1)) +
               day + B - 1524.5 +
               (hour + minute / 60 + second / 3600) / 24;

    return JD;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getToolDefinition() {
    return {
      name: 'astro_serial_control',
      description: '通过串口控制天文指星仪设备，包括移动到指定天体、控制激光等',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['move', 'home', 'park', 'laser', 'stop'],
            description: '控制动作类型'
          },
          objectName: {
            type: 'string',
            description: '目标天体名称（中文名或英文名）'
          },
          azimuth: {
            type: 'number',
            description: '方位角（度）'
          },
          altitude: {
            type: 'number',
            description: '高度角（度）'
          },
          laserEnabled: {
            type: 'boolean',
            description: '激光开关'
          },
          laserDuration: {
            type: 'number',
            description: '激光持续时间（毫秒）'
          }
        },
        required: ['action']
      }
    };
  }

  async execute(params: any): Promise<any> {
    const { action, ...rest } = params;

    switch (action) {
      case 'move':
        if (rest.objectName) {
          return await this.moveToObject(rest.objectName);
        } else if (rest.azimuth !== undefined && rest.altitude !== undefined) {
          return await this.moveToCoordinates({
            azimuth: rest.azimuth,
            altitude: rest.altitude
          });
        }
        return { success: false, error: 'move动作需要objectName或coordinates参数' };

      case 'home':
        return await this.home();

      case 'park':
        return await this.park();

      case 'laser':
        return await this.setLaser(rest.laserEnabled, rest.laserDuration);

      case 'stop':
        return await this.stop();

      default:
        return { success: false, error: `未知动作: ${action}` };
    }
  }
}
