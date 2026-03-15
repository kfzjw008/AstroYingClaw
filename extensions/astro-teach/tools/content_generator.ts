/**
 * AI内容生成工具
 * 调用LLM实时生成天文教学内容的描述文字
 */

import type { Logger } from 'openclaw/plugin-sdk/core';
import type { AstroConfig } from '../config';

// 假设OpenClaw提供LLM服务接口
// 如果没有，我们需要使用HTTP API调用
interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export class ContentGeneratorTool {
  private logger: Logger;
  private config: AstroConfig;
  private llmService: any; // OpenClaw LLM服务

  constructor(logger: Logger, config: AstroConfig, llmService?: any) {
    this.logger = logger;
    this.config = config;
    this.llmService = llmService;
  }

  /**
   * 生成天体描述文字
   */
  async generateCelestialDescription(params: {
    objectName: string;
    targetAudience?: 'beginner' | 'intermediate' | 'advanced';
    duration?: number; // 期望的播报时长（秒）
    language?: string;
  }): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const {
        objectName,
        targetAudience = 'beginner',
        duration = 30,
        language = 'zh-CN'
      } = params;

      this.logger.info(`[内容生成] 正在生成 ${objectName} 的描述文字...`);

      // 构建提示词
      const prompt = this.buildCelestialPrompt(objectName, targetAudience, duration);

      // 调用LLM生成内容
      const response = await this.callLLM(prompt);

      if (!response?.content) {
        throw new Error('LLM未返回内容');
      }

      this.logger.info(`[内容生成] 生成成功: ${response.content.substring(0, 50)}...`);

      return {
        success: true,
        content: response.content
      };

    } catch (error) {
      this.logger.error(`[内容生成] 生成失败: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 生成课程介绍
   */
  async generateCourseIntroduction(params: {
    courseName: string;
    duration: number;
    topics: string[];
    targetAudience?: string;
  }): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      this.logger.info(`[内容生成] 正在生成课程介绍: ${params.courseName}`);

      const prompt = this.buildCourseIntroductionPrompt(params);

      const response = await this.callLLM(prompt);

      if (!response?.content) {
        throw new Error('LLM未返回内容');
      }

      return {
        success: true,
        content: response.content
      };

    } catch (error) {
      this.logger.error(`[内容生成] 生成课程介绍失败: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 生成地理位置介绍
   */
  async generateLocationDescription(params: {
    location: string;
    latitude?: number;
    longitude?: number;
    observationTips?: boolean;
  }): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      this.logger.info(`[内容生成] 正在生成地理位置介绍: ${params.location}`);

      const prompt = this.buildLocationPrompt(params);

      const response = await this.callLLM(prompt);

      if (!response?.content) {
        throw new Error('LLM未返回内容');
      }

      return {
        success: true,
        content: response.content
      };

    } catch (error) {
      this.logger.error(`[内容生成] 生成地理位置介绍失败: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 生成课程总结
   */
  async generateCourseSummary(params: {
    topics: string[];
    highlights?: string[];
    duration: number;
  }): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      this.logger.info(`[内容生成] 正在生成课程总结`);

      const prompt = this.buildSummaryPrompt(params);

      const response = await this.callLLM(prompt);

      if (!response?.content) {
        throw new Error('LLM未返回内容');
      }

      return {
        success: true,
        content: response.content
      };

    } catch (error) {
      this.logger.error(`[内容生成] 生成课程总结失败: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 构建天体描述提示词
   */
  private buildCelestialPrompt(
    objectName: string,
    audience: string,
    duration: number
  ): string {
    const audienceDesc = {
      beginner: '小学生/初学者，使用通俗易懂的语言',
      intermediate: '有一定天文基础的学生，可以加入专业术语',
      advanced: '天文爱好者，可以详细介绍科学知识'
    };

    const wordCount = Math.floor(duration * 3); // 每秒约3个字

    return `你是一位专业的天文讲解员。请为"${objectName}"撰写一段${duration}秒的解说词。

要求：
1. 目标听众：${audienceDesc[audience]}
2. 字数：约${wordCount}字
3. 内容包括：基本信息（位置、距离、亮度）、科学特征、有趣的知识点
4. 语言风格：生动有趣，适合朗读
5. 分段：2-3段，每段之间有自然停顿

请直接返回解说词内容，不要标题或前言。`;
  }

  /**
   * 构建课程介绍提示词
   */
  private buildCourseIntroductionPrompt(params: {
    courseName: string;
    duration: number;
    topics: string[];
    targetAudience?: string;
  }): string {
    return `请为天文课程"${params.courseName}"撰写一段开场白。

课程信息：
- 时长：${params.duration}分钟
- 主题：${params.topics.join('、')}
- 目标听众：${params.targetAudience || '初学者'}

要求：
1. 热情欢迎，营造氛围
2. 简要介绍课程内容
3. 激发学习兴趣
4. 2-3段话，适合朗读

请直接返回开场白内容。`;
  }

  /**
   * 构建地理位置介绍提示词
   */
  private buildLocationPrompt(params: {
    location: string;
    latitude?: number;
    longitude?: number;
    observationTips?: boolean;
  }): string {
    let prompt = `请为观测地点"${params.location}"撰写一段介绍。`;

    if (params.latitude !== undefined && params.longitude !== undefined) {
      prompt += `\n\n地理坐标：北纬${params.latitude}度，东经${params.longitude}度。`;
    }

    if (params.observationTips) {
      prompt += `\n\n请包含该地点的观测优势和建议。`;
    }

    prompt += `\n\n要求：2-3段话，适合朗读。请直接返回内容。`;

    return prompt;
  }

  /**
   * 构建总结提示词
   */
  private buildSummaryPrompt(params: {
    topics: string[];
    highlights?: string[];
    duration: number;
  }): string {
    return `请为天文课程撰写一段总结。

课程内容：
- 涵盖主题：${params.topics.join('、')}
- 课程时长：${params.duration}分钟${params.highlights ? `\n- 重点内容：${params.highlights.join('、')}` : ''}

要求：
1. 回顾主要内容
2. 强调重点知识
3. 鼓励继续探索
4. 2-3段话，适合朗读

请直接返回总结内容。`;
  }

  /**
   * 调用LLM服务
   */
  private async callLLM(prompt: string): Promise<LLMResponse | null> {
    try {
      // 方案1：使用OpenClaw的LLM服务（如果可用）
      if (this.llmService?.generate) {
        return await this.llmService.generate({
          prompt,
          maxTokens: 500,
          temperature: 0.7
        });
      }

      // 方案2：使用HTTP API调用（需要配置API密钥）
      // 这里假设用户配置了OpenAI或其他兼容的API
      const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
      if (apiKey) {
        return await this.callLLMAPI(prompt, apiKey);
      }

      // 方案3：Fallback到本地模板
      this.logger.warn('[内容生成] LLM服务不可用，使用模板内容');
      return {
        content: this.generateFallbackContent(prompt)
      };

    } catch (error) {
      this.logger.error(`[内容生成] LLM调用失败: ${error.message}`);
      // Fallback到模板
      return {
        content: this.generateFallbackContent(prompt)
      };
    }
  }

  /**
   * 调用LLM HTTP API
   */
  private async callLLMAPI(prompt: string, apiKey: string): Promise<LLMResponse> {
    const apiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
    const modelName = process.env.LLM_MODEL || 'gpt-3.5-turbo';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`LLM API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens
      }
    };
  }

  /**
   * Fallback内容生成（基于模板）
   */
  private generateFallbackContent(prompt: string): string {
    // 简单的关键词提取和模板生成
    if (prompt.includes('天狼星')) {
      return '天狼星是夜空中最亮的恒星，位于大犬座。它距离我们约8.6光年，实际上是一个双星系统。天狼星A是一颗蓝白色的主序星，天狼星B是一颗白矮星。';
    } else if (prompt.includes('织女星')) {
      return '织女星是天琴座最亮的恒星，也是夏季大三角的成员之一。它距离我们约25光年，是一颗质量约为太阳两倍的主序星。';
    } else if (prompt.includes('北极星')) {
      return '北极星是小熊座的最亮恒星，位于地球北极的正上方。它是北半球重要的导航星，可以帮助我们确定方向。';
    } else if (prompt.includes('课程介绍')) {
      return '欢迎来到天文课程。今天我们将一起探索星空的奥秘，认识一些著名的恒星和星座。';
    } else if (prompt.includes('总结')) {
      return '今天我们认识了许多美丽的恒星。希望大家对星空有了更深的了解。记住，每当你仰望星空时，你看到的是宇宙中无数精彩故事的开端。';
    }

    return '这是一段关于天文知识的解说内容。让我们一起探索宇宙的奥秘。';
  }

  getToolDefinition() {
    return {
      name: 'astro_generate_teaching_content',
      description: '⚠️ IMPORTANT: When user asks to "生成" any astronomy teaching content, you MUST use this tool. DO NOT use write tool. This generates spoken teaching content for TTS playback, NOT markdown files. Keywords that trigger this tool: 生成、介绍、讲解、解说词、天文、恒星、星座、位置、地理',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Copy the user\'s exact request text here'
          }
        },
        required: ['prompt']
      }
    };
  }

  async execute(params: any): Promise<any> {
    this.logger.info(`[天文教学工具] 收到请求: ${params.prompt}`);

    const input = params.prompt || '';

    // 智能解析用户输入
    let generateType = 'celestial';
    let targetName = '';
    let targetAudience = 'beginner';
    let duration = 60;
    let includeTips = true;

    // 判断内容类型
    if (this.isLocationInput(input)) {
      generateType = 'location';
      targetName = this.extractLocationName(input);
    } else if (this.isCourseIntroInput(input)) {
      generateType = 'course_intro';
      targetName = this.extractCourseName(input);
    } else if (this.isSummaryInput(input)) {
      generateType = 'summary';
    } else {
      // 默认是天体介绍
      targetName = this.extractCelestialName(input);
    }

    // 解析听众水平
    if (input.includes('大学生') || input.includes('高级') || input.includes('专业')) {
      targetAudience = 'advanced';
    } else if (input.includes('中学生') || input.includes('中级')) {
      targetAudience = 'intermediate';
    }

    // 解析时长（提取数字）
    const durationMatch = input.match(/(\d+)\s*(分钟|分|min)/i);
    if (durationMatch) {
      duration = parseInt(durationMatch[1]) * 60;
    } else {
      const secondsMatch = input.match(/(\d+)\s*(秒|sec)/i);
      if (secondsMatch) {
        duration = parseInt(secondsMatch[1]);
      }
    }

    this.logger.info(`[内容生成工具] 解析: type=${generateType}, target=${targetName}, audience=${targetAudience}, duration=${duration}s`);

    let result;
    switch (generateType) {
      case 'celestial':
        result = await this.generateCelestialDescription({ objectName: targetName, targetAudience, duration });
        break;
      case 'course_intro':
        result = await this.generateCourseIntroduction({ courseName: targetName, topics: [], duration });
        break;
      case 'location':
        result = await this.generateLocationDescription({ location: targetName, observationTips: includeTips, targetAudience, duration });
        break;
      case 'summary':
        result = await this.generateCourseSummary({ topics: [], duration });
        break;
      default:
        result = { success: false, error: '无法理解请求' };
    }

    // 返回格式化的结果
    if (result.success && result.content) {
      console.log('\n' + '='.repeat(60));
      console.log('🎤 天文教学 - AI生成内容');
      console.log('='.repeat(60));
      console.log(result.content);
      console.log('='.repeat(60));
      console.log('\n✅ 此内容将显示在课件中并通过TTS播放\n');

      return {
        text: `✅ **天文教学内容已生成**\n\n📝 讲解内容：\n${result.content}\n\n_此内容已准备好显示在课件中并通过TTS语音播放_`,
        success: true,
        generated_content: result.content,
        display_in_courseware: true,
        tts_playback: true
      };
    }
    return result;
  }

  /**
   * 判断是否是地理位置相关输入
   */
  private isLocationInput(input: string): boolean {
    const locationKeywords = ['北京', '上海', '地理', '位置', '经纬度', '纬度', '经度', '观测地点', '地点'];
    return locationKeywords.some(keyword => input.includes(keyword));
  }

  /**
   * 判断是否是课程介绍相关输入
   */
  private isCourseIntroInput(input: string): boolean {
    const introKeywords = ['课程介绍', '开场白', '欢迎来到', '今天我们将'];
    return introKeywords.some(keyword => input.includes(keyword));
  }

  /**
   * 判断是否是总结相关输入
   */
  private isSummaryInput(input: string): boolean {
    const summaryKeywords = ['总结', '回顾', '结束', '感谢'];
    return summaryKeywords.some(keyword => input.includes(keyword));
  }

  /**
   * 从输入中提取地名
   */
  private extractLocationName(input: string): string {
    const cities = ['北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '南京', '武汉', '重庆'];
    for (const city of cities) {
      if (input.includes(city)) {
        return city;
      }
    }
    return '观测地点';
  }

  /**
   * 从输入中提取天体名
   */
  private extractCelestialName(input: string): string {
    const celestial = ['织女星', '天狼星', '北极星', '牛郎星', '天津四', '参宿四', '心宿二', '北斗七星', '夏季大三角'];
    for (const name of celestial) {
      if (input.includes(name)) {
        return name;
      }
    }
    return '恒星';
  }

  /**
   * 从输入中提取课程名
   */
  private extractCourseName(input: string): string {
    if (input.includes('夏季')) return '夏季星空课程';
    if (input.includes('冬季')) return '冬季星空课程';
    if (input.includes('春季')) return '春季星空课程';
    if (input.includes('秋季')) return '秋季星空课程';
    return '天文课程';
  }
}
