/**
 * 50枠限定×50%オフキャンペーン管理システム
 * 
 * 機能:
 * - キャンペーンの作成・管理
 * - 残り枠数の計算・追跡
 * - キャンペーンの自動循環
 * - 無料版ユーザーへの告知
 */

import * as fs from 'fs';
import * as path from 'path';

type MarketCode = 'EN' | 'JA' | 'ES' | 'KO' | 'AR' | 'PT-BR';

interface Campaign {
  id: string;
  name: string;
  discountRate: number; // 50 = 50%オフ
  totalSpots: number; // 50
  usedSpots: number; // 使用済み枠数
  remainingSpots: number; // 残り枠数
  startDate: string; // ISO string
  endDate?: string; // ISO string
  status: 'active' | 'completed' | 'paused';
  promoCode: string; // プロモコード
  markets: MarketCode[]; // 対象市場
}

interface CampaignUsage {
  campaignId: string;
  userId: string;
  market: MarketCode;
  usedAt: string; // ISO string
  orderId?: string;
}

interface CampaignData {
  campaigns: Campaign[];
  usage: CampaignUsage[];
}

const CAMPAIGNS_FILE = path.join(__dirname, '../data/campaigns/active-campaigns.json');
const USAGE_FILE = path.join(__dirname, '../data/campaigns/campaign-usage.json');

// データディレクトリの作成
function ensureDataDirectory() {
  const campaignsDir = path.dirname(CAMPAIGNS_FILE);
  if (!fs.existsSync(campaignsDir)) {
    fs.mkdirSync(campaignsDir, { recursive: true });
  }
}

// キャンペーンデータの読み込み
function loadCampaigns(): CampaignData {
  ensureDataDirectory();
  
  let campaigns: Campaign[] = [];
  let usage: CampaignUsage[] = [];
  
  if (fs.existsSync(CAMPAIGNS_FILE)) {
    const data = JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, 'utf-8'));
    campaigns = data.campaigns || [];
  }
  
  if (fs.existsSync(USAGE_FILE)) {
    const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
    usage = data.usage || [];
  }
  
  return { campaigns, usage };
}

// キャンペーンデータの保存
function saveCampaigns(data: CampaignData) {
  ensureDataDirectory();
  fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(data, null, 2));
  fs.writeFileSync(USAGE_FILE, JSON.stringify({ usage: data.usage }, null, 2));
}

// キャンペーンIDの生成
function generateCampaignId(): string {
  return `campaign_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// プロモコードの生成
function generatePromoCode(): string {
  const prefix = 'SPOT50';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
}

// 残り枠数を計算
function calculateRemainingSpots(campaign: Campaign): number {
  return Math.max(0, campaign.totalSpots - campaign.usedSpots);
}

// キャンペーンが満杯かチェック
function isCampaignFull(campaign: Campaign): boolean {
  return campaign.usedSpots >= campaign.totalSpots;
}

// 新しいキャンペーンを開始
export function startNewCampaign(markets: MarketCode[]): Campaign {
  const promoCode = generatePromoCode();
  const campaign: Campaign = {
    id: generateCampaignId(),
    name: `50枠限定×50%オフ - ${new Date().toISOString()}`,
    discountRate: 50,
    totalSpots: 50,
    usedSpots: 0,
    remainingSpots: 50,
    startDate: new Date().toISOString(),
    status: 'active',
    promoCode,
    markets,
  };
  
  const data = loadCampaigns();
  data.campaigns.push(campaign);
  saveCampaigns(data);
  
  return campaign;
}

// キャンペーンを使用（枠を消費）
export function useCampaignSpot(
  campaignId: string,
  userId: string,
  market: MarketCode,
  orderId?: string
): boolean {
  const data = loadCampaigns();
  const campaign = data.campaigns.find(c => c.id === campaignId);
  
  if (!campaign) {
    console.error(`Campaign not found: ${campaignId}`);
    return false;
  }
  
  if (isCampaignFull(campaign)) {
    console.error(`Campaign is full: ${campaignId}`);
    return false;
  }
  
  // 枠を消費
  campaign.usedSpots += 1;
  campaign.remainingSpots = calculateRemainingSpots(campaign);
  
  // 使用履歴を記録
  const usage: CampaignUsage = {
    campaignId,
    userId,
    market,
    usedAt: new Date().toISOString(),
    orderId,
  };
  data.usage.push(usage);
  
  // 満杯になったら完了状態に
  if (isCampaignFull(campaign)) {
    campaign.status = 'completed';
    campaign.endDate = new Date().toISOString();
  }
  
  saveCampaigns(data);
  return true;
}

// アクティブなキャンペーンを取得
export function getActiveCampaigns(market?: MarketCode): Campaign[] {
  const data = loadCampaigns();
  let campaigns = data.campaigns.filter(c => c.status === 'active');
  
  if (market) {
    campaigns = campaigns.filter(c => c.markets.includes(market));
  }
  
  return campaigns.map(c => ({
    ...c,
    remainingSpots: calculateRemainingSpots(c),
  }));
}

// キャンペーンを完了
export function completeCampaign(campaignId: string): void {
  const data = loadCampaigns();
  const campaign = data.campaigns.find(c => c.id === campaignId);
  
  if (campaign) {
    campaign.status = 'completed';
    campaign.endDate = new Date().toISOString();
    saveCampaigns(data);
  }
}

// キャンペーン監視と自動循環
export async function monitorAndRotateCampaigns(): Promise<void> {
  const activeCampaigns = getActiveCampaigns();
  
  for (const campaign of activeCampaigns) {
    // キャンペーンが満杯かチェック
    if (isCampaignFull(campaign)) {
      console.log(`Campaign ${campaign.id} is full. Completing...`);
      
      // キャンペーンを完了状態に
      completeCampaign(campaign.id);
      
      // 新しいキャンペーンを開始
      const newCampaign = startNewCampaign(campaign.markets);
      console.log(`New campaign started: ${newCampaign.id} (${newCampaign.promoCode})`);
      
      // TODO: 無料版ユーザーに新しいキャンペーンを告知
      // await notifyFreeUsersAboutNewCampaign(newCampaign);
    } else {
      // 残り枠が少ない場合（10枠以下）に告知
      const remainingSpots = calculateRemainingSpots(campaign);
      if (remainingSpots <= 10) {
        console.log(`Campaign ${campaign.id} has low spots: ${remainingSpots}`);
        // TODO: 無料版ユーザーに残り枠が少ないことを告知
        // await notifyFreeUsersAboutLowSpots(campaign);
      }
    }
  }
}

// 残り枠数を取得（告知用）
export function getRemainingSpotsForNotification(
  market: MarketCode
): { remainingSpots: number; promoCode: string } | null {
  const campaigns = getActiveCampaigns(market);
  
  if (campaigns.length === 0) {
    return null;
  }
  
  // 最新のキャンペーンを使用
  const campaign = campaigns[0];
  return {
    remainingSpots: calculateRemainingSpots(campaign),
    promoCode: campaign.promoCode,
  };
}

// CLI実行
if (require.main === module) {
  monitorAndRotateCampaigns()
    .then(() => {
      console.log('Campaign monitoring completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error monitoring campaigns:', error);
      process.exit(1);
    });
}
