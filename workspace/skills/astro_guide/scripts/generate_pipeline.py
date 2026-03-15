# -*- coding: utf-8 -*-
"""
流水线生成器

从自然语言描述或结构化数据生成自动化教学流水线
"""

import sys
from pathlib import Path
from typing import List, Dict, Optional, Literal
from datetime import datetime

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from pipeline.schema import (
    Pipeline, PipelineStep, PipelineMetadata, PipelineConfig, ActionType,
    create_quick_pipeline
)
from astronomy.word_map import CelestialWordMap


class PipelineGenerator:
    """流水线生成器"""

    def __init__(self):
        self.word_map = CelestialWordMap()

    def generate_from_topic(
        self,
        title: str,
        topic: str,
        duration: str = "15min",
        detail_level: Literal["basic", "medium", "deep"] = "medium",
        targets: Optional[List[str]] = None
    ) -> Pipeline:
        """
        根据主题生成流水线

        Args:
            title: 课程标题
            topic: 天文主题（如 "猎户座"、"夏季大三角"）
            duration: 课程时长
            detail_level: 详细程度
            targets: 指定目标列表（可选）

        Returns:
            Pipeline对象
        """
        # 如果没有指定目标，自动推断
        if targets is None:
            targets = self._infer_targets(topic)

        # 生成每个目标的解说词
        steps_data = []
        for target in targets:
            text = self._generate_explanation(target, detail_level)
            steps_data.append({"name": target, "text": text})

        # 创建流水线
        pipeline = create_quick_pipeline(title, steps_data)

        # 更新元数据
        pipeline.metadata.duration_estimate = duration
        pipeline.metadata.difficulty = detail_level

        # 根据详细程度调整每个步骤的时间
        time_per_step = self._get_time_per_step(duration, len(targets), detail_level)
        self._adjust_step_times(pipeline, time_per_step)

        return pipeline

    def generate_from_script(
        self,
        title: str,
        script: List[Dict[str, str]],
        config: Optional[PipelineConfig] = None
    ) -> Pipeline:
        """
        从剧本生成流水线

        Args:
            title: 课程标题
            script: 剧本列表，每项包含 {target, text, optional_time}
            config: 流水线配置

        Returns:
            Pipeline对象
        """
        steps = []
        time_offset = 0

        for i, item in enumerate(script):
            # 确定时间
            if "time" in item:
                time_str = item["time"]
            else:
                # 默认每步90秒
                minutes = time_offset // 60
                seconds = time_offset % 60
                time_str = f"{minutes:02d}:{seconds:02d}"
                time_offset += 90

            # 验证目标
            target = item.get("target")
            if not target:
                raise ValueError(f"剧本第{i+1}项缺少target字段")

            coords = self.word_map.get_coordinates(target)
            if not coords:
                print(f"⚠️ 警告: 未找到天体 '{target}'，将使用原始名称")

            step = PipelineStep(
                time=time_str,
                action=ActionType.POINT_AND_SPEAK,
                target=target,
                text=item.get("text", f"观测{target}"),
                duration=item.get("duration")
            )
            steps.append(step)

        metadata = PipelineMetadata(name=title)
        return Pipeline(metadata=metadata, steps=steps, config=config or PipelineConfig())

    def _infer_targets(self, topic: str) -> List[str]:
        """
        从主题推断观测目标

        Args:
            topic: 主题字符串

        Returns:
            目标列表
        """
        # 主题映射表
        topic_mappings = {
            "猎户座": [
                "猎户座_参宿四",
                "猎户座_参宿七",
                "猎户座_M42",
                "猎户座_参宿一",
                "猎户座_参宿五",
            ],
            "双子座": [
                "双子座_北河三",
                "双子座_北河二",
                "双子座_M35",
            ],
            "大熊座": [
                "大熊座_天枢",
                "大熊座_天璇",
                "大熊座_玉衡",
                "大熊座_M81",
            ],
            "夏季大三角": [
                "天琴座_织女星",
                "天鹰座_牛郎星",
                "天鹅座_天津四",
            ],
            "冬季大三角": [
                "大犬座_天狼星",
                "小犬座_南河三",
                "猎户座_参宿四",
            ],
            "春季大三角": [
                "狮子座_轩辕十四",
                "室女座_角宿一",
                "牧夫座_大角星",
            ],
            "秋季四边形": [
                "飞马座_室宿一",
                "飞马座_室宿二",
                "仙女座_壁宿一",
                "飞马座_壁宿二",
            ],
        }

        # 直接匹配
        if topic in topic_mappings:
            return topic_mappings[topic]

        # 尝试作为星座名
        coords = self.word_map.get_coordinates(topic)
        if coords:
            # 是一个星座，返回其亮星
            constellation = topic.replace("座", "")
            return self._get_bright_stars_for_constellation(constellation)

        # 默认返回常见目标
        return ["猎户座_参宿四", "大熊座_天枢", "天琴座_织女星"]

    def _get_bright_stars_for_constellation(self, constellation: str) -> List[str]:
        """获取星座的亮星"""
        # 简化实现，返回常见的亮星
        bright_stars_map = {
            "猎户": ["猎户座_参宿四", "猎户座_参宿七", "猎户座_M42"],
            "双子": ["双子座_北河三", "双子座_北河二"],
            "大熊": ["大熊座_天枢", "大熊座_天璇", "大熊座_玉衡"],
            "天鹅": ["天鹅座_天津四"],
            "天琴": ["天琴座_织女星"],
            "天鹰": ["天鹰座_牛郎星"],
        }

        key = constellation.replace("座", "")
        return bright_stars_map.get(key, [f"{constellation}座_主星"])

    def _generate_explanation(self, target: str, detail_level: str) -> str:
        """
        为目标生成解说词

        Args:
            target: 目标名称
            detail_level: 详细程度

        Returns:
            解说词文本
        """
        # 解析目标
        if "_" in target:
            constellation, object_name = target.split('_', 1)
        else:
            constellation = ""
            object_name = target

        # 基础解说词模板
        base_templates = {
            "参宿四": "这是一颗红超巨星，距离地球约640光年。它的直径是太阳的1000倍以上。",
            "参宿七": "这是一颗蓝超巨星，亮度约为太阳的12万倍，距离地球约860光年。",
            "织女星": "这是全天第五亮星，距离地球约25光年，是夏季大三角的一员。",
            "牛郎星": "与织女星隔银河相望，距离地球约17光年。",
            "天狼星": "这是全天最亮的恒星，距离地球约8.6光年。",
            "北河三": "双子座最亮的恒星，是一颗橙巨星，距离地球约34光年。",
            "北河二": "实际上是一个六合星系统，距离地球约51光年。",
            "M42": "猎户座大星云，是全天最明亮的 diffuse 星云，距离地球约1344光年。",
            "M31": "仙女座星系，是本星系群中最大的星系，也是肉眼可见的最远天体之一。",
            "M45": "昴星团，又称七姐妹星团，距离地球约444光年，包含超过1000颗恒星。",
        }

        # 检查是否有预设模板
        for key, template in base_templates.items():
            if key in object_name:
                if detail_level == "deep":
                    return template + " 让我们仔细观测它的细节特征。"
                elif detail_level == "basic":
                    return template[:50] + "..."
                else:
                    return template

        # 通用模板
        if "M" in object_name or "NGC" in object_name:
            return f"这是一个深空天体，{object_name}。让我们仔细观测它。"
        else:
            return f"现在让我们观测{object_name}。这是一颗非常有趣的天体。"

    def _get_time_per_step(self, duration: str, num_steps: int, detail_level: str) -> int:
        """计算每个步骤的时间（秒）"""
        # 解析时长
        if "min" in duration:
            total_minutes = int(duration.replace("min", "").replace(" ", ""))
        elif "h" in duration:
            total_minutes = int(duration.replace("h", "").replace(" ", "")) * 60
        else:
            total_minutes = 15

        # 根据详细程度调整
        detail_multiplier = {"basic": 0.7, "medium": 1.0, "deep": 1.5}
        effective_minutes = total_minutes * detail_multiplier.get(detail_level, 1.0)

        return int((effective_minutes * 60) / num_steps)

    def _adjust_step_times(self, pipeline: Pipeline, time_per_step: int):
        """调整步骤时间"""
        time_offset = 0
        for step in pipeline.steps:
            minutes = time_offset // 60
            seconds = time_offset % 60
            step.time = f"{minutes:02d}:{seconds:02d}"
            time_offset += time_per_step


def create_constellation_course(
    constellation: str,
    detail_level: str = "medium"
) -> Pipeline:
    """
    快速创建星座课程流水线

    Args:
        constellation: 星座名称
        detail_level: 详细程度

    Returns:
        Pipeline对象
    """
    generator = PipelineGenerator()
    return generator.generate_from_topic(
        title=f"{constellation}观测课程",
        topic=constellation,
        detail_level=detail_level
    )


def main():
    """命令行入口"""
    import argparse
    import json

    parser = argparse.ArgumentParser(
        description='AstroGuide 流水线生成器',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 从主题生成
  python scripts/generate_pipeline.py --topic "猎户座" --output pipelines/orion.yaml

  # 指定详细程度
  python scripts/generate_pipeline.py --topic "双子座" --detail deep

  # 从剧本文件生成
  python scripts/generate_pipeline.py --script scripts/example_script.json --output my_course.yaml
        """
    )

    parser.add_argument('--topic', type=str, help='天文主题（星座/天体）')
    parser.add_argument('--script', type=str, help='剧本JSON文件路径')
    parser.add_argument('--title', type=str, help='课程标题')
    parser.add_argument('--duration', type=str, default='15min', help='课程时长')
    parser.add_argument('--detail', type=str, choices=['basic', 'medium', 'deep'],
                        default='medium', help='详细程度')
    parser.add_argument('--output', type=str, help='输出文件路径（YAML格式）')
    parser.add_argument('--print', action='store_true', help='打印到标准输出')

    args = parser.parse_args()

    generator = PipelineGenerator()

    # 生成流水线
    if args.topic:
        title = args.title or f"{args.topic}观测课程"
        pipeline = generator.generate_from_topic(
            title=title,
            topic=args.topic,
            duration=args.duration,
            detail_level=args.detail
        )
    elif args.script:
        with open(args.script, 'r', encoding='utf-8') as f:
            script_data = json.load(f)
        title = args.title or "自定义课程"
        pipeline = generator.generate_from_script(title, script_data)
    else:
        parser.error("必须指定 --topic 或 --script")

    # 输出结果
    yaml_content = pipeline.to_yaml()

    if args.print:
        print(yaml_content)
    elif args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(yaml_content)
        print(f"✅ 流水线已生成: {output_path}")
        print(f"   名称: {pipeline.metadata.name}")
        print(f"   步骤数: {len(pipeline.steps)}")
    else:
        print(yaml_content)


if __name__ == "__main__":
    main()
