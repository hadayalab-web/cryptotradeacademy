/**
 * Grokリアルタイムトレンド監視モジュール
 * 
 * Grokレビューに基づく改善:
 * - リアルタイムトレンド監視
 * - 急上昇インフルエンサーの自動抽出
 * - 通知機能
 */

import type { MarketCode } from '../types';
import { callGrok41FastReasoning } from '../../../scripts/direct-ai-api.js';

/**
 * トレンド監視結果
 */
export interface TrendMonitoringResult {
  trends: Array<{
    keyword: string;
    trendScore: number;
    growthRate: number;
    relatedCandidates: number;
  }>;
  risingInfluencers: Array<{
    id: string;
    name: string;
    platform: string;
    followerGrowth: number;
    engagementSpike: number;
    trendRelevance: number;
  }>;
  timestamp: string;
}

/**
 * リアルタイムトレンド監視
 */
export async function monitorTrends(options: {
  marketCode: MarketCode;
  niche: string;
  timeWindow?: '1h' | '6h' | '24h';
}): Promise<TrendMonitoringResult> {
  const {
    marketCode,
    niche,
    timeWindow = '24h',
  } = options;

  const prompt = `You are a real-time trend monitoring expert for crypto trading influencers.

**Task**: Monitor trends and identify rising influencers in the ${marketCode} market for ${niche} niche.

**Time Window**: ${timeWindow}

**Chain-of-Thought Process**:
Step 1: Analyze current trends in ${niche} space for ${marketCode} market
Step 2: Identify keywords and topics with high growth rate
Step 3: Find influencers whose engagement is spiking
Step 4: Calculate trend scores and growth rates
Step 5: Extract rising influencers with contact information

**Requirements**:
- Use X integration tools (x_keyword_search with realtime=true) when available
- Focus on influencers with:
  - Follower growth >10% in ${timeWindow}
  - Engagement spike >20%
  - Relevance to ${niche}
- Extract contact info (email or Telegram User ID)

Return JSON format:
{
  "trends": [
    {
      "keyword": "string",
      "trendScore": number (0-10),
      "growthRate": number (percentage),
      "relatedCandidates": number
    }
  ],
  "risingInfluencers": [
    {
      "id": "string",
      "name": "string",
      "platform": "X" | "Telegram" | "YouTube" | "LinkedIn" | "Instagram",
      "followerGrowth": number (percentage),
      "engagementSpike": number (percentage),
      "trendRelevance": number (0-10),
      "email": "string" | null,
      "telegram_user_id": "string" | null,
      "profile_url": "string"
    }
  ],
  "timestamp": "ISO string"
}`;

  try {
    const result = await callGrok41FastReasoning(prompt, {
      temperature: 0.7,
      maxTokens: 4000,
    });

    // JSON抽出
    let jsonText = result.text;
    if (jsonText.includes('```json')) {
      const jsonStart = jsonText.indexOf('```json') + 7;
      const jsonEnd = jsonText.indexOf('```', jsonStart);
      jsonText = jsonText.substring(jsonStart, jsonEnd).trim();
    } else if (jsonText.includes('```')) {
      const jsonStart = jsonText.indexOf('```') + 3;
      const jsonEnd = jsonText.indexOf('```', jsonStart);
      jsonText = jsonText.substring(jsonStart, jsonEnd).trim();
    }

    const parsed = JSON.parse(jsonText);
    return {
      trends: parsed.trends || [],
      risingInfluencers: parsed.risingInfluencers || [],
      timestamp: parsed.timestamp || new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Trend monitoring error:', error);
    throw error;
  }
}

/**
 * 高優先度候補の通知生成
 */
export async function generateNotificationForHighPriorityCandidate(options: {
  candidate: any;
  trendData?: TrendMonitoringResult;
}): Promise<{
  notification: string;
  priority: 'high' | 'medium' | 'low';
  reasons: string[];
}> {
  const { candidate, trendData } = options;

  const prompt = `Generate a notification for a high-priority affiliate candidate.

**Candidate**:
${JSON.stringify(candidate, null, 2)}

${trendData ? `**Trend Context**:
${JSON.stringify(trendData.trends.slice(0, 3), null, 2)}` : ''}

**Requirements**:
- Clear, actionable notification
- Highlight why this candidate is high priority
- Include key metrics (followers, engagement, trend relevance)
- Suggest next actions

Return JSON format:
{
  "notification": "string",
  "priority": "high" | "medium" | "low",
  "reasons": ["string"]
}`;

  try {
    const result = await callGrok41FastReasoning(prompt, {
      temperature: 0.7,
      maxTokens: 1000,
    });

    // JSON抽出
    let jsonText = result.text;
    if (jsonText.includes('```json')) {
      const jsonStart = jsonText.indexOf('```json') + 7;
      const jsonEnd = jsonText.indexOf('```', jsonStart);
      jsonText = jsonText.substring(jsonStart, jsonEnd).trim();
    } else if (jsonText.includes('```')) {
      const jsonStart = jsonText.indexOf('```') + 3;
      const jsonEnd = jsonText.indexOf('```', jsonStart);
      jsonText = jsonText.substring(jsonStart, jsonEnd).trim();
    }

    const parsed = JSON.parse(jsonText);
    return {
      notification: parsed.notification || '',
      priority: parsed.priority || 'medium',
      reasons: parsed.reasons || [],
    };
  } catch (error: any) {
    console.error('Notification generation error:', error);
    throw error;
  }
}
