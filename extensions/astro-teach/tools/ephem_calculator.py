#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
天体方位角和高度角计算工具
使用 ephem 库计算天体在指定地点和时间的方位角和高度角
"""

import ephem
import math
import json
import sys

# 天体中文名称与英文查询名称映射
CELESTIAL_NAME_MAP = {
    # 太阳系天体
    "太阳": "Sun",
    "月球": "Moon",
    "水星": "Mercury",
    "金星": "Venus",
    "火星": "Mars",
    "木星": "Jupiter",
    "土星": "Saturn",
    "天王星": "Uranus",
    "海王星": "Neptune",

    # 著名恒星
    "天狼星": "Sirius",
    "大角星": "Arcturus",
    "织女星": "Vega",
    "牛郎星": "Altair",
    "河鼓二": "Altair",
    "参宿四": "Betelgeuse",
    "参宿七": "Rigel",
    "北极星": "Polaris",
    "勾陈一": "Polaris",
    "心宿二": "Antares",
    "角宿一": "Spica",
    "毕宿五": "Aldebaran",
    "轩辕十四": "Regulus",
    "北河三": "Pollux",
    "北河二": "Castor",
    "南河三": "Procyon",
    "天津四": "Deneb",
    "五车二": "Capella",
    "北落师门": "Fomalhaut",
    "老人星": "Canopus",
    "马腹一": "Hadar",
    "十字架二": "Acrux",
    "水委一": "Achernar",
    "昴宿六": "Alcyone",
    "天关": "Algol",
    "大陵五": "Algol"
}

# 太阳系天体对象
SOLAR_SYSTEM_BODIES = {
    'Sun': ephem.Sun(),
    'Moon': ephem.Moon(),
    'Mercury': ephem.Mercury(),
    'Venus': ephem.Venus(),
    'Mars': ephem.Mars(),
    'Jupiter': ephem.Jupiter(),
    'Saturn': ephem.Saturn(),
    'Uranus': ephem.Uranus(),
    'Neptune': ephem.Neptune(),
    'Pluto': ephem.Pluto()
}


def get_az_alt(target_name, latitude=39.9042, longitude=116.4074, elevation=43):
    """
    计算天体的方位角和高度角

    参数:
        target_name: 天体名称（中文或英文）
        latitude: 观测者纬度（度），默认北京
        longitude: 观测者经度（度），默认北京
        elevation: 海拔高度（米），默认北京

    返回:
        dict: 包含方位角、高度角等信息的字典
    """
    try:
        # 1. 设置观测者信息
        observer = ephem.Observer()
        observer.lat = str(latitude)
        observer.lon = str(longitude)
        observer.elevation = elevation
        observer.date = ephem.now()  # 当前UTC时间

        # 2. 转换中文名称为英文
        english_name = target_name
        if target_name in CELESTIAL_NAME_MAP:
            english_name = CELESTIAL_NAME_MAP[target_name]

        # 3. 获取天体对象
        if english_name in SOLAR_SYSTEM_BODIES:
            body = SOLAR_SYSTEM_BODIES[english_name]
        else:
            try:
                body = ephem.star(english_name)
            except KeyError:
                return {
                    "success": False,
                    "error": f"未找到天体 '{target_name}'",
                    "target_name": target_name
                }

        # 4. 计算天体位置
        body.compute(observer)

        # 5. 提取坐标并转换为角度
        azimuth = math.degrees(body.az)
        altitude = math.degrees(body.alt)

        # 6. 计算方位描述
        directions = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"]
        dir_idx = int(((azimuth + 22.5) % 360) // 45)
        direction_str = directions[dir_idx]

        # 7. 判断天体是否在地平线上
        is_visible = altitude > 0

        # 8. 获取天体基本信息
        ra = body.ra  # 赤经（弧度）
        dec = body.dec  # 赤纬（弧度）
        ra_deg = math.degrees(ra)
        dec_deg = math.degrees(dec)

        # 转换赤经为时分秒
        ra_hours = int(ra_deg / 15)
        ra_minutes = int((ra_deg % 15) * 4)
        ra_seconds = ((ra_deg % 15) * 4 - ra_minutes) * 60

        # 转换赤纬为度分秒
        dec_deg_abs = abs(dec_deg)
        dec_degrees = int(dec_deg_abs)
        dec_minutes = int((dec_deg_abs % 1) * 60)
        dec_seconds = ((dec_deg_abs % 1) * 60 - dec_minutes) * 60
        dec_sign = "+" if dec_deg >= 0 else "-"

        return {
            "success": True,
            "target_name": target_name,
            "english_name": english_name,
            "azimuth": round(azimuth, 2),
            "altitude": round(altitude, 2),
            "direction": direction_str,
            "is_visible": is_visible,
            "coordinates": {
                "ra": {
                    "degrees": round(ra_deg, 4),
                    "hours": ra_hours,
                    "minutes": ra_minutes,
                    "seconds": round(ra_seconds, 1)
                },
                "dec": {
                    "degrees": round(dec_deg, 4),
                    "sign": dec_sign,
                    "degrees_part": dec_degrees,
                    "minutes": dec_minutes,
                    "seconds": round(dec_seconds, 1)
                }
            },
            "observer": {
                "latitude": latitude,
                "longitude": longitude,
                "elevation": elevation
            },
            "timestamp": ephem.localtime(observer.date).isoformat()
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "target_name": target_name
        }


def list_available_bodies():
    """列出所有可查询的天体"""
    return {
        "success": True,
        "solar_system": list(SOLAR_SYSTEM_BODIES.keys()),
        "stars": list(set(CELESTIAL_NAME_MAP.values()) - set(SOLAR_SYSTEM_BODIES.keys())),
        "chinese_names": list(CELESTIAL_NAME_MAP.keys())
    }


if __name__ == "__main__":
    # 命令行使用方式
    if len(sys.argv) < 2:
        print(json.dumps(list_available_bodies(), ensure_ascii=False, indent=2))
    else:
        target = sys.argv[1]

        # 可选参数：纬度、经度
        lat = float(sys.argv[2]) if len(sys.argv) > 2 else 39.9042
        lon = float(sys.argv[3]) if len(sys.argv) > 3 else 116.4074

        result = get_az_alt(target, lat, lon)
        print(json.dumps(result, ensure_ascii=False, indent=2))
