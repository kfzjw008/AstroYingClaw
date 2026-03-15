/**
 * 流水线执行服务（重写版）
 * 执行预生成内容的流水线：TTS朗读 + 串口控制 + 状态显示
 */

import type { Logger } from 'openclaw/plugin-sdk/core';
import type { AstroConfig } from '../config';
import type { PipelineConfig, PipelineExecutionStatus, PipelineStep } from '../types';
import { SerialControlTool } from '../tools/serial_control';
import { AudioPlayTool } from '../tools/audio_play';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

interface ScheduledStep {
  step: PipelineStep;
  timeoutId: NodeJS.Timeout;
  executed: boolean;
}

interface ExecutionState {
  currentStep: number;
  currentContent: string;
  serialConnected: boolean;
  serialAction: string;
  mockMode: boolean;
}

export class PipelineExecutorService {
  private logger: Logger;
  private config: AstroConfig;
  private currentPipeline: PipelineConfig | null = null;
  private status: PipelineExecutionStatus = {
    pipelineName: '',
    status: 'idle',
    progress: 0
  };
  private scheduledSteps: Map<number, ScheduledStep> = new Map();
  private startTime: number = 0;
  private serialTool: SerialControlTool;
  private audioTool: AudioPlayTool;
  private isRunning: boolean = false;
  private executionState: ExecutionState = {
    currentStep: -1,
    currentContent: '',
    serialConnected: false,
    serialAction: '',
    mockMode: false
  };

  constructor(logger: Logger, config: AstroConfig) {
    this.logger = logger;
    this.config = config;
    this.serialTool = new SerialControlTool(logger, config);
    this.audioTool = new AudioPlayTool(logger, config);
  }

  async start(): Promise<void> {
    this.logger.info('[执行器] 流水线执行服务启动');
    await this.serialTool.connect();
  }

  async stop(): Promise<void> {
    this.logger.info('[执行器] 流水线执行服务停止');
    await this.stopCurrent();
    this.serialTool.disconnect();
  }

  /**
   * 启动流水线执行
   */
  async startPipeline(pipeline: PipelineConfig, options: any = {}): Promise<{ success: boolean; error?: string }> {
    if (this.isRunning) {
      return { success: false, error: '已有流水线正在运行' };
    }

    try {
      // 检查是否包含预生成内容
      const hasContent = this.validatePipelineContent(pipeline);
      if (!hasContent && !options.dryRun) {
        this.logger.warn('[执行器] ⚠️ 流水线不包含预生成内容，建议先运行内容生成');
      }

      this.currentPipeline = pipeline;
      this.isRunning = true;
      this.startTime = Date.now();
      this.executionState.mockMode = options.mockMode || options.dryRun || false;

      this.status = {
        pipelineName: pipeline.name,
        status: 'running',
        progress: 0,
        startTime: this.startTime
      };

      this.logger.info(`[执行器] 🚀 启动流水线: ${pipeline.name} (${pipeline.duration}分钟)`);
      this.logger.info(`[执行器] 📋 共 ${pipeline.steps.length} 个步骤`);

      // 连接串口（非mock模式）
      if (!this.executionState.mockMode) {
        const connected = await this.serialTool.connect();
        this.executionState.serialConnected = connected;

        if (!connected) {
          this.logger.warn('[执行器] ⚠️ 串口未连接，将显示模拟状态');
          this.executionState.mockMode = true;
        }
      } else {
        this.logger.info('[执行器] 📝 模拟模式：不会实际执行串口指令');
      }

      // 调度所有步骤
      const totalDuration = pipeline.duration * 60 * 1000;

      for (const step of pipeline.steps) {
        if (!step.enabled) continue;

        const delay = step.time * 1000;

        const timeoutId = setTimeout(async () => {
          await this.executeStep(step, options);
        }, delay);

        this.scheduledSteps.set(step.time, {
          step,
          timeoutId,
          executed: false
        });

        this.logger.debug(`[执行器] ⏰ 已调度步骤: ${step.description} @ ${step.time}s`);
      }

      // 设置完成定时器
      setTimeout(async () => {
        await this.completePipeline();
      }, totalDuration);

      // 启动进度更新
      this.startProgressUpdate(totalDuration);

      return { success: true };
    } catch (error) {
      this.logger.error(`[执行器] ❌ 启动流水线失败: ${error.message}`);
      await this.stopCurrent();
      return { success: false, error: error.message };
    }
  }

  /**
   * 验证流水线是否包含预生成内容
   */
  private validatePipelineContent(pipeline: PipelineConfig): boolean {
    for (const step of pipeline.steps) {
      if (step.enabled && step.content) {
        return true;
      }
    }
    return false;
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(step: PipelineStep, options: any): Promise<void> {
    try {
      this.executionState.currentStep = this.scheduledSteps.size;
      this.logger.info(`\n${'='.repeat(70)}`);
      this.logger.info(`[步骤 ${this.executionState.currentStep + 1}/${this.currentPipeline?.steps.length}] ${step.description}`);
      this.logger.info(`{'='.repeat(70)}`);

      this.status.currentStep = step.time;
      const action = step.action || {};
      const dryRun = options.dryRun || this.executionState.mockMode;

      // 显示步骤内容
      if (step.content) {
        this.executionState.currentContent = step.content;
        this.displayContent(step.content, step.description);

        // 朗读内容（TTS）
        this.logger.info(`🎙️ [音频] 开始朗读内容...`);
        const ttsResult = await this.audioTool.textToSpeech(step.content, {});
        if (ttsResult.success) {
          this.logger.info(`🎙️ [音频] ✅ 朗读完成`);
        } else {
          this.logger.error(`🎙️ [音频] ❌ 朗读失败: ${ttsResult.error}`);
        }
      }

      // 执行动作
      if (action.type === 'serial') {
        await this.executeSerialAction(action, dryRun);
      } else if (action.type === 'audio') {
        await this.executeAudioAction(action);
      } else if (action.type === 'wait') {
        await this.executeWaitAction(action);
      }

      // 标记为已执行
      const scheduled = this.scheduledSteps.get(step.time);
      if (scheduled) {
        scheduled.executed = true;
      }

    } catch (error) {
      this.logger.error(`[执行器] ❌ 执行步骤失败: ${error.message}`);
      this.status.status = 'error';
      this.status.error = error.message;
    }
  }

  /**
   * 显示内容（课件展示）
   */
  private displayContent(content: string, title: string): void {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📺 【课件内容】${title}`);
    console.log(`${'='.repeat(70)}`);
    console.log(content);
    console.log(`${'='.repeat(70)}`);
    this.logger.info(`📺 [课件] ${title}: ${content.substring(0, 50)}...`);
  }

  /**
   * 执行串口动作
   */
  private async executeSerialAction(action: any, mockMode: boolean): Promise<void> {
    const command = action.command?.toUpperCase() || action.type;

    this.executionState.serialAction = command;

    if (mockMode) {
      // 模拟模式：显示将要执行的指令
      this.displayMockSerialAction(action);
      return;
    }

    // 实际执行
    try {
      switch (command) {
        case 'MOVE':
        case 'MOVE_TO':
          const target = action.params?.objectName;
          const azimuth = action.params?.azimuth;
          const altitude = action.params?.altitude;

          if (target) {
            await this.serialTool.moveToObject(target);
            this.logger.info(`🎯 [串口] ✅ 已发送指令: 移动到 ${target}`);
          } else if (azimuth !== undefined && altitude !== undefined) {
            await this.serialTool.moveToCoordinates({ azimuth, altitude });
            this.logger.info(`🎯 [串口] ✅ 已发送指令: 移动到方位角${azimuth}°, 高度角${altitude}°`);
          }
          break;

        case 'HOME':
          await this.serialTool.home();
          this.logger.info(`🏠 [串口] ✅ 归位`);
          break;

        case 'PARK':
          await this.serialTool.park();
          this.logger.info(`🅿️ [串口] ✅ 停放`);
          break;

        case 'LASER_ON':
          await this.serialTool.setLaser(true, action.duration);
          this.logger.info(`🔦 [串口] ✅ 激光开启`);
          break;

        case 'LASER_OFF':
          await this.serialTool.setLaser(false);
          this.logger.info(`🔦 [串口] ✅ 激光关闭`);
          break;

        default:
          this.logger.warn(`[执行器] ⚠️ 未知指令: ${command}`);
      }
    } catch (error) {
      this.logger.error(`🎯 [串口] ❌ 指令失败: ${error.message}`);
      this.displayMockSerialAction(action, true);
    }
  }

  /**
   * 显示模拟串口动作
   */
  private displayMockSerialAction(action: any, failed: boolean = false): void {
    const command = action.command || action.type;
    const params = action.params || {};

    console.log(`\n${'─'.repeat(70)}`);
    if (failed) {
      console.log(`🎯 [串口模拟] ❌ 实际执行失败，模拟执行: ${command}`);
    } else {
      console.log(`🎯 [串口模拟] 📝 模拟执行: ${command}`);
    }
    console.log(`${'─'.repeat(70)}`);

    if (params.objectName) {
      console.log(`   目标天体: ${params.objectName}`);
    }
    if (params.azimuth !== undefined) {
      console.log(`   方位角: ${params.azimuth}°`);
    }
    if (params.altitude !== undefined) {
      console.log(`   高度角: ${params.altitude}°`);
    }

    console.log(`   状态: ${failed ? '❌ 串口未响应，使用模拟' : '✅ 模拟成功'}`);
    console.log(`${'─'.repeat(70)}\n`);
  }

  /**
   * 执行音频动作（TTS播放内容）
   */
  private async executeAudioAction(action: any): Promise<void> {
    // 播放当前步骤的内容
    if (this.executionState.currentContent) {
      this.logger.info(`🎙️ [音频] 开始播放内容...`);

      const result = await this.audioTool.textToSpeech(
        this.executionState.currentContent,
        action.options || {}
      );

      if (result.success) {
        this.logger.info(`🎙️ [音频] ✅ 播放完成`);
      } else {
        this.logger.error(`🎙️ [音频] ❌ 播放失败: ${result.error}`);
      }
    } else if (action.file) {
      // 播放指定文件
      await this.audioTool.play(action.file, action.options || {});
    }
  }

  /**
   * 执行等待动作
   */
  private async executeWaitAction(action: any): Promise<void> {
    const duration = action.duration || 1000;
    this.logger.info(`⏳ [等待] ${duration}ms`);
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * 完成流水线
   */
  private async completePipeline(): Promise<void> {
    this.logger.info(`\n${'='.repeat(70)}`);
    this.logger.info(`✅ 流水线执行完成: ${this.currentPipeline?.name}`);
    this.logger.info(`${'='.repeat(70)}\n`);

    // 清理定时器
    for (const scheduled of this.scheduledSteps.values()) {
      clearTimeout(scheduled.timeoutId);
    }
    this.scheduledSteps.clear();

    // 停止音频
    this.audioTool.stop();

    // 归位
    if (!this.executionState.mockMode && this.executionState.serialConnected) {
      try {
        await this.serialTool.park();
      } catch (error) {
        this.logger.warn(`[执行器] ⚠️ 归位失败: ${error.message}`);
      }
    }

    this.status.status = 'completed';
    this.status.progress = 100;
    this.status.endTime = Date.now();
    this.isRunning = false;

    // 显示总结
    this.displayExecutionSummary();
  }

  /**
   * 显示执行总结
   */
  private displayExecutionSummary(): void {
    const elapsed = Date.now() - this.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 【执行总结】`);
    console.log(`${'='.repeat(70)}`);
    console.log(`   流水线名称: ${this.currentPipeline?.name}`);
    console.log(`   执行模式: ${this.executionState.mockMode ? '模拟' : '实际'}`);
    console.log(`   执行时长: ${minutes}分${seconds}秒`);
    console.log(`   串口状态: ${this.executionState.serialConnected ? '✅ 已连接' : '❌ 未连接'}`);
    console.log(`   执行步骤: ${this.currentPipeline?.steps.length}个`);
    console.log(`${'='.repeat(70)}\n`);
  }

  /**
   * 停止当前流水线
   */
  async stopCurrent(): Promise<{ success: boolean; error?: string }> {
    if (!this.isRunning) {
      return { success: false, error: '没有运行的流水线' };
    }

    this.logger.info('[执行器] 🛑 停止当前流水线');

    for (const scheduled of this.scheduledSteps.values()) {
      clearTimeout(scheduled.timeoutId);
    }
    this.scheduledSteps.clear();

    this.audioTool.stop();

    try {
      await this.serialTool.stop();
    } catch (error) {
      this.logger.warn(`[执行器] ⚠️ 停止设备失败: ${error.message}`);
    }

    this.status.status = 'stopped';
    this.isRunning = false;
    this.currentPipeline = null;

    return { success: true };
  }

  /**
   * 启动进度更新
   */
  private startProgressUpdate(totalDuration: number): void {
    const updateInterval = 1000;

    const interval = setInterval(() => {
      if (this.status.status === 'stopped' || this.status.status === 'completed') {
        clearInterval(interval);
        return;
      }

      const elapsed = Date.now() - this.startTime;
      this.status.elapsed = Math.floor(elapsed / 1000);
      this.status.remaining = Math.floor((totalDuration - elapsed) / 1000);
      this.status.progress = Math.min(100, Math.floor((elapsed / totalDuration) * 100));
    }, updateInterval);
  }

  async pause(): Promise<{ success: boolean; error?: string }> {
    if (!this.isRunning || this.status.status !== 'running') {
      return { success: false, error: '没有运行的流水线' };
    }

    this.logger.info('[执行器] 暂停流水线');

    for (const [time, scheduled] of this.scheduledSteps) {
      if (!scheduled.executed) {
        clearTimeout(scheduled.timeoutId);
      }
    }

    this.status.status = 'paused';
    return { success: true };
  }

  async resume(): Promise<{ success: boolean; error?: string }> {
    if (this.status.status !== 'paused') {
      return { success: false, error: '没有暂停的流水线' };
    }

    this.logger.info('[执行器] 恢复流水线');

    const elapsed = Date.now() - this.startTime;

    for (const [time, scheduled] of this.scheduledSteps) {
      if (!scheduled.executed) {
        const delay = Math.max(0, time * 1000 - elapsed);
        const timeoutId = setTimeout(async () => {
          await this.executeStep(scheduled.step, {});
        }, delay);
        scheduled.timeoutId = timeoutId;
      }
    }

    this.status.status = 'running';
    return { success: true };
  }

  getStatus(): PipelineExecutionStatus {
    return { ...this.status };
  }

  getCurrentPipeline(): PipelineConfig | null {
    return this.currentPipeline;
  }

  isPipelineRunning(): boolean {
    return this.isRunning;
  }
}
