# -*- coding: utf-8 -*-
"""
自动化流水线执行器

负责执行天文教学自动化流水线，包括：
- 解析流水线文件
- 按时间调度执行步骤
- 控制硬件设备
- 播放语音解说
- 错误处理和重试
"""

import sys
import os
import time
import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pathlib import Path

# 添加父目录到路径以导入其他模块
sys.path.insert(0, str(Path(__file__).parent.parent))

from pipeline.schema import Pipeline, PipelineStep, ActionType
from astronomy.word_map import CelestialWordMap

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


class PipelineRunner:
    """流水线执行器"""

    def __init__(self, pipeline: Pipeline, word_map: CelestialWordMap = None):
        """
        初始化执行器

        Args:
            pipeline: 流水线对象
            word_map: 天体词语映射表
        """
        self.pipeline = pipeline
        self.word_map = word_map or CelestialWordMap()
        self.start_time: Optional[datetime] = None
        self.current_step_index = 0
        self.completed_steps = 0
        self.failed_steps = 0
        self.is_running = False
        self.is_paused = False

        # 硬件控制器（延迟导入，避免循环依赖）
        self.hardware_controller = None

    def _get_hardware_controller(self):
        """获取硬件控制器实例（延迟加载）"""
        if self.hardware_controller is None:
            try:
                from run_hardware import AstroHardwareController
                self.hardware_controller = AstroHardwareController(
                    serial_port=self.pipeline.config.serial_port
                )
            except ImportError:
                logger.warning("无法导入硬件控制器，使用Mock模式")
                self.hardware_controller = None
        return self.hardware_controller

    def execute(self) -> Dict[str, Any]:
        """
        执行完整的流水线

        Returns:
            执行结果字典
        """
        logger.info(f"🚀 开始执行流水线: {self.pipeline.metadata.name}")
        logger.info(f"   总步骤数: {len(self.pipeline.steps)}")
        logger.info(f"   执行模式: {self.pipeline.config.mode}")

        # 验证流水线
        is_valid, errors = self.pipeline.validate()
        if not is_valid:
            logger.error("❌ 流水线验证失败:")
            for error in errors:
                logger.error(f"   - {error}")
            return {
                "status": "error",
                "msg": "流水线验证失败",
                "errors": errors
            }

        # 初始化硬件
        controller = self._get_hardware_controller()
        if controller:
            logger.info(f"✅ 硬件控制器已初始化")
        else:
            logger.warning("⚠️ 使用Mock模式（无实际硬件）")

        # 开始执行
        self.is_running = True
        self.start_time = datetime.now()

        try:
            for i, step in enumerate(self.pipeline.steps):
                if not self.is_running:
                    logger.info("⏹️ 流水线已停止")
                    break

                self.current_step_index = i
                self._execute_step(step, i + 1, len(self.pipeline.steps))

            # 执行完成
            return self._build_result("success")

        except Exception as e:
            logger.error(f"❌ 流水线执行异常: {e}")
            return self._build_result("error", str(e))

        finally:
            self.is_running = False
            if controller and hasattr(controller, 'cleanup'):
                controller.cleanup()

    def _execute_step(self, step: PipelineStep, step_num: int, total_steps: int):
        """
        执行单个步骤

        Args:
            step: 步骤对象
            step_num: 当前步骤编号
            total_steps: 总步骤数
        """
        # 计算等待时间
        if step_num > 1:
            prev_step = self.pipeline.steps[step_num - 2]
            wait_seconds = self._calculate_wait_time(prev_step.time, step.time)
            if wait_seconds > 0:
                logger.debug(f"⏱️ 等待 {wait_seconds} 秒...")
                time.sleep(wait_seconds)

        # 手动模式需要确认
        if self.pipeline.config.mode == "manual":
            self._await_manual_confirmation(step, step_num, total_steps)

        # 打印步骤信息
        self._print_step_header(step, step_num, total_steps)

        # 执行动作
        retry_count = 0
        max_retries = self.pipeline.config.max_retries if self.pipeline.config.retry_failed else 1

        while retry_count < max_retries:
            try:
                if step.action == ActionType.POINT:
                    self._action_point(step)
                    break
                elif step.action == ActionType.SPEAK:
                    self._action_speak(step)
                    break
                elif step.action == ActionType.POINT_AND_SPEAK:
                    self._action_point_and_speak(step)
                    break
                elif step.action == ActionType.WAIT:
                    self._action_wait(step)
                    break
                elif step.action == ActionType.HOME:
                    self._action_home()
                    break
                else:
                    logger.warning(f"⚠️ 未知动作类型: {step.action}")
                    break

            except Exception as e:
                retry_count += 1
                if retry_count < max_retries:
                    logger.warning(f"⚠️ 步骤执行失败，正在重试 ({retry_count}/{max_retries}): {e}")
                    time.sleep(1)
                else:
                    logger.error(f"❌ 步骤执行失败，已达最大重试次数: {e}")
                    self.failed_steps += 1
                    raise

        self.completed_steps += 1

    def _action_point(self, step: PipelineStep):
        """执行指向动作"""
        controller = self._get_hardware_controller()

        # 解析目标坐标
        target_name = step.target
        coords = self.word_map.get_coordinates(target_name)

        if coords is None:
            raise ValueError(f"无法找到天体坐标: {target_name}")

        logger.info(f"🎯 指向目标: {target_name}")
        logger.info(f"   坐标: RA={coords['ra']:.4f}h, DEC={coords['dec']:.4f}°")

        if controller:
            controller.send_coordinates(coords['ra'], coords['dec'])
        else:
            logger.info(f"   [Mock模式] 将发送坐标到设备")

    def _action_speak(self, step: PipelineStep):
        """执行语音播放动作"""
        controller = self._get_hardware_controller()
        text = step.text

        logger.info(f"🗣️ 播放语音: {text[:50]}...")

        if controller:
            controller.speak_sync(text)
        else:
            logger.info(f"   [Mock模式] 将播放语音: {text}")

    def _action_point_and_speak(self, step: PipelineStep):
        """执行指向并讲解动作（同步）"""
        controller = self._get_hardware_controller()

        # 解析目标坐标
        target_name = step.target
        coords = self.word_map.get_coordinates(target_name)

        if coords is None:
            raise ValueError(f"无法找到天体坐标: {target_name}")

        logger.info(f"🎯 指向目标: {target_name}")
        logger.info(f"   坐标: RA={coords['ra']:.4f}h, DEC={coords['dec']:.4f}°")
        logger.info(f"🗣️ 播放语音: {step.text[:50]}...")

        if controller:
            # 先指向
            controller.send_coordinates(coords['ra'], coords['dec'])
            # 短暂延迟等待设备响应
            time.sleep(self.pipeline.config.step_delay)
            # 再播放语音
            controller.speak_sync(step.text)
        else:
            logger.info(f"   [Mock模式] 将指向目标并播放语音")

    def _action_wait(self, step: PipelineStep):
        """执行等待动作"""
        duration = step.duration or 5
        logger.info(f"⏸️ 等待 {duration} 秒...")
        time.sleep(duration)

    def _action_home(self):
        """执行回到原点动作"""
        controller = self._get_hardware_controller()
        logger.info(f"🏠 回到原点")

        if controller:
            # 可以定义一个原点坐标，或者让设备自己回零
            controller.send_coordinates(0, 0)  # 假设0,0是原点
        else:
            logger.info(f"   [Mock模式] 将回到原点")

    def _calculate_wait_time(self, prev_time: str, curr_time: str) -> float:
        """计算两个时间点之间的等待秒数"""
        def parse_time(t):
            parts = t.split(':')
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            return 0

        prev_seconds = parse_time(prev_time)
        curr_seconds = parse_time(curr_time)
        return max(0, curr_seconds - prev_seconds)

    def _await_manual_confirmation(self, step: PipelineStep, step_num: int, total_steps: int):
        """等待手动确认（手动模式）"""
        print(f"\n{'='*60}")
        print(f"步骤 {step_num}/{total_steps}")
        print(f"动作: {step.action.value}")
        if step.target:
            print(f"目标: {step.target}")
        if step.text:
            print(f"内容: {step.text[:100]}...")
        print(f"{'='*60}")
        print("按 Enter 继续执行...", end='', flush=True)
        input()

    def _print_step_header(self, step: PipelineStep, step_num: int, total_steps: int):
        """打印步骤标题"""
        print()
        print(f"{'─'*60}")
        print(f"📍 步骤 {step_num}/{total_steps} | {step.time}")
        print(f"{'─'*60}")

    def _build_result(self, status: str, error_msg: str = None) -> Dict[str, Any]:
        """构建执行结果"""
        elapsed_time = (datetime.now() - self.start_time).total_seconds() if self.start_time else 0

        result = {
            "status": status,
            "pipeline_name": self.pipeline.metadata.name,
            "total_steps": len(self.pipeline.steps),
            "completed_steps": self.completed_steps,
            "failed_steps": self.failed_steps,
            "elapsed_time": elapsed_time,
            "elapsed_time_formatted": str(timedelta(seconds=int(elapsed_time)))
        }

        if status == "success":
            result["msg"] = (
                f"✅ 流水线执行完成！\n"
                f"完成: {self.completed_steps}/{len(self.pipeline.steps)} 步骤\n"
                f"耗时: {result['elapsed_time_formatted']}"
            )
        else:
            result["msg"] = f"❌ 流水线执行失败: {error_msg}"
            result["error"] = error_msg

        return result

    def stop(self):
        """停止流水线执行"""
        self.is_running = False
        logger.info("⏹️ 已请求停止流水线")

    def pause(self):
        """暂停流水线执行"""
        self.is_paused = True
        logger.info("⏸️ 流水线已暂停")

    def resume(self):
        """恢复流水线执行"""
        self.is_paused = False
        logger.info("▶️ 流水线已恢复")


def run_pipeline_from_file(file_path: str, mode: str = "auto") -> Dict[str, Any]:
    """
    从文件加载并执行流水线

    Args:
        file_path: 流水线文件路径
        mode: 执行模式

    Returns:
        执行结果
    """
    logger.info(f"📂 加载流水线文件: {file_path}")

    # 加载流水线
    try:
        pipeline = Pipeline.from_yaml_file(file_path)
    except Exception as e:
        logger.error(f"❌ 加载流水线失败: {e}")
        return {
            "status": "error",
            "msg": f"加载流水线失败: {e}"
        }

    # 如果指定了模式，覆盖配置中的模式
    if mode:
        pipeline.config.mode = mode

    # 创建执行器并执行
    word_map = CelestialWordMap()
    runner = PipelineRunner(pipeline, word_map)
    return runner.execute()


def main():
    """命令行入口"""
    import argparse

    parser = argparse.ArgumentParser(
        description='AstroGuide 流水线执行器',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 自动执行流水线
  python pipeline/runner.py pipelines/orion.yaml

  # 手动模式执行
  python pipeline/runner.py pipelines/orion.yaml --mode manual

  # 验证流水线但不执行
  python pipeline/runner.py pipelines/orion.yaml --validate-only
        """
    )

    parser.add_argument('pipeline_file', type=str, help='流水线文件路径（YAML格式）')
    parser.add_argument('--mode', type=str, choices=['auto', 'manual'],
                        default='auto', help='执行模式')
    parser.add_argument('--validate-only', action='store_true',
                        help='仅验证流水线，不执行')

    args = parser.parse_args()

    # 加载流水线
    try:
        pipeline = Pipeline.from_yaml_file(args.pipeline_file)
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "msg": f"加载流水线失败: {e}"
        }, ensure_ascii=False))
        sys.exit(1)

    # 验证流水线
    is_valid, errors = pipeline.validate()
    if not is_valid:
        print(json.dumps({
            "status": "error",
            "msg": "流水线验证失败",
            "errors": errors
        }, ensure_ascii=False))
        sys.exit(1)

    if args.validate_only:
        print(json.dumps({
            "status": "success",
            "msg": "流水线验证通过",
            "pipeline": pipeline.to_dict()
        }, ensure_ascii=False, indent=2))
        sys.exit(0)

    # 执行流水线
    if args.mode:
        pipeline.config.mode = args.mode

    word_map = CelestialWordMap()
    runner = PipelineRunner(pipeline, word_map)
    result = runner.execute()

    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(0 if result["status"] == "success" else 1)


if __name__ == "__main__":
    main()
