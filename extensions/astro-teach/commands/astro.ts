/**
 * 天文命令处理器
 * 处理CLI命令和Slash命令
 */

import type { Logger } from 'openclaw/plugin-sdk/core';
import type { AstroConfig } from '../config';
import { PipelineParserTool } from '../tools/pipeline_parser';
import { PipelineExecutorService } from '../services/pipeline_executor';

// 获取 Gateway 中已启动的执行器实例
function getExecutorService(): PipelineExecutorService | null {
  return (global as any).__astroExecutorService || null;
}

export const astroCommandHandler = {
  async start(pipelineName: string, options: any, config: AstroConfig, logger: Logger): Promise<string> {
    try {
      const CODE_VERSION = 'v2.0-executor-' + new Date().toISOString().slice(0, 10);
      logger.info(`[命令] 🚀 启动流水线: ${pipelineName} (代码版本: ${CODE_VERSION})`);
      console.log(`\n🔍 [DEBUG] 使用执行器版本: ${CODE_VERSION}`);

      console.log(`🔍 [DEBUG] 开始解析流水线: ${pipelineName}`);
      const parser = new PipelineParserTool(logger, config);
      const result = await parser.parse(pipelineName);
      console.log(`🔍 [DEBUG] 解析完成: success=${result.success}, error=${result.error || 'none'}`);

      if (!result.success) {
        console.log(`🔍 [DEBUG] 解析失败，返回错误`);
        return `❌ 流水线解析失败: ${result.error}`;
      }

      console.log(`🔍 [DEBUG] 解析成功，获取 pipeline 对象`);

      const pipeline = result.pipeline!;

      // 获取执行器实例
      const executorService = getExecutorService();
      if (!executorService) {
        console.log(`\n❌ [ERROR] 执行器实例未找到！请确保 Gateway 正在运行。`);
        return `❌ 执行器未启动，请先启动 OpenClaw Gateway`;
      }

      console.log(`\n🔍 [DEBUG] 使用 Gateway 执行器实例`);

      // 检查是否已经在运行
      if (executorService.isPipelineRunning()) {
        return `⚠️ 流水线正在运行中，请先停止当前流水线`;
      }

      // 执行流水线
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🚀 开始执行流水线: ${pipeline.name}`);
      console.log(`📋 步骤数: ${pipeline.steps.length}个`);
      console.log(`⏱ 预计时长: ${pipeline.duration}分钟`);
      console.log(`${'='.repeat(70)}\n`);

      console.log(`🔍 [DEBUG] 调用 executorService.startPipeline()...`);
      const execResult = await executorService.startPipeline(pipeline, options);
      console.log(`🔍 [DEBUG] startPipeline() 返回: success=${execResult.success}, error=${execResult.error || 'none'}`);

      if (!execResult.success) {
        return `❌ 执行失败: ${execResult.error}`;
      }

      // 等待一小段时间让执行开始
      await new Promise(resolve => setTimeout(resolve, 100));

      return `✅ 流水线已启动！\n\n执行中...（使用 "openclaw astro status" 查看状态）`;

    } catch (error) {
      logger.error(`[命令] 启动失败: ${error.message}`);
      return `❌ 启动失败: ${error.message}`;
    }
  },

  async stop(config: AstroConfig, logger: Logger): Promise<string> {
    try {
      logger.info('[命令] 🛑 停止流水线');

      const executorService = getExecutorService();
      if (!executorService || !executorService.isPipelineRunning()) {
        return '⚠️ 没有正在运行的流水线';
      }

      const result = await executorService.stopCurrent();

      if (result.success) {
        return '✅ 流水线已停止';
      } else {
        return `❌ 停止失败: ${result.error}`;
      }
    } catch (error) {
      logger.error(`[命令] 停止失败: ${error.message}`);
      return `❌ 停止失败: ${error.message}`;
    }
  },

  async status(config: AstroConfig, logger: Logger): Promise<string> {
    try {
      const executorService = getExecutorService();
      if (!executorService) {
        return `📊 流水线状态: 未启动\n\n提示: 请先启动 OpenClaw Gateway`;
      }

      const status = executorService.getStatus();

      let output = `📊 流水线状态: ${status.status}\n`;

      if (status.status === 'running' || status.status === 'paused') {
        output += `流水线名称: ${status.pipelineName}\n`;
        output += `进度: ${status.progress}%\n`;

        if (status.elapsed !== undefined) {
          const minutes = Math.floor(status.elapsed / 60);
          const seconds = status.elapsed % 60;
          output += `已运行: ${minutes}分${seconds}秒\n`;
        }

        if (status.remaining !== undefined) {
          const minutes = Math.floor(status.remaining / 60);
          const seconds = status.remaining % 60;
          output += `剩余: ${minutes}分${seconds}秒\n`;
        }

        if (status.currentStep !== undefined) {
          output += `当前步骤: 第${status.currentStep + 1}步\n`;
        }
      } else if (status.error) {
        output += `\n错误: ${status.error}\n`;
      }

      return output;

    } catch (error) {
      logger.error(`[命令] 状态查询失败: ${error.message}`);
      return `❌ 状态查询失败: ${error.message}`;
    }
  },

  async list(config: AstroConfig, logger: Logger): Promise<string> {
    try {
      logger.info(`[命令] 开始列出流水线，目录: ${config.pipelineDir}`);

      const parser = new PipelineParserTool(logger, config);
      const pipelines = await parser.list();

      logger.info(`[命令] 找到 ${pipelines.length} 个流水线`);

      if (pipelines.length === 0) {
        console.log(`📂 没有找到流水线文件`);
        console.log(`目录: ${config.pipelineDir}`);
        return '';
      }

      console.log(`📂 可用流水线 (${pipelines.length}个):`);
      console.log('');
      for (const pipeline of pipelines) {
        console.log(`  • ${pipeline}`);
      }
      console.log('');
      console.log(`使用 openclaw astro start <流水线名> 启动流水线`);

      return '';
    } catch (error) {
      logger.error(`[命令] 列出流水线失败: ${error.message}`);
      console.log(`❌ 列出流水线失败: ${error.message}`);
      return '';
    }
  },

  async validate(pipelineName: string, config: AstroConfig, logger: Logger): Promise<string> {
    try {
      const parser = new PipelineParserTool(logger, config);
      const result = await parser.validate(pipelineName);

      if (result.success) {
        return `✅ 流水线 "${pipelineName}" 验证通过`;
      } else {
        return `❌ 流水线 "${pipelineName}" 验证失败:\n${result.errors?.join('\n')}`;
      }
    } catch (error) {
      logger.error(`[命令] 验证失败: ${error.message}`);
      return `❌ 验证失败: ${error.message}`;
    }
  },

  async testSerial(options: any, config: AstroConfig, logger: Logger): Promise<string> {
    try {
      const SerialPort = require('serialport');
      const port = options.port || config.serialPort;

      logger.info(`[命令] 测试串口: ${port}`);

      const ports = await SerialPort.list();
      const found = ports.find(p => p.path === port);

      if (!found) {
        let output = `❌ 未找到串口: ${port}\n\n`;
        output += `可用串口:\n`;
        for (const p of ports) {
          output += `  • ${p.path}\n`;
        }
        return output;
      }

      return `✅ 串口 ${port} 可用\n` +
             `制造商: ${found.manufacturer || '未知'}\n` +
             `序列号: ${found.serialNumber || '未知'}\n` +
             `供应商ID: ${found.vendorId || '未知'}\n` +
             `产品ID: ${found.productId || '未知'}`;
    } catch (error) {
      logger.error(`[命令] 测试串口失败: ${error.message}`);
      return `❌ 测试串口失败: ${error.message}`;
    }
  }
};
