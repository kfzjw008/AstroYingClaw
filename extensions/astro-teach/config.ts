/**
 * 配置验证和类型定义
 */

import * as path from 'path';

export interface AstroConfig {
  // 串口配置
  serialPort: string;
  baudRate: number;

  // 目录配置
  pipelineDir: string;
  audioDir: string;
  dataDir: string;

  // 时间配置
  defaultDuration: number; // 分钟
  maxDuration: number; // 分钟
  timezone: string;

  // 音频配置
  audioBackend: 'auto' | 'windows' | 'linux' | 'macos';

  // 日志配置
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // 激光安全配置
  enableLaser: boolean;
  laserSafetyDelay: number; // 毫秒

  // 通信配置
  serialTimeout: number; // 毫秒
  retryAttempts: number;
}

export const DEFAULT_CONFIG: AstroConfig = {
  serialPort: process.platform === 'win32' ? 'COM3' : '/dev/ttyUSB0',
  baudRate: 9600,
  pipelineDir: './pipelines',
  audioDir: './audio',
  dataDir: './data',
  defaultDuration: 20,
  maxDuration: 60,
  timezone: 'Asia/Shanghai',
  audioBackend: 'auto',
  logLevel: 'info',
  enableLaser: true,
  laserSafetyDelay: 300,
  serialTimeout: 5000,
  retryAttempts: 3,
};

export function validateConfig(userConfig: any): AstroConfig {
  const config: AstroConfig = { ...DEFAULT_CONFIG };

  if (userConfig.serialPort) config.serialPort = userConfig.serialPort;
  if (userConfig.baudRate) config.baudRate = Number(userConfig.baudRate);
  if (userConfig.pipelineDir) config.pipelineDir = userConfig.pipelineDir;
  if (userConfig.audioDir) config.audioDir = userConfig.audioDir;
  if (userConfig.dataDir) config.dataDir = userConfig.dataDir;
  if (userConfig.defaultDuration) {
    const duration = Number(userConfig.defaultDuration);
    if (duration > 60 || duration < 1) {
      throw new Error('默认时长必须在1-60分钟之间');
    }
    config.defaultDuration = duration;
  }
  if (userConfig.maxDuration) {
    const maxDuration = Number(userConfig.maxDuration);
    if (maxDuration > 60 || maxDuration < 1) {
      throw new Error('最大时长必须在1-60分钟之间');
    }
    config.maxDuration = maxDuration;
  }
  if (userConfig.timezone) config.timezone = userConfig.timezone;
  if (userConfig.audioBackend) config.audioBackend = userConfig.audioBackend;
  if (userConfig.logLevel) config.logLevel = userConfig.logLevel;
  if (userConfig.enableLaser !== undefined) config.enableLaser = Boolean(userConfig.enableLaser);
  if (userConfig.laserSafetyDelay) config.laserSafetyDelay = Number(userConfig.laserSafetyDelay);
  if (userConfig.serialTimeout) config.serialTimeout = Number(userConfig.serialTimeout);
  if (userConfig.retryAttempts) config.retryAttempts = Number(userConfig.retryAttempts);

  return config;
}

export function resolvePath(config: AstroConfig, relativePath: string): string {
  if (relativePath.startsWith('/') || relativePath.match(/^[A-Za-z]:/)) {
    return relativePath; // 绝对路径
  }

  // 相对于 OpenClaw workspace 目录
  // 尝试多个可能的 workspace 位置
  const userProfile = process.env.USERPROFILE || '';
  const possiblePaths = [
    process.env.OPENCLAW_WORKSPACE,
    path.join(userProfile, '.openclaw', 'workspace')
  ].filter(Boolean);

  for (const baseDir of possiblePaths) {
    const fullPath = path.join(baseDir as string, relativePath);
    // 验证路径是否存在
    try {
      const fs = require('fs');
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    } catch (e) {
      // 忽略错误，继续尝试下一个路径
    }
  }

  // 如果都找不到，返回第一个可能的路径（让后续处理报错）
  return path.join(possiblePaths[0] as string, relativePath);
}
