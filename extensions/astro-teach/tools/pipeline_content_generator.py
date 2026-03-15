# -*- coding: utf-8 -*-
"""
流水线增强工具
在验证/生成流水线时，调用LLM预生成所有讲解内容
"""

import json
import yaml
from typing import Dict, Any, List
from datetime import datetime

# 导入OpenAI API（或其他LLM）
try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    print("警告: openai未安装，将使用模板内容")


class PipelineContentGenerator:
    """流水线内容生成器"""

    def __init__(self, api_key: str = None, api_base: str = None):
        """
        初始化生成器

        Args:
            api_key: OpenAI API密钥
            api_base: API基础URL
        """
        self.api_key = api_key
        self.api_base = api_base

    def generate_pipeline_content(self, pipeline: Dict[str, Any]) -> Dict[str, Any]:
        """
        为流水线的所有步骤生成讲解内容

        Args:
            pipeline: 流水线配置字典

        Returns:
            增强后的流水线配置（包含预生成的内容）
        """
        print(f"\n{'='*60}")
        print(f"🤖 开始为流水线生成内容: {pipeline.get('name', '未命名')}")
        print(f"{'='*60}")

        enhanced_pipeline = pipeline.copy()
        enhanced_steps = []

        for step in pipeline.get('steps', []):
            print(f"\n📝 处理步骤: {step.get('description', '未命名')}")

            enhanced_step = step.copy()

            # 获取action中的信息
            action = step.get('action', {})

            # 根据action类型生成内容
            if action.get('type') == 'serial' and action.get('command') in ['MOVE', 'MOVE_TO']:
                # 移动指令，生成天体介绍
                object_name = action.get('params', {}).get('objectName')
                if object_name:
                    content = self.generate_celestial_intro(
                        object_name,
                        duration=step.get('duration', 30)
                    )
                    enhanced_step['content'] = content
                    print(f"   ✅ 已生成 {object_name} 的介绍内容")

            elif action.get('type') == 'message':
                # 欢迎消息
                enhanced_step['content'] = action.get('text', '')
                print(f"   ✅ 已添加消息内容")

            elif 'content' not in enhanced_step:
                # 其他步骤，添加默认内容
                enhanced_step['content'] = f"现在开始{step.get('description', '下一步')}。"
                print(f"   ✅ 已添加默认内容")

            enhanced_steps.append(enhanced_step)

        enhanced_pipeline['steps'] = enhanced_steps
        enhanced_pipeline['content_generated_at'] = datetime.now().isoformat()
        enhanced_pipeline['content_generated_by'] = 'LLM'

        print(f"\n{'='*60}")
        print(f"✅ 流水线内容生成完成！共处理 {len(enhanced_steps)} 个步骤")
        print(f"{'='*60}\n")

        return enhanced_pipeline

    def generate_celestial_intro(self, object_name: str, duration: int = 30) -> str:
        """
        生成天体介绍文字

        Args:
            object_name: 天体名称
            duration: 预期播报时长（秒）

        Returns:
            生成的介绍文字
        """
        target_audience = "初学者"
        word_count = max(50, duration * 3)  # 每秒约3个字

        prompt = f"""请为"{object_name}"撰写一段天文讲解词。

要求：
1. 目标听众：{target_audience}
2. 字数：约{word_count}字
3. 内容包括：基本信息（位置、距离、亮度）、科学特征、有趣的知识点
4. 语言风格：生动有趣，适合朗读
5. 分段：2-3段，每段之间有自然停顿

请直接返回讲解词内容，不要标题或前言。"""

        if HAS_OPENAI and self.api_key:
            try:
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "你是一位专业的天文讲解员。"},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=500,
                    temperature=0.7
                )
                return response.choices[0].message['content'].strip()
            except Exception as e:
                print(f"   ⚠️ LLM调用失败: {e}")

        # Fallback到模板
        return self.get_template_content(object_name, word_count)

    def get_template_content(self, object_name: str, word_count: int) -> str:
        """
        获取模板内容（LLM不可用时使用）
        """
        templates = {
            "织女星": "织女星是天琴座最亮的恒星，也是夏季大三角的成员之一。它距离我们约25光年，是一颗质量约为太阳两倍的主序星。在中国古代神话中，织女星是织女的化身，与牛郎星隔银河相望。",

            "天狼星": "天狼星是夜空中最亮的恒星，位于大犬座，距离我们约8.6光年。它实际上是一个双星系统，由一颗蓝白色的主序星和一颗白矮星组成。天狼星在古埃及文化中有着重要的地位。",

            "北极星": "北极星是小熊座的最亮恒星，位于地球北极的正上方。它的独特之处在于，从地球北半球看去，其他星星都围绕它旋转。这使得北极星成为自古以来重要的导航星，帮助旅行者确定方向。",

            "牛郎星": "牛郎星，又称河鼓二，位于天鹰座，是夏季大三角的成员之一。它的自转速度非常快，每8到9小时就自转一圈，这导致它的形状被离心力压扁。",

            "天津四": "天津四位于天鹅座的尾部，距离我们约2600光年。尽管距离遥远，它仍然是夜空中最明亮的恒星之一，这意味着它的实际光度极高，约为太阳的20万倍。",

            "心宿二": "心宿二是天蝎座的最亮恒星，一颗红超巨星。如果把它放在太阳的位置，它的表面会延伸到火星轨道之外。它正处于生命的最后阶段，预计在未来几十万年内会发生超新星爆发。",

            "参宿四": "参宿四位于猎户座，是一颗红超巨星。它是全天最大的恒星之一，如果放在太阳位置，其表面会延伸到木星轨道之外。这颗恒星正在走向生命的终点，可能会以超新星爆炸的方式结束。",

            "课程介绍": "欢迎来到天文课程。今天我们将一起探索星空的奥秘，认识一些著名的恒星和星座。从我们的家园地球出发，去拜访那些遥远而闪耀的恒星。",

            "课程总结": "今天我们认识了许多美丽的恒星。希望这些天体的故事能够激发你对宇宙的好奇心。记住，每当你仰望星空时，你看到的不仅仅是光点，而是宇宙中无数精彩故事的开端。",

            "结束语": "感谢大家参加今天的天文课程。星空总是在那里等待着你。无论何时何地，只要你抬头仰望，就能感受到宇宙的壮丽与神秘。祝大家观测愉快！"
        }

        # 尝试精确匹配
        if object_name in templates:
            return templates[object_name]

        # 尝试模糊匹配
        for key, value in templates.items():
            if key in object_name or object_name in key:
                return value

        # 默认模板
        return f"{object_name}是夜空中一颗明亮的恒星。它在宇宙中闪耀，为我们讲述着星际的故事。"

    def save_enhanced_pipeline(self, pipeline: Dict[str, Any], filepath: str):
        """
        保存增强后的流水线

        Args:
            pipeline: 增强后的流水线配置
            filepath: 保存路径
        """
        with open(filepath, 'w', encoding='utf-8') as f:
            yaml.dump(pipeline, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
        print(f"✅ 已保存增强流水线到: {filepath}")


def main():
    """命令行接口"""
    import sys

    if len(sys.argv) < 2:
        print("用法: python pipeline_content_generator.py <流水线文件.yaml> [输出文件.yaml]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file.replace('.yaml', '_enhanced.yaml')

    # 读取原始流水线
    with open(input_file, 'r', encoding='utf-8') as f:
        pipeline = yaml.safe_load(f)

    # 生成内容
    generator = PipelineContentGenerator()
    enhanced_pipeline = generator.generate_pipeline_content(pipeline)

    # 保存结果
    generator.save_enhanced_pipeline(enhanced_pipeline, output_file)

    # 显示预览
    print("\n📋 内容预览:")
    print("="*60)
    for step in enhanced_pipeline.get('steps', []):
        if 'content' in step:
            print(f"\n【{step.get('description')}】")
            print(f"{step['content'][:100]}...")
    print("="*60)


if __name__ == "__main__":
    main()
