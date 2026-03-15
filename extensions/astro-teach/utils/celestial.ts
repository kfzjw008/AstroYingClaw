/**
 * 天体数据工具
 * 加载和管理天体映射数据
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import type { AstroConfig } from '../config';
import { resolvePath } from '../config';
import type { CelestialObject } from '../types';

// 内置的天体数据（简化版）
const BUILT_IN_CELESTIAL_DATA: Record<string, CelestialObject> = {
  '天狼星': {
    name: '天狼星',
    englishName: 'Sirius',
    designation: 'α CMa',
    type: 'star',
    coordinates: {
      rightAscension: 6.7525,
      declination: -16.7161,
      azimuth: 0,
      altitude: 0
    },
    magnitude: -1.46,
    description: '夜空中最亮的恒星，位于大犬座'
  },
  '织女星': {
    name: '织女星',
    englishName: 'Vega',
    designation: 'α Lyr',
    type: 'star',
    coordinates: {
      rightAscension: 18.6156,
      declination: 38.7836,
      azimuth: 0,
      altitude: 0
    },
    magnitude: 0.03,
    description: '天琴座最亮的恒星，夏季大三角之一'
  },
  '牛郎星': {
    name: '牛郎星',
    englishName: 'Altair',
    designation: 'α Aql',
    type: 'star',
    coordinates: {
      rightAscension: 19.8463,
      declination: 8.8683,
      azimuth: 0,
      altitude: 0
    },
    magnitude: 0.77,
    description: '天鹰座最亮的恒星，夏季大三角之一'
  },
  '参宿四': {
    name: '参宿四',
    englishName: 'Betelgeuse',
    designation: 'α Ori',
    type: 'star',
    coordinates: {
      rightAscension: 5.9195,
      declination: 7.4071,
      azimuth: 0,
      altitude: 0
    },
    magnitude: 0.5,
    description: '猎户座红超巨星，即将爆发的超新星'
  },
  '参宿七': {
    name: '参宿七',
    englishName: 'Rigel',
    designation: 'β Ori',
    type: 'star',
    coordinates: {
      rightAscension: 5.2423,
      declination: -8.2016,
      azimuth: 0,
      altitude: 0
    },
    magnitude: 0.13,
    description: '猎户座蓝超巨星，夜空第七亮星'
  },
  '大角星': {
    name: '大角星',
    englishName: 'Arcturus',
    designation: 'α Boo',
    type: 'star',
    coordinates: {
      rightAscension: 14.2610,
      declination: 19.1825,
      azimuth: 0,
      altitude: 0
    },
    magnitude: -0.05,
    description: '牧夫座最亮的恒星，北半球夜空最亮'
  },
  '五车二': {
    name: '五车二',
    englishName: 'Capella',
    designation: 'α Aur',
    type: 'star',
    coordinates: {
      rightAscension: 5.2781,
      declination: 45.9979,
      azimuth: 0,
      altitude: 0
    },
    magnitude: 0.08,
    description: '御夫座最亮的恒星'
  },
  '轩辕十四': {
    name: '轩辕十四',
    englishName: 'Regulus',
    designation: 'α Leo',
    type: 'star',
    coordinates: {
      rightAscension: 10.1379,
      declination: 11.9672,
      azimuth: 0,
      altitude: 0
    },
    magnitude: 1.40,
    description: '狮子座最亮的恒星'
  },
  '心宿二': {
    name: '心宿二',
    englishName: 'Antares',
    designation: 'α Sco',
    type: 'star',
    coordinates: {
      rightAscension: 16.4901,
      declination: -26.4320,
      azimuth: 0,
      altitude: 0
    },
    magnitude: 1.06,
    description: '天蝎座红超巨星，夏季南天最亮'
  },
  '南河三': {
    name: '南河三',
    englishName: 'Procyon',
    designation: 'α CMi',
    type: 'star',
    coordinates: {
      rightAscension: 7.6542,
      declination: 5.2252,
      azimuth: 0,
      altitude: 0
    },
    magnitude: 0.34,
    description: '小犬座最亮的恒星'
  },
  '北极星': {
    name: '北极星',
    englishName: 'Polaris',
    designation: 'α UMi',
    type: 'star',
    coordinates: {
      rightAscension: 2.5302,
      declination: 89.2641,
      azimuth: 0,
      altitude: 0
    },
    magnitude: 1.98,
    description: '小熊座最亮的恒星，指示正北方向'
  },
  '天津四': {
    name: '天津四',
    englishName: 'Deneb',
    designation: 'α Cyg',
    type: 'star',
    coordinates: {
      rightAscension: 20.6931,
      declination: 45.2804,
      azimuth: 0,
      altitude: 0
    },
    magnitude: 1.25,
    description: '天鹅座最亮的恒星，夏季大三角之一'
  },
  '角宿一': {
    name: '角宿一',
    englishName: 'Spica',
    designation: 'α Vir',
    type: 'star',
    coordinates: {
      rightAscension: 13.4199,
      declination: -11.1613,
      azimuth: 0,
      altitude: 0
    },
    magnitude: 0.97,
    description: '室女座最亮的恒星'
  },
  '毕宿五': {
    name: '毕宿五',
    englishName: 'Aldebaran',
    designation: 'α Tau',
    type: 'star',
    coordinates: {
      rightAscension: 4.5987,
      declination: 16.5093,
      azimuth: 0,
      altitude: 0
    },
    magnitude: 0.85,
    description: '金牛座最亮的恒星'
  }
};

export async function loadCelestialMapping(dataDir: string): Promise<Record<string, CelestialObject>> {
  try {
    const mappingPath = path.resolve(dataDir, 'celestial_mapping.json');
    const content = await fs.readFile(mappingPath, 'utf-8');
    const customData = JSON.parse(content);

    // 处理嵌套结构（stars 和 constellations）
    const result: Record<string, CelestialObject> = { ...BUILT_IN_CELESTIAL_DATA };

    // 处理 stars 对象
    if (customData.stars) {
      for (const [key, obj] of Object.entries(customData.stars)) {
        const celestialObj = obj as CelestialObject;
        if (celestialObj.name && celestialObj.englishName) {
          result[key] = celestialObj;
        }
      }
    }

    // 处理 constellations 对象
    if (customData.constellations) {
      for (const [key, obj] of Object.entries(customData.constellations)) {
        // 转换星座数据为标准格式
        const constellationObj = obj as any;
        const celestialObj: CelestialObject = {
          name: key,
          englishName: constellationObj.englishName || constellationObj.name || key,
          designation: constellationObj.abbreviation,
          type: 'constellation',
          description: constellationObj.description || ''
        };
        result[key] = celestialObj;
      }
    }

    // 处理扁平结构的自定义数据
    for (const [key, obj] of Object.entries(customData)) {
      if (key !== 'stars' && key !== 'constellations') {
        const celestialObj = obj as CelestialObject;
        if (celestialObj.name && celestialObj.englishName) {
          result[key] = celestialObj;
        }
      }
    }

    return result;
  } catch (error) {
    // 如果文件不存在，返回内置数据
    return BUILT_IN_CELESTIAL_DATA;
  }
}

export function getCelestialMapping(): Record<string, CelestialObject> {
  return BUILT_IN_CELESTIAL_DATA;
}

export function normalizeCelestialName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function findCelestialObject(name: string, data: Record<string, CelestialObject>): CelestialObject | null {
  const normalizedName = normalizeCelestialName(name);

  // 直接匹配
  for (const obj of Object.values(data)) {
    if (normalizeCelestialName(obj.name) === normalizedName ||
        normalizeCelestialName(obj.englishName) === normalizedName ||
        (obj.designation && normalizeCelestialName(obj.designation) === normalizedName)) {
      return obj;
    }
  }

  // 部分匹配
  for (const obj of Object.values(data)) {
    if (obj.name.includes(name) ||
        obj.englishName.toLowerCase().includes(normalizedName)) {
      return obj;
    }
  }

  return null;
}

// 词语映射表 - 用于避免识别错误
export const CELESTIAL_NAME_ALIASES: Record<string, string> = {
  '天狼': '天狼星',
  '织女': '织女星',
  '牛郎': '牛郎星',
  '参宿四': '参宿四',
  '参宿七': '参宿七',
  '大角': '大角星',
  '五车': '五车二',
  '轩辕': '轩辕十四',
  '心宿': '心宿二',
  '南河': '南河三',
  '北极': '北极星',
  '天津': '天津四',
  '角宿': '角宿一',
  '毕宿': '毕宿五'
};

export function resolveCelestialName(input: string): string {
  const normalized = normalizeCelestialName(input);

  // 检查别名
  for (const [alias, canonical] of Object.entries(CELESTIAL_NAME_ALIASES)) {
    if (normalizeCelestialName(alias) === normalized) {
      return canonical;
    }
  }

  return input;
}
