# -*- coding: utf-8 -*-
"""
天体词语映射表

提供中文天体名称到坐标的映射，支持：
1. 星座名称（中文/拉丁）
2. 恒星名称（中文/拜耳编号/ Flamsteed编号）
3. 深空天体（M/NGC/IC编号）
4. 太阳系天体
"""

import re
import json
from typing import Optional, Dict, List, Tuple
from pathlib import Path


class CelestialWordMap:
    """天体词语映射表"""

    def __init__(self):
        """初始化映射表"""
        self._constellation_map: Dict[str, Tuple[float, float]] = {}
        self._star_map: Dict[str, Tuple[float, float]] = {}
        self._deep_sky_map: Dict[str, Tuple[float, float]] = {}
        self._solar_system_map: Dict[str, Tuple[float, float]] = {}
        self._alias_map: Dict[str, str] = {}

        # 加载数据
        self._load_constellations()
        self._load_bright_stars()
        self._load_deep_sky_objects()
        self._load_solar_system()
        self._build_aliases()

    def get_coordinates(self, name: str) -> Optional[Dict[str, float]]:
        """
        获取天体坐标

        Args:
            name: 天体名称（支持中文、拉丁、编号等）

        Returns:
            坐标字典 {"ra": 赤经(小时), "dec": 赤纬(度)}，找不到返回None

        Examples:
            >>> get_coordinates("参宿四")
            >>> get_coordinates("Betelgeuse")
            >>> get_coordinates("猎户座_参宿四")
            >>> get_coordinates("M42")
            >>> get_coordinates("猎户座大星云")
        """
        # 标准化输入
        name = self._normalize_name(name)

        # 直接查找
        coords = self._lookup_direct(name)
        if coords:
            return coords

        # 尝试别名映射
        canonical = self._resolve_alias(name)
        if canonical:
            return self._lookup_direct(canonical)

        # 尝试解析组合名称（如 "猎户座_参宿四"）
        if '_' in name:
            parts = name.split('_')
            if len(parts) == 2:
                constellation, star = parts
                # 如果两部分都能找到，使用恒星的坐标
                star_coords = self._lookup_direct(star)
                if star_coords:
                    return star_coords

        # 模糊匹配
        return self._fuzzy_match(name)

    def _normalize_name(self, name: str) -> str:
        """标准化名称"""
        # 去除空格
        name = name.strip()
        # 统一大小写（保持中文不变）
        # 移除常见前缀
        name = re.sub(r'^(星云|星系|星团|恒星)\s*', '', name)
        return name

    def _lookup_direct(self, name: str) -> Optional[Dict[str, float]]:
        """直接查找坐标"""
        # 搜索所有映射表
        for mapping in [self._star_map, self._deep_sky_map,
                        self._constellation_map, self._solar_system_map]:
            if name in mapping:
                ra, dec = mapping[name]
                return {"ra": ra, "dec": dec}
        return None

    def _resolve_alias(self, name: str) -> Optional[str]:
        """解析别名到规范名称"""
        return self._alias_map.get(name)

    def _fuzzy_match(self, name: str) -> Optional[Dict[str, float]]:
        """模糊匹配"""
        # 尝试去除"座"字
        if name.endswith('座'):
            alt_name = name[:-1]
            coords = self._lookup_direct(alt_name)
            if coords:
                return coords

        # 尝试添加"座"字
        if not name.endswith('座'):
            alt_name = name + '座'
            coords = self._lookup_direct(alt_name)
            if coords:
                return coords

        return None

    def _load_constellations(self):
        """加载星座数据（88星座）"""
        # 主要星座（示例数据，实际应从完整数据库加载）
        constellations = {
            # 黄道十二宫
            "白羊座": (2.5, 20),
            "金牛座": (4.5, 15),
            "双子座": (7.0, 20),
            "巨蟹座": (8.5, 20),
            "狮子座": (10.5, 15),
            "室女座": (13.0, -5),
            "天秤座": (15.0, -15),
            "天蝎座": (16.5, -25),
            "射手座": (19.0, -25),
            "摩羯座": (21.0, -15),
            "水瓶座": (22.0, -10),
            "双鱼座": (0.5, 10),

            # 北天常见星座
            "大熊座": (11.0, 50),
            "小熊座": (15.0, 70),
            "仙后座": (1.0, 60),
            "仙王座": (22.0, 70),
            "天龙座": (18.0, 65),
            "猎户座": (5.5, 5),
            "天鹅座": (20.5, 40),
            "天琴座": (18.5, 35),
            "天鹰座": (19.5, 5),
            "武仙座": (17.0, 30),
            "英仙座": (3.5, 45),
            "御夫座": (6.0, 40),

            # 南天星座
            "大犬座": (6.5, -20),
            "小犬座": (7.5, 5),
            "南十字座": (12.5, -60),
            "半人马座": (13.0, -50),
            "波江座": (3.5, -30),
        }

        # 添加拉丁名称
        latin_names = {
            "白羊座": "Aries", "金牛座": "Taurus", "双子座": "Gemini",
            "巨蟹座": "Cancer", "狮子座": "Leo", "室女座": "Virgo",
            "天秤座": "Libra", "天蝎座": "Scorpius", "射手座": "Sagittarius",
            "摩羯座": "Capricornus", "水瓶座": "Aquarius", "双鱼座": "Pisces",
            "大熊座": "Ursa Major", "小熊座": "Ursa Minor", "仙后座": "Cassiopeia",
            "猎户座": "Orion", "天鹅座": "Cygnus", "天琴座": "Lyra",
            "大犬座": "Canis Major", "小犬座": "Canis Minor",
        }

        for chinese, coords in constellations.items():
            self._constellation_map[chinese] = coords
            if chinese in latin_names:
                self._constellation_map[latin_names[chinese]] = coords

    def _load_bright_stars(self):
        """加载亮星数据（亮度前100）"""
        # 格式：名称: (赤经小时, 赤纬度)
        stars = {
            # 最亮的恒星
            "天狼星": (6.75, -16.72),  # Sirius
            "老人星": (6.40, -52.70),  # Canopus
            "大角星": (14.26, 19.18),  # Arcturus
            "织女星": (18.62, 38.78),  # Vega
            "五车二": (5.28, 45.99),   # Capella
            "参宿七": (5.24, -8.20),   # Rigel
            "南河三": (7.65, 5.22),    # Procyon
            "参宿四": (5.92, 7.41),    # Betelgeuse
            "牛郎星": (19.85, 8.87),   # Altair

            # 猎户座
            "参宿一": (5.70, -1.20),   # Mintaka
            "参宿二": (5.61, -1.20),   # Alnilam
            "参宿五": (5.79, 31.17),   # Bellatrix

            # 双子座
            "北河三": (7.75, 28.03),   # Pollux
            "北河二": (7.58, 31.89),   # Castor

            # 大熊座（北斗七星）
            "天枢": (11.06, 61.75),    # Dubhe
            "天璇": (11.03, 56.38),    # Merak
            "天玑": (11.90, 53.70),    # Phecda
            "天权": (12.41, 57.03),    # Megrez
            "玉衡": (12.54, 55.96),    # Alioth
            "开阳": (13.39, 54.93),    # Mizar
            "瑶光": (13.79, 49.31),    # Alkaid

            # 仙后座（W形）
            "王良四": (0.10, 59.15),   # Schedar
            "王良一": (0.15, 56.53),   # Caph
            "阁道二": (0.95, 60.72),   # Navi
            "阁道三": (1.90, 60.24),   # Ruchbah
            "策": (1.83, 53.69),       # Segin

            # 其他亮星
            "心宿二": (16.49, -26.43),  # Antares
            "轩辕十四": (10.08, 11.97), # Regulus
            "角宿一": (13.42, -11.16),  # Spica
            "毕宿五": (4.60, 16.51),    # Aldebaran
            "天津四": (20.69, 45.28),   # Deneb
        }

        # 添加英文名和拜耳编号
        star_aliases = {
            "天狼星": [("Sirius",), ("Alpha_CMa",), ("α_Canis_Majoris",)],
            "参宿四": [("Betelgeuse",), ("Alpha_Ori",), ("α_Orionis",)],
            "参宿七": [("Rigel",), ("Beta_Ori",), ("β_Orionis",)],
            "织女星": [("Vega",), ("Alpha_Lyr",), ("α_Lyrae",)],
            "牛郎星": [("Altair",), ("Alpha_Aql",), ("α_Aquilae",)],
            "北河三": [("Pollux",), ("Beta_Gem",), ("β_Geminorum",)],
            "北河二": [("Castor",), ("Alpha_Gem",), ("α_Geminorum",)],
            "心宿二": [("Antares",), ("Alpha_Sco",), ("α_Scorpii",)],
        }

        for chinese, coords in stars.items():
            self._star_map[chinese] = coords
            if chinese in star_aliases:
                for alias in star_aliases[chinese]:
                    self._star_map[alias] = coords
                    self._alias_map[alias] = chinese

    def _load_deep_sky_objects(self):
        """加载深空天体（梅西耶目录）"""
        # 梅西耶天体（部分重要天体）
        deep_sky = {
            # 星系
            "M31": (0.72, 41.27),      # 仙女座星系
            "仙女座星系": (0.72, 41.27),
            "M32": (0.70, 40.87),
            "M33": (1.57, 30.66),      # 三角座星系

            # 星云
            "M42": (5.58, -5.39),      # 猎户座大星云
            "猎户座大星云": (5.58, -5.39),
            "M43": (5.60, -5.40),      # 猎耳星云
            "M8": (18.05, -24.38),     # 礁湖星云
            "M16": (18.31, -13.83),    # 鹰星云
            "M17": (18.33, -16.17),    # 天鹅星云
            "M20": (18.04, -23.02),    # 三叶星云
            "M27": (19.98, 22.72),     # 哑铃星云
            "M57": (18.88, 33.03),     # 环状星云
            "M1": (5.55, 22.02),       # 蟹状星云
            "蟹状星云": (5.55, 22.02),

            # 星团
            "M45": (3.75, 24.12),      # 昴星团
            "昴星团": (3.75, 24.12),
            "M44": (8.65, 19.97),      # 鬼星团
            "M67": (8.81, 11.82),
            "M35": (6.15, 24.33),      # 双子座星团
            "M36": (5.60, 34.13),
            "M37": (5.78, 32.55),
            "M38": (5.47, 35.83),
            "M46": (7.66, -14.83),
            "M47": (7.60, -14.50),
            "M93": (7.73, -23.85),
            "M103": (1.60, 60.65),

            # 球状星团
            "M13": (16.70, 36.46),     # 武仙座球状星团
            "M4": (16.39, -26.53),
            "M5": (13.67, 2.08),
            "M22": (18.58, -23.90),
            "M92": (17.17, 43.14),
        }

        for name, coords in deep_sky.items():
            self._deep_sky_map[name] = coords

    def _load_solar_system(self):
        """加载太阳系天体（近似坐标，实际需要实时计算）"""
        # 注意：太阳系天体坐标随时间变化，这里只是示例
        # 实际应用中应该使用天文库实时计算
        self._solar_system_map = {
            "太阳": (0, 0),
            "月亮": (0, 0),
            "水星": (0, 0),
            "金星": (0, 0),
            "火星": (0, 0),
            "木星": (0, 0),
            "土星": (0, 0),
            "天王星": (0, 0),
            "海王星": (0, 0),
            "冥王星": (0, 0),
        }

    def _build_aliases(self):
        """构建别名映射"""
        # 星座简称
       星座简称 = {
            "猎户": "猎户座",
            "双子": "双子座",
            "大熊": "大熊座",
            "小熊": "小熊座",
            "仙后": "仙后座",
            "天鹅": "天鹅座",
            "天琴": "天琴座",
            "天鹰": "天鹰座",
            "大犬": "大犬座",
            "小犬": "小犬座",
            "天蝎": "天蝎座",
            "狮子": "狮子座",
            "室女": "室女座",
        }

        for short, full in 星座简称.items():
            self._alias_map[short] = full

        # 特殊别名
        special_aliases = {
            "北斗七星": "大熊座",
            "北斗": "大熊座",
            "小北斗": "小熊座",
            "南斗": "人马座",
            "夏季大三角": "织女星",  # 返回其中一颗星
            "冬季大三角": "参宿四",
        }

        for alias, target in special_aliases.items():
            self._alias_map[alias] = target

    def find_similar(self, name: str, limit: int = 5) -> List[str]:
        """
        查找相似的天体名称

        Args:
            name: 输入名称
            limit: 返回结果数量限制

        Returns:
            相似名称列表
        """
        name = self._normalize_name(name)
        results = []

        # 收集所有名称
        all_names = set()
        all_names.update(self._constellation_map.keys())
        all_names.update(self._star_map.keys())
        all_names.update(self._deep_sky_map.keys())

        # 简单的包含匹配
        for candidate in all_names:
            if name.lower() in candidate.lower() or candidate.lower() in name.lower():
                results.append(candidate)

        return results[:limit]

    def get_constellation_info(self, constellation: str) -> Optional[Dict]:
        """
        获取星座详细信息

        Returns:
            星座信息字典
        """
        # 这里可以扩展为返回更详细的信息
        coords = self._lookup_direct(constellation)
        if coords:
            return {
                "name": constellation,
                "ra": coords["ra"],
                "dec": coords["dec"],
            }
        return None


# 便捷函数
def get_coordinates(name: str) -> Optional[Dict[str, float]]:
    """便捷的坐标查询函数"""
    word_map = CelestialWordMap()
    return word_map.get_coordinates(name)


if __name__ == "__main__":
    # 测试代码
    word_map = CelestialWordMap()

    test_names = [
        "参宿四",
        "Betelgeuse",
        "猎户座_参宿四",
        "M42",
        "猎户座大星云",
        "织女星",
        "北河三",
        "仙女座星系",
        "M31",
    ]

    print("天体坐标查询测试:")
    print("=" * 50)
    for name in test_names:
        coords = word_map.get_coordinates(name)
        if coords:
            print(f"{name:20s} -> RA: {coords['ra']:6.2f}h, DEC: {coords['dec']:6.2f}°")
        else:
            print(f"{name:20s} -> 未找到")
