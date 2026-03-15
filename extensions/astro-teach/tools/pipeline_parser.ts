/**
 * 流水线解析工具
 * 解析和验证天文教学流水线配置文件
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { Logger } from 'openclaw/plugin-sdk/core';
import type { AstroConfig } from '../config';
import { resolvePath } from '../config';
import type { PipelineConfig, PipelineStep, PipelineExecutionStatus } from '../types';

export class PipelineParserTool {
  private logger: Logger;
  private config: AstroConfig;
  private cache: Map<string, PipelineConfig> = new Map();

  constructor(logger: Logger, config: AstroConfig) {
    this.logger = logger;
    this.config = config;
  }

  async parse(pipelineFile: string): Promise<{ success: boolean; pipeline?: PipelineConfig; error?: string }> {
    try {
      const fullPath = await this.resolvePipelinePath(pipelineFile);
      if (!fullPath) {
        return { success: false, error: `流水线文件不存在: ${pipelineFile}` };
      }

      // 检查缓存
      if (this.cache.has(fullPath)) {
        const cached = this.cache.get(fullPath)!;
        this.logger.debug(`[流水线工具] 使用缓存: ${pipelineFile}`);
        return { success: true, pipeline: cached };
      }

      // 读取文件
      const content = await fs.readFile(fullPath, 'utf-8');

      // 解析YAML
      let parsed: any;
      if (pipelineFile.endsWith('.json')) {
        parsed = JSON.parse(content);
      } else {
        parsed = YAML.parse(content);
      }

      // 验证和构建配置
      const pipeline = await this.validateAndBuild(parsed, fullPath);

      // 缓存
      this.cache.set(fullPath, pipeline);

      this.logger.info(`[流水线工具] 解析成功: ${pipeline.name} (${pipeline.steps.length}步骤, ${pipeline.duration}分钟)`);
      return { success: true, pipeline };
    } catch (error) {
      this.logger.error(`[流水线工具] 解析失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async resolvePipelinePath(pipelineFile: string): Promise<string | null> {
    // 检查是否是绝对路径
    if (path.isAbsolute(pipelineFile)) {
      const exists = await fs.access(pipelineFile).then(() => true).catch(() => false);
      return exists ? pipelineFile : null;
    }

    // 在流水线目录中查找
    const pipelineDir = resolvePath(this.config, this.config.pipelineDir);
    console.log(`🔍 [DEBUG] 解析流水线路径: pipelineDir=${pipelineDir}`);

    // 尝试多种扩展名
    const extensions = ['.yaml', '.yml', '.json'];
    for (const ext of extensions) {
      const fullPath = path.join(pipelineDir, pipelineFile + ext);
      console.log(`🔍 [DEBUG] 尝试: ${fullPath}`);
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);
      if (exists) {
        console.log(`🔍 [DEBUG] 找到文件: ${fullPath}`);
        return fullPath;
      }
    }

    // 尝试直接使用
    const fullPath = path.join(pipelineDir, pipelineFile);
    console.log(`🔍 [DEBUG] 尝试直接使用: ${fullPath}`);
    const exists = await fs.access(fullPath).then(() => true).catch(() => false);
    if (exists) {
      console.log(`🔍 [DEBUG] 找到文件: ${fullPath}`);
      return fullPath;
    }

    console.log(`🔍 [DEBUG] 未找到文件，返回 null`);
    return null;
  }

  private async validateAndBuild(parsed: any, filePath: string): Promise<PipelineConfig> {
    // 基本验证
    if (!parsed.name) {
      throw new Error('流水线缺少name字段');
    }
    if (!parsed.steps || !Array.isArray(parsed.steps)) {
      throw new Error('流水线缺少steps字段或steps不是数组');
    }
    if (parsed.steps.length === 0) {
      throw new Error('流水线步骤不能为空');
    }

    // 时长验证
    const duration = Number(parsed.duration) || this.config.defaultDuration;
    if (duration > this.config.maxDuration) {
      throw new Error(`流水线时长(${duration}分钟)超过最大限制(${this.config.maxDuration}分钟)`);
    }
    if (duration < 1) {
      throw new Error('流水线时长不能小于1分钟');
    }

    // 步骤验证
    const maxTime = duration * 60; // 转换为秒
    const steps: PipelineStep[] = [];

    for (let i = 0; i < parsed.steps.length; i++) {
      const step = parsed.steps[i];

      if (typeof step.time !== 'number' || step.time < 0) {
        throw new Error(`步骤${i + 1}: time必须是正数`);
      }
      if (step.time > maxTime) {
        throw new Error(`步骤${i + 1}: time(${step.time}秒)超过流水线总时长(${maxTime}秒)`);
      }

      if (!step.action) {
        throw new Error(`步骤${i + 1}: 缺少action字段`);
      }

      const actionType = step.action.type;
      if (!['serial', 'audio', 'laser', 'wait', 'parallel'].includes(actionType)) {
        throw new Error(`步骤${i + 1}: 未知action类型: ${actionType}`);
      }

      // 验证特定动作类型
      switch (actionType) {
        case 'audio':
          if (!step.action.file) {
            throw new Error(`步骤${i + 1}: audio动作缺少file字段`);
          }
          break;

        case 'serial':
          if (!step.action.command && !step.action.params) {
            throw new Error(`步骤${i + 1}: serial动作缺少command或params字段`);
          }
          break;

        case 'laser':
          if (typeof step.action.enabled !== 'boolean') {
            throw new Error(`步骤${i + 1}: laser动作缺少enabled字段`);
          }
          break;

        case 'wait':
          if (!step.action.duration) {
            throw new Error(`步骤${i + 1}: wait动作缺少duration字段`);
          }
          break;

        case 'parallel':
          if (!Array.isArray(step.action.actions)) {
            throw new Error(`步骤${i + 1}: parallel动作的actions必须是数组`);
          }
          break;
      }

      steps.push({
        time: step.time,
        action: step.action,
        description: step.description || `步骤${i + 1}`,
        enabled: step.enabled !== false,
        content: step.content || ''
      });
    }

    // 按时间排序
    steps.sort((a, b) => a.time - b.time);

    return {
      name: parsed.name,
      description: parsed.description,
      version: parsed.version,
      author: parsed.author,
      duration: duration,
      timezone: parsed.timezone || this.config.timezone,
      steps: steps,
      metadata: parsed.metadata || {}
    };
  }

  async list(): Promise<string[]> {
    try {
      const pipelineDir = resolvePath(this.config, this.config.pipelineDir);
      const files = await fs.readdir(pipelineDir);

      const pipelines: string[] = [];
      for (const file of files) {
        const filePath = path.join(pipelineDir, file);
        const stat = await fs.stat(filePath);

        if (stat.isFile() && /\.(yaml|yml|json)$/.test(file)) {
          pipelines.push(path.basename(file, path.extname(file)));
        }
      }

      return pipelines.sort();
    } catch (error) {
      this.logger.error(`[流水线工具] 列出流水线失败: ${error.message}`);
      return [];
    }
  }

  async validate(pipelineFile: string): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const result = await this.parse(pipelineFile);
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, errors: [result.error!] };
      }
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.logger.debug('[流水线工具] 缓存已清空');
  }

  getToolDefinition() {
    return {
      name: 'astro_parse_pipeline',
      description: '解析天文教学流水线配置文件，支持YAML和JSON格式，验证步骤和时长',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['parse', 'list', 'validate'],
            description: '解析动作'
          },
          file: {
            type: 'string',
            description: '流水线文件名'
          }
        },
        required: ['action']
      }
    };
  }

  async execute(params: any): Promise<any> {
    const { action, file } = params;

    switch (action) {
      case 'parse':
        return await this.parse(file);

      case 'list':
        const list = await this.list();
        return { success: true, pipelines: list };

      case 'validate':
        return await this.validate(file);

      default:
        return { success: false, error: `未知动作: ${action}` };
    }
  }
}
