# -*- coding: utf-8 -*-
"""
自动化流水线数据结构定义

定义天文教学自动化流水线的数据格式和验证规则
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Literal, Union
from enum import Enum
import json
import yaml
from datetime import datetime, timedelta


class ActionType(Enum):
    """流水线动作类型"""
    POINT = "point"       # 指向天体
    SPEAK = "speak"       # 播放语音
    WAIT = "wait"         # 等待
    POINT_AND_SPEAK = "point_and_speak"  # 指向并讲解（同步）
    HOME = "home"         # 回到原点
    TRACK = "track"       # 跟踪天体


@dataclass
class PipelineStep:
    """流水线步骤"""
    time: str                      # 时间点，格式 "MM:SS" 或 "HH:MM:SS"
    action: ActionType             # 动作类型
    target: Optional[str] = None   # 目标天体名称（point动作需要）
    text: Optional[str] = None     # 解说词或提示文本
    duration: Optional[float] = None  # 动作持续时间（秒）

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "time": self.time,
            "action": self.action.value,
            "target": self.target,
            "text": self.text,
            "duration": self.duration
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'PipelineStep':
        """从字典创建"""
        return cls(
            time=data["time"],
            action=ActionType(data["action"]),
            target=data.get("target"),
            text=data.get("text"),
            duration=data.get("duration")
        )


@dataclass
class PipelineMetadata:
    """流水线元数据"""
    name: str                      # 流水线名称
    description: str = ""          # 描述
    author: str = "AstroGuide"     # 作者
    version: str = "1.0"           # 版本
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    duration_estimate: Optional[str] = None  # 预计时长 "15min"
    difficulty: str = "medium"     # 难度: basic/medium/advanced
    target_audience: str = "general"  # 目标受众
    tags: List[str] = field(default_factory=list)  # 标签
    requirements: Dict[str, bool] = field(default_factory=dict)  # 硬件需求


@dataclass
class PipelineConfig:
    """流水线配置"""
    mode: Literal["auto", "manual"] = "auto"  # 执行模式
    serial_port: Optional[str] = None         # 串口配置
    tts_engine: str = "edge"                  # TTS引擎
    step_delay: float = 0.5                    # 步骤间延迟
    retry_failed: bool = True                  # 失败重试
    max_retries: int = 3                       # 最大重试次数
    mock_mode: bool = False                    # 强制Mock模式


@dataclass
class Pipeline:
    """完整的自动化流水线"""
    metadata: PipelineMetadata
    steps: List[PipelineStep]
    config: PipelineConfig = field(default_factory=PipelineConfig)

    def to_dict(self) -> dict:
        """转换为字典（用于序列化）"""
        return {
            "metadata": {
                "name": self.metadata.name,
                "description": self.metadata.description,
                "author": self.metadata.author,
                "version": self.metadata.version,
                "created_at": self.metadata.created_at,
                "duration_estimate": self.metadata.duration_estimate,
                "difficulty": self.metadata.difficulty,
                "target_audience": self.metadata.target_audience,
                "tags": self.metadata.tags,
                "requirements": self.metadata.requirements
            },
            "steps": [step.to_dict() for step in self.steps],
            "config": {
                "mode": self.config.mode,
                "serial_port": self.config.serial_port,
                "tts_engine": self.config.tts_engine,
                "step_delay": self.config.step_delay,
                "retry_failed": self.config.retry_failed,
                "max_retries": self.config.max_retries,
                "mock_mode": self.config.mock_mode
            }
        }

    def to_yaml(self) -> str:
        """转换为YAML格式"""
        return yaml.dump(self.to_dict(), allow_unicode=True, default_flow_style=False)

    def to_json(self) -> str:
        """转换为JSON格式"""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)

    @classmethod
    def from_dict(cls, data: dict) -> 'Pipeline':
        """从字典创建"""
        metadata = PipelineMetadata(**data.get("metadata", {}))
        steps = [PipelineStep.from_dict(s) for s in data.get("steps", [])]

        config_data = data.get("config", {})
        config = PipelineConfig(
            mode=config_data.get("mode", "auto"),
            serial_port=config_data.get("serial_port"),
            tts_engine=config_data.get("tts_engine", "edge"),
            step_delay=config_data.get("step_delay", 0.5),
            retry_failed=config_data.get("retry_failed", True),
            max_retries=config_data.get("max_retries", 3),
            mock_mode=config_data.get("mock_mode", False)
        )

        return cls(metadata=metadata, steps=steps, config=config)

    @classmethod
    def from_yaml(cls, yaml_str: str) -> 'Pipeline':
        """从YAML字符串创建"""
        data = yaml.safe_load(yaml_str)
        return cls.from_dict(data)

    @classmethod
    def from_yaml_file(cls, file_path: str) -> 'Pipeline':
        """从YAML文件创建"""
        with open(file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        return cls.from_dict(data)

    def validate(self) -> tuple[bool, List[str]]:
        """验证流水线有效性"""
        errors = []

        # 检查基本字段
        if not self.metadata.name:
            errors.append("流水线名称不能为空")

        if not self.steps:
            errors.append("流水线至少需要一个步骤")
            return False, errors

        # 检查时间格式和顺序
        prev_seconds = -1
        for i, step in enumerate(self.steps):
            try:
                seconds = self._parse_time(step.time)
                if seconds < prev_seconds:
                    errors.append(f"步骤{i+1}的时间顺序错误: {step.time}")
                prev_seconds = seconds
            except ValueError as e:
                errors.append(f"步骤{i+1}的时间格式错误: {step.time} - {e}")

            # 检查动作类型与必需字段
            if step.action in [ActionType.POINT, ActionType.POINT_AND_SPEAK] and not step.target:
                errors.append(f"步骤{i+1}({step.action.value})需要指定target")

            if step.action in [ActionType.SPEAK, ActionType.POINT_AND_SPEAK] and not step.text:
                errors.append(f"步骤{i+1}({step.action.value})需要指定text")

        return len(errors) == 0, errors

    def _parse_time(self, time_str: str) -> int:
        """解析时间字符串为秒数"""
        parts = time_str.split(':')
        if len(parts) == 2:
            minutes, seconds = map(int, parts)
            return minutes * 60 + seconds
        elif len(parts) == 3:
            hours, minutes, seconds = map(int, parts)
            return hours * 3600 + minutes * 60 + seconds
        else:
            raise ValueError(f"无效的时间格式: {time_str}")

    def get_total_duration(self) -> int:
        """获取流水线总时长（秒）"""
        if not self.steps:
            return 0
        return self._parse_time(self.steps[-1].time)

    def get_step_at_time(self, time_str: str) -> Optional[PipelineStep]:
        """获取指定时间点的步骤"""
        target_seconds = self._parse_time(time_str)
        for step in self.steps:
            if self._parse_time(step.time) == target_seconds:
                return step
        return None


# 便捷函数
def create_quick_pipeline(name: str, targets: List[Dict[str, str]]) -> Pipeline:
    """
    快速创建流水线

    Args:
        name: 流水线名称
        targets: 目标列表，每项包含 {name: "天体名", text: "解说词"}

    Returns:
        Pipeline对象

    Example:
        >>> pipeline = create_quick_pipeline("猎户座观测", [
        ...     {"name": "猎户座_参宿四", "text": "这是猎户座最亮的恒星..."},
        ...     {"name": "猎户座_M42", "text": "这是著名的猎户座大星云..."}
        ... ])
    """
    steps = []
    time_offset = 0

    for i, target in enumerate(targets):
        # 每个步骤给90秒时间
        minutes = time_offset // 60
        seconds = time_offset % 60
        time_str = f"{minutes:02d}:{seconds:02d}"

        steps.append(PipelineStep(
            time=time_str,
            action=ActionType.POINT_AND_SPEAK,
            target=target["name"],
            text=target["text"]
        ))

        time_offset += 90  # 每个目标90秒

    metadata = PipelineMetadata(
        name=name,
        duration_estimate=f"{time_offset//60}min"
    )

    return Pipeline(metadata=metadata, steps=steps)


if __name__ == "__main__":
    # 测试代码
    pipeline = create_quick_pipeline("猎户座快速观测", [
        {"name": "猎户座_参宿四", "text": "参宿四是一颗红超巨星"},
        {"name": "猎户座_参宿七", "text": "参宿七是一颗蓝超巨星"}
    ])

    print(pipeline.to_yaml())
    print("\n验证结果:", pipeline.validate())
