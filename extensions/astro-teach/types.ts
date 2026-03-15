/**
 * 类型定义
 */

// 流水线动作类型
export type PipelineActionType =
  | 'serial'      // 串口指令
  | 'audio'       // 播放音频
  | 'laser'       // 激光控制
  | 'wait'        // 等待
  | 'parallel'    // 并行执行
  | 'conditional'; // 条件执行

// 天体坐标
export interface CelestialCoordinates {
  rightAscension?: number; // 赤经（小时）
  declination?: number;    // 赤纬（度）
  azimuth?: number;        // 方位角（度）
  altitude?: number;       // 高度角（度）
  hourAngle?: number;      // 时角（度）
}

// 天体信息
export interface CelestialObject {
  name: string;           // 中文名
  englishName: string;    // 英文名
  designation?: string;   // 编号（如 α CMa）
  type: 'star' | 'planet' | 'constellation' | 'nebula' | 'galaxy' | 'cluster';
  coordinates?: CelestialCoordinates;
  magnitude?: number;     // 视星等
  description?: string;
}

// 串口指令
export interface SerialCommand {
  type: 'move' | 'home' | 'park' | 'track' | 'stop' | 'laser_on' | 'laser_off';
  target?: {
    azimuth?: number;
    altitude?: number;
    ra?: number;
    dec?: number;
    objectName?: string;
  };
  duration?: number;      // 毫秒
}

// 流水线步骤
export interface PipelineStep {
  time: number;           // 执行时间（秒，从流水线开始计算）
  action: PipelineAction | SerialAction | AudioAction | LaserAction | WaitAction | ParallelAction;
  description?: string;   // 步骤描述
  enabled?: boolean;      // 是否启用（默认true）
  content?: string;       // 预生成的内容（用于TTS播放）
}

// 串口动作
export interface SerialAction {
  type: 'serial';
  command: string;        // 指令类型
  params?: any;           // 指令参数
  retryOnFail?: boolean;  // 失败重试
  timeout?: number;       // 超时时间（毫秒）
}

// 音频动作
export interface AudioAction {
  type: 'audio';
  file: string;           // 音频文件路径
  volume?: number;        // 音量（0-100）
  loop?: boolean;         // 是否循环
  wait?: boolean;         // 是否等待播放完成
}

// 激光动作
export interface LaserAction {
  type: 'laser';
  enabled: boolean;       // 开/关
  duration?: number;      // 持续时间（毫秒）
}

// 等待动作
export interface WaitAction {
  type: 'wait';
  duration: number;       // 等待时间（毫秒）
}

// 并行动作
export interface ParallelAction {
  type: 'parallel';
  actions: PipelineAction[]; // 并行执行的动作列表
}

// 流水线动作联合类型
export type PipelineAction = SerialAction | AudioAction | LaserAction | WaitAction | ParallelAction;

// 流水线配置
export interface PipelineConfig {
  name: string;           // 流水线名称
  description?: string;   // 描述
  version?: string;       // 版本
  author?: string;        // 作者
  duration: number;       // 总时长（分钟）
  timezone?: string;      // 时区
  steps: PipelineStep[];  // 步骤列表
  metadata?: {            // 元数据
    subject?: string;     // 学科
    grade?: string;       // 年级
    difficulty?: 'easy' | 'medium' | 'hard'; // 难度
    tags?: string[];      // 标签
  };
}

// 流水线执行状态
export interface PipelineExecutionStatus {
  pipelineName: string;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'error';
  currentStep?: number;
  progress: number;       // 0-100
  startTime?: number;
  endTime?: number;
  elapsed?: number;       // 已用时间（秒）
  remaining?: number;     // 剩余时间（秒）
  error?: string;
}

// 工具执行结果
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}
