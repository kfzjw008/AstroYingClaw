/**
 * 天文教学自动化系统 - OpenClaw Plugin
 *
 * 功能：
 * 1. 串口控制天文指星仪设备
 * 2. 语音播放控制
 * 3. 流水线配置解析
 * 4. 天文库查询
 * 5. 自动化教学流水线执行
 */

import type { PluginAPI } from 'openclaw/plugin-sdk/core';
import { SerialControlTool } from './tools/serial_control';
import { AudioPlayTool } from './tools/audio_play';
import { PipelineParserTool } from './tools/pipeline_parser';
import { AstroLookupTool } from './tools/astro_lookup';
import { PipelineExecutorService } from './services/pipeline_executor';
import { astroCommandHandler } from './commands/astro';
import { AstroConfig, validateConfig } from './config';

// 配置验证和初始化
function getConfig(cfg: any): AstroConfig {
  const pluginConfig = cfg.plugins?.entries?.['astro-teach']?.config || {};
  return validateConfig(pluginConfig);
}

// 插件主入口
export default function register(api: PluginAPI) {
  const config = getConfig(api.config);

  // 注册工具
  const serialTool = new SerialControlTool(api.logger, config);
  api.registerTool(serialTool.getToolDefinition());

  const audioTool = new AudioPlayTool(api.logger, config);
  api.registerTool(audioTool.getToolDefinition());

  const pipelineTool = new PipelineParserTool(api.logger, config);
  api.registerTool(pipelineTool.getToolDefinition());

  const astroTool = new AstroLookupTool(api.logger, config);
  api.registerTool(astroTool.getToolDefinition());

  // 注册后台服务
  const executorService = new PipelineExecutorService(api.logger, config);
  api.registerService({
    id: 'astro-pipeline-executor',
    name: '天文流水线执行器',
    start: async () => {
      api.logger.info('[天文教学] 流水线执行器启动');
      await executorService.start();
    },
    stop: async () => {
      api.logger.info('[天文教学] 流水线执行器停止');
      await executorService.stop();
    }
  });

  // 将执行器实例导出，供命令处理器使用
  (global as any).__astroExecutorService = executorService;

  // 注册CLI命令
  api.registerCli(
    ({ program }) => {
      const astroCmd = program
        .command('astro')
        .description('天文教学自动化命令');

      astroCmd
        .command('start <pipeline>')
        .description('启动天文教学流水线')
        .option('-d, --duration <minutes>', '课程时长（分钟）', '20')
        .option('-t, --timezone <zone>', '时区', 'Asia/Shanghai')
        .option('--dry-run', '模拟运行（不实际执行）')
        .action((pipeline, options) => {
          return astroCommandHandler.start(pipeline, options, config, api.logger);
        });

      astroCmd
        .command('stop')
        .description('停止当前运行的流水线')
        .action(() => {
          return astroCommandHandler.stop(config, api.logger);
        });

      astroCmd
        .command('status')
        .description('查看流水线运行状态')
        .action(() => {
          return astroCommandHandler.status(config, api.logger);
        });

      astroCmd
        .command('list')
        .description('列出所有可用的流水线')
        .action(() => {
          return astroCommandHandler.list(config, api.logger);
        });

      astroCmd
        .command('validate <pipeline>')
        .description('验证流水线配置文件')
        .action((pipeline) => {
          return astroCommandHandler.validate(pipeline, config, api.logger);
        });

      astroCmd
        .command('serial')
        .description('测试串口连接')
        .option('-p, --port <port>', '串口设备')
        .action((options) => {
          return astroCommandHandler.testSerial(options, config, api.logger);
        });
    },
    { commands: ['astro'] }
  );

  // 注册Gateway RPC方法
  api.registerGatewayMethod('astro.status', async ({ respond }) => {
    const status = executorService.getStatus();
    respond(true, status);
  });

  api.registerGatewayMethod('astro.start', async ({ params, respond }) => {
    try {
      const result = await executorService.startPipeline(params.pipeline, params.options);
      respond(true, result);
    } catch (error) {
      respond(false, { error: error.message });
    }
  });

  api.registerGatewayMethod('astro.stop', async ({ respond }) => {
    const result = await executorService.stopCurrent();
    respond(true, result);
  });

  // 注册HTTP路由（可选，用于Web界面控制）
  api.registerHttpRoute({
    path: '/astro/status',
    auth: 'gateway',
    match: 'exact',
    handler: async (req, res) => {
      const status = executorService.getStatus();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(status));
      return true;
    }
  });

  api.registerHttpRoute({
    path: '/astro/start',
    auth: 'gateway',
    match: 'exact',
    handler: async (req, res) => {
      try {
        const body = req.body ? JSON.parse(req.body.toString()) : {};
        const result = await executorService.startPipeline(body.pipeline, body.options);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, result }));
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: error.message }));
      }
      return true;
    }
  });

  // 注册命令处理器（用于Slash命令）
  api.registerCommand({
    name: 'astro',
    description: '天文教学自动化命令',
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx) => {
      const args = ctx.args?.trim().split(/\s+/) || [];

      if (args.length === 0) {
        return {
          text: `天文教学自动化系统

可用命令：
/astro list - 列出所有流水线
/astro start <流水线名> - 启动流水线
/astro stop - 停止当前流水线
/astro status - 查看状态
/astro help - 显示帮助`
        };
      }

      const command = args[0];
      switch (command) {
        case 'list':
          const pipelines = await astroCommandHandler.list(config, api.logger);
          return { text: pipelines };
        case 'start':
          if (!args[1]) {
            return { text: '请指定流水线名称，例如：/astro start lesson-01' };
          }
          const startResult = await astroCommandHandler.start(args[1], {}, config, api.logger);
          return { text: startResult };
        case 'stop':
          const stopResult = await astroCommandHandler.stop(config, api.logger);
          return { text: stopResult };
        case 'status':
          const statusResult = await astroCommandHandler.status(config, api.logger);
          return { text: statusResult };
        default:
          return {
            text: `未知命令: ${command}\n使用 /astro help 查看帮助`
          };
      }
    }
  });

  api.logger.info('[天文教学] 插件已加载');
  api.logger.info(`[天文教学] 配置: 串口=${config.serialPort}, 流水线目录=${config.pipelineDir}`);
}
