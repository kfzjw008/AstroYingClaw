# -*- coding: utf-8 -*-
"""
AstroGuide 天文数据库模块

提供天体坐标查询、词语映射和天文计算功能
"""

from .word_map import (
    CelestialWordMap,
    get_coordinates
)

__all__ = [
    'CelestialWordMap',
    'get_coordinates',
]
