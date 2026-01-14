// Eメール配信用のHTMLフォーマット関数
// services/email/messages/user/en/regular.en.js

const fs = require('fs');
const path = require('path');

/**
 * ロゴをbase64エンコードして取得
 * @param {boolean} transparent - 透明背景版を使用するか
 * @returns {string|null} base64エンコードされたロゴのData URL
 */
function getLogoBase64(transparent = true) {
  try {
    // __dirnameは services/email/messages/user/en/ を指す
    // プロジェクトルートへのパス: ../../../../../
    const projectRoot = path.resolve(__dirname, '../../../../..');
    const logoPath = transparent
      ? path.join(projectRoot, 'data/vsl-assets/logos/cryptotradeacademy-logo-transparent.png')
      : path.join(projectRoot, 'data/vsl-assets/logos/cryptotradeacademy-logo.png');
    
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const base64Logo = logoBuffer.toString('base64');
      return `data:image/png;base64,${base64Logo}`;
    }
    console.warn(`[Email] Logo file not found: ${logoPath}`);
    return null;
  } catch (error) {
    console.warn(`[Email] Error loading logo: ${error.message}`);
    return null;
  }
}

function formatPercent(pct) {
  if (pct == null || Number.isNaN(pct)) return 'n/a';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function getEmailStyles() {
  return `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f5f5f5;
      }
      @media only screen and (max-width: 600px) {
        body {
          padding: 10px;
        }
        .email-container {
          padding: 20px;
        }
        .header {
          padding: 20px 15px;
        }
        .header h1 {
          font-size: 24px;
        }
        .header h2 {
          font-size: 18px;
        }
        .header .logo {
          max-width: 150px;
        }
        .news-section {
          padding: 15px;
          margin: 20px 0;
        }
        .section-header {
          font-size: 18px;
        }
        .closing-cta {
          padding: 20px;
        }
        .cta-button {
          padding: 14px 28px;
          font-size: 16px;
        }
      }
      .email-container {
        background-color: #ffffff;
        border-radius: 8px;
        padding: 30px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .header {
        text-align: center;
        border-bottom: 3px solid #007bff;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .header h1 {
        color: #007bff;
        margin: 0;
        font-size: 28px;
      }
      .header .timestamp {
        color: #666;
        font-size: 14px;
        margin-top: 10px;
      }
      .news-section {
        margin: 30px 0;
        padding: 25px;
        border-left: 4px solid #007bff;
        background-color: #f8f9fa;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        transition: box-shadow 0.3s ease;
      }
      .news-section:hover {
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      }
      .section-header {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 15px;
        color: #007bff;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .section-subheader {
        font-size: 14px;
        color: #666;
        margin-bottom: 15px;
        font-style: italic;
      }
      .trap-score-visualization {
        background: linear-gradient(90deg, #ff6b6b 0%, #ffa500 50%, #4ecdc4 100%);
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
        text-align: center;
      }
      .score-bar {
        background-color: rgba(255,255,255,0.3);
        height: 30px;
        border-radius: 15px;
        position: relative;
        margin: 10px 0;
      }
      .score-fill {
        background-color: #fff;
        height: 100%;
        border-radius: 15px;
        transition: width 0.3s ease;
      }
      .score-value {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-weight: bold;
        color: #333;
      }
      .risk-indicator {
        display: inline-block;
        padding: 5px 15px;
        border-radius: 20px;
        font-weight: bold;
        margin-top: 10px;
      }
      .risk-indicator.critical {
        background-color: #ff6b6b;
        color: #fff;
      }
      .risk-indicator.high {
        background-color: #ffa500;
        color: #fff;
      }
      .risk-indicator.moderate {
        background-color: #ffd700;
        color: #333;
      }
      .risk-indicator.low {
        background-color: #4ecdc4;
        color: #fff;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      .data-table th,
      .data-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      .data-table th {
        background-color: #007bff;
        color: #fff;
        font-weight: bold;
      }
      .data-table tr:hover {
        background-color: #f8f9fa;
      }
      .indicator {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
      }
      .indicator.high {
        background-color: #ffa500;
        color: #fff;
      }
      .indicator.critical {
        background-color: #ff6b6b;
        color: #fff;
      }
      .indicator.normal {
        background-color: #4ecdc4;
        color: #fff;
      }
      .exit-map {
        margin: 20px 0;
        padding: 20px;
        background-color: #f8f9fa;
        border-radius: 8px;
      }
      .price-chart {
        position: relative;
        height: 300px;
        background: linear-gradient(to top, #e3f2fd 0%, #fff 100%);
        border: 2px solid #007bff;
        border-radius: 4px;
        margin: 20px 0;
      }
      .current-price {
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        background-color: #007bff;
        color: #fff;
        padding: 10px 20px;
        border-radius: 4px;
        font-weight: bold;
      }
      .zone {
        position: absolute;
        left: 0;
        right: 0;
        padding: 10px;
        background-color: rgba(255,107,107,0.8);
        border-left: 4px solid #ff6b6b;
        border-radius: 4px;
        margin: 5px 0;
      }
      .zone.high-priority {
        background-color: rgba(255,107,107,0.9);
        border-left-color: #ff0000;
      }
      .zone-label {
        font-weight: bold;
        display: block;
      }
      .zone-action {
        font-size: 12px;
        color: #666;
      }
      .footer {
        text-align: center;
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        color: #666;
        font-size: 12px;
      }
      .trap-defense-breakdown {
        margin: 20px 0;
        padding: 20px;
        background-color: #f8f9fa;
        border-left: 4px solid #007bff;
        border-radius: 4px;
      }
      .trap-components {
        display: flex;
        flex-direction: column;
        gap: 15px;
        margin-top: 15px;
      }
      .component {
        padding: 15px;
        background-color: #fff;
        border-radius: 4px;
        border-left: 3px solid #007bff;
      }
      .component-label {
        font-weight: bold;
        display: block;
        margin-bottom: 8px;
        color: #333;
      }
      .component-score {
        font-size: 18px;
        font-weight: bold;
        color: #007bff;
        margin-bottom: 5px;
      }
      .component-trend {
        font-size: 12px;
        color: #666;
      }
      .trap-detection-rationale {
        margin: 20px 0;
        padding: 20px;
        background-color: #fff3cd;
        border-left: 4px solid #ffc107;
        border-radius: 4px;
      }
      .trap-detection-rationale ul {
        margin: 10px 0;
        padding-left: 20px;
      }
      .trap-detection-rationale li {
        margin: 5px 0;
      }
      .gemini-content-preview {
        margin: 20px 0;
        padding: 20px;
        background-color: #e7f3ff;
        border-left: 4px solid #2196f3;
        border-radius: 4px;
      }
      .gemini-placeholder {
        padding: 30px;
        text-align: center;
        color: #666;
        font-style: italic;
      }
      .psychological-support-detailed {
        margin: 20px 0;
        padding: 20px;
        background-color: #e8f5e9;
        border-left: 4px solid #4caf50;
        border-radius: 4px;
      }
      .emotional-analysis {
        margin-top: 15px;
      }
      .advice-section {
        margin-top: 20px;
        padding: 15px;
        background-color: #fff;
        border-radius: 4px;
      }
      .advice-section h5 {
        margin-top: 0;
        color: #4caf50;
      }
      .support-message {
        margin-top: 15px;
        padding: 10px;
        background-color: #f1f8e9;
        border-left: 3px solid #4caf50;
        border-radius: 4px;
        font-style: italic;
      }
      .sentiment-breakdown {
        margin: 20px 0;
        padding: 20px;
        background-color: #f8f9fa;
        border-left: 4px solid #007bff;
        border-radius: 4px;
      }
      .sentiment-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }
      .sentiment-table th,
      .sentiment-table td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      .sentiment-table th {
        background-color: #007bff;
        color: #fff;
        font-weight: bold;
      }
      .usp-badge {
        display: inline-block;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        margin-left: 10px;
        vertical-align: middle;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      }
      .usp-badge.usp1 {
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        color: #fff;
      }
      .usp-badge.usp2 {
        background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
        color: #fff;
      }
      .usp-badge.usp3 {
        background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
        color: #fff;
      }
      .mental-trainer-badge,
      .mental-coach-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 15px;
        font-size: 10px;
        font-weight: 600;
        margin-left: 8px;
        vertical-align: middle;
        background-color: #6c757d;
        color: #fff;
      }
      .opening-enhanced {
        position: relative;
      }
      .news-importance {
        display: inline-block;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        margin-left: 10px;
      }
      .news-importance.critical {
        background-color: #ff6b6b;
        color: #fff;
      }
      .news-importance.high {
        background-color: #ffa500;
        color: #fff;
      }
      .news-importance.medium {
        background-color: #ffd700;
        color: #333;
      }
      .closing-enhanced {
        margin-top: 30px;
      }
      .closing-summary {
        margin: 15px 0;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 4px;
      }
      .closing-cta {
        margin: 20px 0;
        text-align: center;
      }
      .closing-cta a {
        display: inline-block;
        padding: 12px 30px;
        background-color: #007bff;
        color: #fff;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
      }
      .cryptoquant-deep-dive {
        margin: 30px 0;
        padding: 25px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 8px;
        color: #fff;
      }
      .cryptoquant-deep-dive h3 {
        color: #fff;
        margin-top: 0;
        font-size: 24px;
      }
      .cryptoquant-deep-dive .cto-badge {
        display: inline-block;
        padding: 5px 12px;
        background-color: rgba(255,255,255,0.3);
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        margin-left: 10px;
      }
      .cryptoquant-section {
        margin: 20px 0;
        padding: 20px;
        background-color: rgba(255,255,255,0.95);
        border-radius: 6px;
        color: #333;
      }
      .cryptoquant-section h4 {
        color: #667eea;
        margin-top: 0;
        border-bottom: 2px solid #667eea;
        padding-bottom: 10px;
      }
      .cryptoquant-metric {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid #eee;
      }
      .cryptoquant-metric:last-child {
        border-bottom: none;
      }
      .cryptoquant-metric-label {
        font-weight: bold;
        color: #555;
      }
      .cryptoquant-metric-value {
        color: #333;
        font-weight: bold;
      }
      .cryptoquant-insight {
        margin-top: 15px;
        padding: 15px;
        background-color: #fff3cd;
        border-left: 4px solid #ffc107;
        border-radius: 4px;
        font-size: 14px;
      }
      .cryptoquant-insight strong {
        color: #856404;
      }
      .trap-defense-wisdom {
        margin: 20px 0;
        padding: 20px;
        background-color: #fff;
        border-left: 5px solid #ff6b6b;
        border-radius: 4px;
      }
      .trap-defense-wisdom h4 {
        color: #ff6b6b;
        margin-top: 0;
      }
      .wisdom-item {
        margin: 15px 0;
        padding: 12px;
        background-color: #fff5f5;
        border-radius: 4px;
      }
      .wisdom-item strong {
        color: #ff6b6b;
      }
      .differentiation-badge {
        display: inline-block;
        padding: 8px 15px;
        background-color: #28a745;
        color: #fff;
        border-radius: 20px;
        font-size: 11px;
        font-weight: bold;
        margin: 5px 5px 5px 0;
      }
      .mental-trainer-section {
        margin: 30px 0;
        padding: 25px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 8px;
        color: #fff;
      }
      .mental-trainer-section h3 {
        color: #fff;
        margin-top: 0;
        font-size: 22px;
      }
      .mental-trainer-badge {
        display: inline-block;
        padding: 5px 12px;
        background-color: rgba(255,255,255,0.3);
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        margin-left: 10px;
      }
      .mental-training-content {
        margin-top: 20px;
        padding: 20px;
        background-color: rgba(255,255,255,0.95);
        border-radius: 6px;
        color: #333;
      }
      .mental-training-content p {
        line-height: 1.8;
        margin: 10px 0;
      }
      .mental-training-highlight {
        padding: 15px;
        background-color: #fff3cd;
        border-left: 4px solid #ffc107;
        border-radius: 4px;
        margin: 15px 0;
        color: #856404;
      }
      .mental-training-highlight strong {
        color: #856404;
        font-size: 16px;
      }
      .synergy-note {
        margin-top: 20px;
        padding: 15px;
        background-color: rgba(255,255,255,0.2);
        border-radius: 4px;
        font-size: 13px;
        border-left: 3px solid #fff;
      }
      .synergy-note strong {
        color: #fff;
      }
      .mental-coach-section {
        margin: 30px 0;
        padding: 25px;
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
        border-radius: 8px;
        color: #fff;
        border-left: 5px solid #fff;
      }
      .mental-coach-section h4 {
        color: #fff;
        margin-top: 0;
        font-size: 20px;
        font-weight: bold;
      }
      .mental-block-detection {
        margin: 20px 0;
        padding: 20px;
        background-color: rgba(255,255,255,0.95);
        border-radius: 6px;
        color: #333;
        border-left: 4px solid #ff6b6b;
      }
      .mental-block-detection h5 {
        color: #ff6b6b;
        margin-top: 0;
        font-size: 16px;
        font-weight: bold;
      }
      .mental-block-item {
        margin: 15px 0;
        padding: 15px;
        background-color: #fff5f5;
        border-radius: 4px;
        border-left: 3px solid #ff6b6b;
      }
      .mental-block-item strong {
        color: #ff6b6b;
        display: block;
        margin-bottom: 8px;
      }
      .block-removal-advice {
        margin: 15px 0;
        padding: 15px;
        background-color: #fff3cd;
        border-left: 4px solid #ffc107;
        border-radius: 4px;
        color: #856404;
      }
      .block-removal-advice strong {
        color: #856404;
        display: block;
        margin-bottom: 8px;
      }
      .coaching-message {
        margin: 15px 0;
        padding: 15px;
        background-color: #d1ecf1;
        border-left: 4px solid #0c5460;
        border-radius: 4px;
        color: #0c5460;
      }
      .coaching-message strong {
        color: #0c5460;
        display: block;
        margin-bottom: 8px;
      }
      @media (max-width: 600px) {
        body {
          padding: 10px;
        }
        .email-container {
          padding: 20px;
        }
        .news-section {
          padding: 15px;
        }
        .trap-components {
          flex-direction: column;
        }
      }
    </style>
  `;
}

function formatRegularBriefingHTML({
  now,
  inflow,
  mpi,
  sentimentLabel,
  priceUsd,
  change24h,
  score,
  tradeSignal,
  trap,
  aiAnalysis,
  stats,
  trapScore,
  whaleFlows,
  liquidations,
  noTradeAlert,
  trapRisk,
  exitMap,
  trapDetection,
  marketBug,
  trapAlert,
  divergenceSignal,
  psychologicalSupport,
  hasGeminiContent = false,
  gptReporterAnalysis,
  grokXAnalysis,
  geminiImageUrl,
  geminiVideoUrl,
  cqDeep = null, // CryptoQuant深掘りデータ
  showContent = null, // Gemini番組プロデューサーが生成したコンテンツ
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  // Trap Alert判定
  let dirEmoji, dirLabel;
  if (trapAlert && trapAlert.alert) {
    dirEmoji = trapAlert.severity === 'CRITICAL' ? '🚨' :
               trapAlert.severity === 'HIGH' ? '⚠️' :
               trapAlert.severity === 'MEDIUM' ? '⚡' : '🛡️';
    if (trapAlert.recommendation === 'AVOID_LONG') {
      dirLabel = '🛡️ Trap Alert: Avoid Long';
    } else if (trapAlert.recommendation === 'AVOID_SHORT') {
      dirLabel = '🛡️ Trap Alert: Avoid Short';
    } else {
      dirLabel = '🛡️ Trap Alert: Standby';
    }
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  // Phase 1: USP1 - Trap Defense Engine 詳細可視化
  // Trap Scoreの詳細可視化（内訳表示）
  // retailFomoはgrokXAnalysisから取得（関数の最初で定義）
  const retailFomoValue = (grokXAnalysis && typeof grokXAnalysis === 'object' && grokXAnalysis.retailFomo) 
    ? grokXAnalysis.retailFomo 
    : 50;
  
  const trapScoreBreakdownHTML = trapDetection && trapDetection.trapScore != null ? (() => {
    const details = trapDetection.details || {};
    const multipleDivergences = details.multipleDivergences || 0;
    const onchainSocialDivergence = details.onchainSocialDivergence || 0;
    const priceOnchainDivergence = details.priceOnchainDivergence || false;
    const priceSocialDivergence = details.priceSocialDivergence || false;
    
    // 各コンポーネントのスコアを計算（簡易版）
    const whaleDumpScore = Math.min(100, Math.abs(onchainSocialDivergence) * 2);
    const fomoScore = retailFomoValue;
    const minerSellingScore = (mpi ?? 0) > 0 ? Math.min(100, mpi * 10) : 0;
    const liquidationScore = liquidations && (typeof liquidations === 'number' ? liquidations : liquidations.totalLiquidations) > 0 
      ? Math.min(100, ((typeof liquidations === 'number' ? liquidations : liquidations.totalLiquidations) / 1000000) * 2)
      : 0;
    
    return `
      <div class="trap-defense-breakdown">
        <h4>🛡️ Trap Defense Engine - Detailed Breakdown <span class="usp-badge usp1">USP1</span></h4>
        <div class="trap-components">
          <div class="component">
            <span class="component-label">🐋 Whale Dump Detection</span>
            <div class="component-score">Score: ${Math.round(whaleDumpScore)}/100</div>
            <div class="component-trend">${onchainSocialDivergence > 0 ? '↑' : onchainSocialDivergence < 0 ? '↓' : '→'} ${Math.abs(onchainSocialDivergence).toFixed(1)} divergence</div>
          </div>
          <div class="component">
            <span class="component-label">📊 Retail FOMO Detection</span>
            <div class="component-score">Score: ${Math.round(fomoScore)}/100</div>
            <div class="component-trend">${fomoScore >= 70 ? '⚠️ High FOMO' : fomoScore <= 30 ? '✅ Low FOMO' : '→ Normal'}</div>
          </div>
          <div class="component">
            <span class="component-label">⛏ Miner Selling Detection</span>
            <div class="component-score">Score: ${Math.round(minerSellingScore)}/100</div>
            <div class="component-trend">MPI: ${(mpi ?? 0).toFixed(2)}</div>
          </div>
          <div class="component">
            <span class="component-label">💥 Liquidation Cascade Detection</span>
            <div class="component-score">Score: ${Math.round(liquidationScore)}/100</div>
            <div class="component-trend">${liquidations && (typeof liquidations === 'number' ? liquidations : liquidations.totalLiquidations) > 0 ? '⚠️ Active' : '✅ None'}</div>
          </div>
        </div>
      </div>
    `;
  })() : '';

  // トラップ検出の根拠表示
  const trapDetectionRationaleHTML = trapAlert && trapAlert.alert && trapDetection ? (() => {
    const details = trapDetection.details || {};
    const trapType = trapDetection.trapType || 'UNKNOWN';
    const multipleDivergences = details.multipleDivergences || 0;
    const onchainSocialDivergence = details.onchainSocialDivergence || 0;
    
    return `
      <div class="trap-detection-rationale">
        <h4>🔍 Detection Rationale <span class="usp-badge usp1">USP1</span></h4>
        <p><strong>Trap Type:</strong> ${trapType}</p>
        <ul>
          <li>Exchange Netflow: ${(inflow ?? 0) >= 0 ? '+' : ''}${Math.abs(inflow ?? 0).toFixed(0)} BTC ${(inflow ?? 0) >= 0 ? '(Whale selling)' : '(Whale accumulation)'}</li>
          <li>Retail FOMO: ${Math.round(retailFomoValue)}/100 ${retailFomoValue >= 70 ? '(High retail buying)' : ''}</li>
          <li>Multiple Divergences: ${multipleDivergences} detected</li>
          <li>Onchain-Social Divergence: ${onchainSocialDivergence.toFixed(1)}</li>
          <li>Timeframe Consistency: ${details.highResolutionEnabled ? 'High-resolution analysis enabled' : 'Standard analysis'}</li>
        </ul>
        <p><strong>Recommendation:</strong> ${trapAlert.recommendation || 'STANDBY'}</p>
      </div>
    `;
  })() : '';

  // Trap Score可視化（基本）
  const trapScoreHTML = trapScore != null ? `
    <div class="trap-score-visualization">
      <h3>🎯 Trap Score <span class="usp-badge usp1">USP1</span></h3>
      <div class="score-bar">
        <div class="score-fill" style="width: ${trapScore}%"></div>
        <span class="score-value">${Math.round(trapScore)}/100</span>
      </div>
      <div class="risk-indicator ${trapScore >= 60 ? 'critical' : trapScore >= 40 ? 'high' : trapScore >= 20 ? 'moderate' : 'low'}">
        ${trapScore >= 60 ? '🚨 HIGH RISK' : trapScore >= 40 ? '⚠️ MODERATE' : '✅ LOW'}
      </div>
    </div>
  ` : '';

  // データテーブル
  const dataTableHTML = `
    <table class="data-table">
      <tr>
        <th>Metric</th>
        <th>Value</th>
        <th>Status</th>
      </tr>
      <tr>
        <td>💰 BTC Price</td>
        <td>${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)</td>
        <td>-</td>
      </tr>
      <tr>
        <td>📊 Exchange Netflow</td>
        <td>${(inflow ?? 0) >= 0 ? 'Inflow' : 'Outflow'} ${Math.abs(inflow ?? 0).toFixed(0)} BTC</td>
        <td>-</td>
      </tr>
      <tr>
        <td>⛏ Miners' Position Index</td>
        <td>${(mpi ?? 0).toFixed(2)}</td>
        <td>-</td>
      </tr>
      ${whaleFlows && whaleFlows.whaleRatio != null ? `
      <tr>
        <td>🐋 Whale Ratio</td>
        <td>${(whaleFlows.whaleRatio * 100).toFixed(1)}%</td>
        <td><span class="indicator ${whaleFlows.isHighPressure ? 'high' : 'normal'}">${whaleFlows.isHighPressure ? 'High Pressure' : 'Normal'}</span></td>
      </tr>
      ` : ''}
      ${liquidations && (typeof liquidations === 'number' ? liquidations : liquidations.totalLiquidations) > 0 ? `
      <tr>
        <td>💥 24h Liquidations</td>
        <td>${formatUsd(typeof liquidations === 'number' ? liquidations : liquidations.totalLiquidations)}</td>
        <td><span class="indicator critical">Critical</span></td>
      </tr>
      ` : ''}
    </table>
  `;

  // Exit Map可視化
  const exitMapHTML = exitMap && exitMap.hasActivePosition ? `
    <div class="exit-map">
      <h3>🗺️ Exit Map</h3>
      <p><strong>Position Status:</strong> ${exitMap.positionStatus}</p>
      ${exitMap.unrealizedPnlPct !== 0 ? `
      <p><strong>Unrealized P&L:</strong> ${exitMap.unrealizedPnlPct > 0 ? '+' : ''}${exitMap.unrealizedPnlPct.toFixed(2)}% (${formatUsd(exitMap.unrealizedPnl)})</p>
      ` : ''}
      ${exitMap.exitMap.zones && exitMap.exitMap.zones.length > 0 ? `
      <div class="price-chart">
        <div class="current-price">Current: ${formatUsd(priceUsd)}</div>
        ${exitMap.exitMap.zones.slice(0, 3).map((zone, index) => `
        <div class="zone ${zone.priority === 'HIGH' ? 'high-priority' : ''}" style="top: ${(index + 1) * 15}%">
          <span class="zone-label">Zone ${zone.zone}: ${formatUsd(zone.price)}</span>
          <span class="zone-action">Take ${zone.takeProfitPct}%</span>
        </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
  ` : '';

  // GPT Reporter分析
  const gptNewsText = gptReporterAnalysis || aiAnalysis || 'Analyzing data...';
  const gptNewsLimit = 2000; // Eメールでは制限を緩和
  const gptNewsDisplay = gptNewsText.length > gptNewsLimit 
    ? `${gptNewsText.slice(0, gptNewsLimit)}…` 
    : gptNewsText;

  // CryptoQuant Deep Dive Analysis - GPT CTOとしての深掘り解説
  const cryptoquantDeepDiveHTML = (() => {
    if (!cqDeep) return '';
    
    const exchangeInflow = cqDeep.exchangeInflow ?? 0;
    const exchangeOutflow = cqDeep.exchangeOutflow ?? 0;
    const netflow = cqDeep.netflow ?? inflow ?? 0;
    const minerMPI = cqDeep.minerMPI ?? mpi ?? 0;
    const whaleRatio = cqDeep.whaleFlows?.whaleRatio ?? whaleFlows?.whaleRatio ?? null;
    const liquidationsData = cqDeep.liquidations ?? liquidations ?? null;
    const longShortRatio = cqDeep.longShortRatio ?? null;
    const deepTrapScore = cqDeep.trapScore ?? trapScore ?? null;
    
    return `
      <div class="cryptoquant-deep-dive">
        <h3>🔬 CryptoQuant Deep Dive Analysis <span class="cto-badge">GPT CTO Analysis</span></h3>
        <p style="margin-bottom: 20px; font-size: 14px; opacity: 0.95;">
          <strong>🎯 Mission:</strong> "Don't fall into traps!" - Trap Defence wisdom for traders
          <span class="differentiation-badge">vs YouTube</span>
          <span class="differentiation-badge">vs BUY/SELL Services</span>
        </p>

        <!-- Exchange Flows -->
        <div class="cryptoquant-section">
          <h4>📊 Exchange Flows</h4>
          <div class="cryptoquant-metric">
            <span class="cryptoquant-metric-label">Exchange Inflow:</span>
            <span class="cryptoquant-metric-value">${exchangeInflow.toFixed(0)} BTC</span>
          </div>
          <div class="cryptoquant-metric">
            <span class="cryptoquant-metric-label">Exchange Outflow:</span>
            <span class="cryptoquant-metric-value">${exchangeOutflow.toFixed(0)} BTC</span>
          </div>
          <div class="cryptoquant-metric">
            <span class="cryptoquant-metric-label">Net Flow:</span>
            <span class="cryptoquant-metric-value">${netflow >= 0 ? '+' : ''}${netflow.toFixed(0)} BTC</span>
          </div>
          ${whaleRatio != null ? `
          <div class="cryptoquant-metric">
            <span class="cryptoquant-metric-label">Whale Ratio:</span>
            <span class="cryptoquant-metric-value">${(whaleRatio * 100).toFixed(1)}%</span>
          </div>
          ` : ''}
          <div class="cryptoquant-insight">
            <strong>🛡️ Trap Defence Insight:</strong> ${netflow > 2000 
              ? 'High exchange inflow indicates whale selling pressure. This is a classic trap pattern - retail FOMO while whales exit. <strong>Don\'t fall into traps!</strong>' 
              : netflow < -2000 
              ? 'Strong exchange outflow suggests whale accumulation. However, wait for confirmation - premature entry can still be a trap.' 
              : 'Exchange flows are balanced. No clear trap signal, but maintain defensive stance.'}
          </div>
        </div>

        <!-- Market Indicators -->
        <div class="cryptoquant-section">
          <h4>📈 Market Indicators</h4>
          ${deepTrapScore != null ? `
          <div class="cryptoquant-metric">
            <span class="cryptoquant-metric-label">Trap Score:</span>
            <span class="cryptoquant-metric-value">${Math.round(deepTrapScore)}/100</span>
          </div>
          ` : ''}
          ${longShortRatio != null ? `
          <div class="cryptoquant-metric">
            <span class="cryptoquant-metric-label">Long/Short Ratio:</span>
            <span class="cryptoquant-metric-value">${longShortRatio.toFixed(2)}</span>
          </div>
          ` : ''}
          ${liquidationsData ? `
          <div class="cryptoquant-metric">
            <span class="cryptoquant-metric-label">24h Liquidations:</span>
            <span class="cryptoquant-metric-value">${formatUsd(typeof liquidationsData === 'number' ? liquidationsData : liquidationsData.totalLiquidations)}</span>
          </div>
          ` : ''}
          <div class="cryptoquant-insight">
            <strong>🛡️ Trap Defence Insight:</strong> ${deepTrapScore != null && deepTrapScore >= 60 
              ? 'High trap score detected! Multiple divergences indicate market manipulation. <strong>Don\'t fall into traps!</strong> Standby until clear advantage emerges.' 
              : deepTrapScore != null && deepTrapScore >= 40 
              ? 'Moderate trap risk. Exercise caution - 70% of the time, do nothing. Defend until clear advantage.' 
              : 'Market indicators show balanced conditions. Maintain defensive stance and wait for clear signals.'}
          </div>
        </div>

        <!-- Miner Flows -->
        <div class="cryptoquant-section">
          <h4>⛏ Miner Flows</h4>
          <div class="cryptoquant-metric">
            <span class="cryptoquant-metric-label">Miner Position Index (MPI):</span>
            <span class="cryptoquant-metric-value">${minerMPI.toFixed(2)}</span>
          </div>
          <div class="cryptoquant-insight">
            <strong>🛡️ Trap Defence Insight:</strong> ${minerMPI > 0.5 
              ? 'Miners are selling (MPI > 0.5). This often precedes price corrections. <strong>Don\'t fall into traps!</strong> Wait for miner selling to subside.' 
              : minerMPI < -0.5 
              ? 'Miners are accumulating (MPI < -0.5). This is bullish, but wait for confirmation from other indicators.' 
              : 'Miner flows are neutral. No clear directional signal from miners.'}
          </div>
        </div>

        <!-- Network Indicators -->
        <div class="cryptoquant-section">
          <h4>🌐 Network Indicators</h4>
          <div class="cryptoquant-metric">
            <span class="cryptoquant-metric-label">Network Activity:</span>
            <span class="cryptoquant-metric-value">Monitoring</span>
          </div>
          <div class="cryptoquant-insight">
            <strong>🛡️ Trap Defence Insight:</strong> Network indicators provide context for price movements. 
            When network activity diverges from price action, it often signals traps. 
            <strong>Don't fall into traps!</strong> Always cross-reference network data with exchange flows and miner activity.
          </div>
        </div>

        <!-- Fund Data -->
        ${liquidationsData || longShortRatio != null ? `
        <div class="cryptoquant-section">
          <h4>💰 Fund Data</h4>
          ${liquidationsData ? `
          <div class="cryptoquant-metric">
            <span class="cryptoquant-metric-label">24h Liquidations:</span>
            <span class="cryptoquant-metric-value">${formatUsd(typeof liquidationsData === 'number' ? liquidationsData : liquidationsData.totalLiquidations)}</span>
          </div>
          ` : ''}
          ${longShortRatio != null ? `
          <div class="cryptoquant-metric">
            <span class="cryptoquant-metric-label">Long/Short Ratio:</span>
            <span class="cryptoquant-metric-value">${longShortRatio.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="cryptoquant-insight">
            <strong>🛡️ Trap Defence Insight:</strong> ${liquidationsData && (typeof liquidationsData === 'number' ? liquidationsData : liquidationsData.totalLiquidations) > 500000000 
              ? 'High liquidations indicate market stress. This can trigger cascading liquidations - a classic trap. <strong>Don\'t fall into traps!</strong> Wait for liquidation pressure to subside.' 
              : longShortRatio != null && longShortRatio > 1.5 
              ? 'High long/short ratio (>1.5) indicates over-leveraged longs. This is a trap setup - expect short squeezes or cascading liquidations.' 
              : 'Fund data shows balanced conditions. No extreme leverage imbalances detected.'}
          </div>
        </div>
        ` : ''}

        <!-- Trap Defence Wisdom -->
        <div class="trap-defense-wisdom">
          <h4>🛡️ Trap Defence Wisdom - "Don't Fall Into Traps!"</h4>
          <div class="wisdom-item">
            <strong>Rule #1:</strong> 70% of the time, do nothing. Defend until clear advantage emerges.
          </div>
          <div class="wisdom-item">
            <strong>Rule #2:</strong> When exchange flows show whale selling while retail FOMO is high, it's a trap. Standby.
          </div>
          <div class="wisdom-item">
            <strong>Rule #3:</strong> Multiple divergences (onchain vs social, price vs onchain) = trap pattern. Avoid entry.
          </div>
          <div class="wisdom-item">
            <strong>Rule #4:</strong> High liquidations + high long/short ratio = liquidation cascade risk. Don't be the exit liquidity.
          </div>
          <div class="wisdom-item">
            <strong>Rule #5:</strong> Miner selling (MPI > 0.5) often precedes corrections. Wait for miner flows to normalize.
          </div>
        </div>

        <!-- Differentiation -->
        <div style="margin-top: 20px; padding: 15px; background-color: rgba(255,255,255,0.2); border-radius: 4px;">
          <p style="margin: 0; font-size: 13px;">
            <strong>🎯 How We're Different:</strong>
            <br>• <strong>vs YouTube:</strong> We provide real-time on-chain data analysis, not just price predictions
            <br>• <strong>vs BUY/SELL Services:</strong> We focus on trap avoidance (AVOID_LONG/AVOID_SHORT/STANDBY), not entry signals
            <br>• <strong>Our Edge:</strong> CryptoQuant Professional data + GPT CTO analysis + Trap Defence philosophy
          </p>
        </div>
      </div>
    `;
  })();

  // Grok X分析
  const grokXDisplay = grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()
    ? (grokXAnalysis.length > 1500 ? `${grokXAnalysis.slice(0, 1500)}…` : grokXAnalysis)
    : 'Fetching data...';

  // Phase 3: USP3 - Dr. Grok's Psychological Support 感情エンゲージメント強化
  // 「辛口な心理カウンセラー」と「メンタルコーチ」としての役割を強化
  const psychologicalHTML = psychologicalSupport && psychologicalSupport.psychologicalState !== 'UNKNOWN' ? `
    <div class="psychological-support-detailed">
      <h4>💊 Dr. Grok's Psychological Support <span class="usp-badge usp3">USP3</span></h4>
      <p style="font-style: italic; color: #666; margin-bottom: 15px;">
        <strong>Role:</strong> Spicy Psychological Counselor & Mental Coach - Detecting mental blocks and unlocking your trading potential
      </p>
      <div class="emotional-analysis">
        <p>
          <strong>Your Current State:</strong>
          ${psychologicalSupport.psychologicalState}
        </p>
        <p>
          <strong>Risk Level:</strong> ${psychologicalSupport.psychologicalRisk}
        </p>
        ${psychologicalSupport.mentalBlocks && psychologicalSupport.mentalBlocks.length > 0 ? `
        <div class="mental-coach-section">
          <h4>🔍 Mental Block Analysis (辛口な心理カウンセラー診断)</h4>
          ${psychologicalSupport.mentalBlocks.map(block => `
            <div class="mental-block-detection">
              <h5>${block.severity === 'CRITICAL' ? '🚨' : block.severity === 'HIGH' ? '⚠️' : '💡'} ${block.type} Block Detected</h5>
              <div class="mental-block-item">
                <strong>Description:</strong> ${block.description}
              </div>
              <div class="block-removal-advice">
                <strong>Block Removal Advice:</strong> ${block.removalAdvice}
              </div>
              <div class="coaching-message">
                <strong>Mental Coach Message:</strong> ${block.coachingMessage}
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        ${psychologicalSupport.supportMessage ? `
        <div class="advice-section">
          <h5>💚 Dr. Grok's Psychological Analysis</h5>
          <p style="white-space: pre-wrap;">${psychologicalSupport.supportMessage}</p>
          ${psychologicalSupport.psychologicalAdvice ? `<p style="white-space: pre-wrap;">${psychologicalSupport.psychologicalAdvice}</p>` : ''}
          <p class="support-message">
            Remember: 70% of the time, do nothing. Defend until clear advantage emerges.
          </p>
        </div>
        ` : psychologicalSupport.psychologicalAdvice ? `
        <div class="advice-section">
          <h5>💚 Dr. Grok's Advice</h5>
          <p style="white-space: pre-wrap;">${psychologicalSupport.psychologicalAdvice}</p>
          <p class="support-message">
            Remember: 70% of the time, do nothing. Defend until clear advantage emerges.
          </p>
        </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  // Xセンチメント分析の詳細化
  const sentimentBreakdownHTML = grokXAnalysis && typeof grokXAnalysis === 'object' ? (() => {
    const whaleBias = grokXAnalysis.whaleBias || 0;
    const retailFomo = grokXAnalysis.retailFomo || 50;
    const newsImpact = grokXAnalysis.newsImpact || 0;
    
    // 前回比のトレンド表示（簡易版、実際のデータがあれば使用）
    const whaleBiasTrend = whaleBias > 0.3 ? '↑ Bullish' : whaleBias < -0.3 ? '↓ Bearish' : '→ Neutral';
    const retailFomoTrend = retailFomo >= 70 ? '↑ High FOMO' : retailFomo <= 30 ? '↓ Low FOMO' : '→ Normal';
    const newsImpactTrend = newsImpact > 20 ? '↑ Positive' : newsImpact < -20 ? '↓ Negative' : '→ Neutral';
    
    return `
      <div class="sentiment-breakdown">
        <h4>📱 X Sentiment Analysis - Detailed <span class="usp-badge usp3">USP3</span></h4>
        <table class="sentiment-table">
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Trend</th>
          </tr>
          <tr>
            <td>🐋 Whale Bias</td>
            <td>${whaleBias.toFixed(2)}</td>
            <td>${whaleBiasTrend}</td>
          </tr>
          <tr>
            <td>📊 Retail FOMO</td>
            <td>${Math.round(retailFomo)}/100</td>
            <td>${retailFomoTrend}</td>
          </tr>
          ${newsImpact != null ? `
          <tr>
            <td>📰 News Impact</td>
            <td>${newsImpact.toFixed(0)}</td>
            <td>${newsImpactTrend}</td>
          </tr>
          ` : ''}
        </table>
        <p style="margin-top: 15px; font-size: 12px; color: #666;">
          <strong>Why this matters:</strong> Whale Bias shows large traders' sentiment, while Retail FOMO indicates small traders' buying pressure. 
          Divergences between these signals often indicate trap patterns.
        </p>
      </div>
    `;
  })() : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Trap Defense BTC Report</title>
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          ${(() => {
            const logoUrl = getLogoBase64(true);
            return logoUrl ? `<img src="${logoUrl}" alt="CryptoTrade Academy" class="logo" />` : '';
          })()}
          <h1>🌤️ CryptoWeather Alert</h1>
          <h2>Trap Defense Report</h2>
          <div class="timestamp">📺 News Program @ ${ts}</div>
        </div>

        ${showContent && showContent.narrativeArc ? `
        <!-- Gemini番組プロデューサー: ストーリーブランド戦略2.0 - Opening -->
        <div class="show-opening">
          <h3>🎬 Opening: Your Story Begins</h3>
          <p><strong>Hero (You):</strong> ${showContent.script.hero.desire}</p>
          <div class="narrative-open">
            <p><strong>📖 Narrative Arc Opens:</strong> ${showContent.narrativeArc.open}</p>
          </div>
          ${showContent.opening.video ? `
          <div style="margin-top: 20px;">
            <video src="${showContent.opening.video}" controls style="max-width: 100%; height: auto; border-radius: 4px; margin: 15px 0;"></video>
            <p style="font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 10px;">
              <strong>Veo 3.1 Generated:</strong> AI News Anchor presents the market situation
            </p>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <!-- Phase 5: 統合的なUSP表現の強化 -->
        <!-- Trade Verdict -->
        <div class="news-section">
          <h3 class="section-header">🎯 Trade Verdict</h3>
          <p><strong>${dirEmoji} Signal:</strong> ${dirLabel}</p>
          <p><strong>Entry (spot ref.):</strong> ${formatUsd(priceUsd)}</p>
          <p><strong>Mode:</strong> Trap Standby — wait for clear edge. Prioritize defense.</p>
          <div style="margin-top: 15px; padding: 15px; background-color: #e7f3ff; border-radius: 4px; font-size: 12px;">
            <p style="margin: 0;"><strong>🔄 USP Synergy:</strong> USP1 (Trap Defense Engine) detects traps → USP2 (Gemini Content) visualizes the analysis → USP3 (GPT Mental Trainer + Dr. Grok) provides comprehensive mental training and psychological support</p>
          </div>
        </div>

        ${trapScoreHTML}
        ${trapScoreBreakdownHTML}
        ${trapDetectionRationaleHTML}

        <!-- CryptoQuant Deep Dive Analysis -->
        ${cryptoquantDeepDiveHTML}

        <!-- Mental Training Section - GPT Mental Trainer -->
        <div class="mental-trainer-section">
          <h3>🧠 Mental Training: Trap Defence Guidance <span class="mental-trainer-badge">GPT Mental Trainer</span> <span class="usp-badge usp3">USP3</span></h3>
          <p style="margin-bottom: 20px; font-size: 14px; opacity: 0.95;">
            <strong>🎯 Mission:</strong> "Don't fall into traps!" - Trap Defence wisdom for traders
          </p>
          ${trapAlert && trapAlert.alert ? `
          <div style="margin-bottom: 15px;">
            <span class="news-importance ${trapAlert.severity === 'CRITICAL' ? 'critical' : trapAlert.severity === 'HIGH' ? 'high' : 'medium'}">
              ${trapAlert.severity === 'CRITICAL' ? '🚨 CRITICAL' : trapAlert.severity === 'HIGH' ? '⚠️ HIGH' : '⚡ MEDIUM'} TRAP ALERT
            </span>
          </div>
          ` : ''}
          <div class="mental-training-content">
            <div class="mental-training-highlight">
              <strong>🛡️ Trap Defence Philosophy:</strong> 70% of the time, do nothing. Defend until clear advantage emerges.
            </div>
            <div style="margin-top: 20px;">
              ${showContent && showContent.analysis && showContent.analysis.gptMentalTrainer 
                ? showContent.analysis.gptMentalTrainer.replace(/\n/g, '<br>')
                : gptNewsDisplay.replace(/\n/g, '<br>')}
            </div>
          </div>
          <div class="synergy-note">
            <strong>🔄 Synergy with Dr. Grok:</strong> GPT Mental Trainer provides on-chain data insights from a psychological perspective, while Dr. Grok analyzes X sentiment and provides emotional support. Together, they offer comprehensive mental training for trap defence.
          </div>
        </div>

        <!-- Phase 2: USP2 - Gemini Content Generation 統合強化 -->
        <!-- Data Presentation Section -->
        <div class="news-section data-presentation">
          <h3 class="section-header">📊 Data Presentation <span class="usp-badge usp2">USP2</span></h3>
          <p class="section-subheader">NanoBanana Pro</p>
          ${hasGeminiContent ? `
          <div class="gemini-content-preview">
            ${geminiImageUrl ? `
            <img src="${geminiImageUrl}" alt="Market Analysis" style="max-width: 100%; height: auto; border-radius: 4px; margin: 15px 0;" />
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              <strong>What to look for:</strong> This visual analysis shows trap patterns, divergence signals, and market anomalies detected by NanoBanana Pro.
            </p>
            ` : ''}
            ${geminiVideoUrl ? `
            <video src="${geminiVideoUrl}" controls style="max-width: 100%; height: auto; border-radius: 4px; margin: 15px 0;"></video>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              <strong>Video Summary:</strong> AI news anchor analysis of current market conditions and trap defense recommendations.
            </p>
            ` : ''}
            <p style="font-size: 11px; color: #999; margin-top: 10px; font-style: italic;">
              Generated by Gemini NanoBanana Pro - Visual storytelling for better understanding
            </p>
          </div>
          ` : `
          <div class="gemini-content-preview">
            <div class="gemini-placeholder">
              <p>🎨 NanoBanana Pro is analyzing market data...</p>
              <p>Next report will include visual infographic</p>
              <p style="font-size: 12px; margin-top: 10px;">
                <strong>USP2 Value:</strong> Gemini NanoBanana Pro generates market analysis images to help you understand trap patterns visually.
              </p>
            </div>
          </div>
          `}
        </div>

        <!-- Commentator Section -->
        <div class="news-section commentator">
          <h3 class="section-header">💊 Commentator: Dr. Grok Mental Coach <span class="mental-coach-badge">Mental Coach</span> <span class="usp-badge usp3">USP3</span></h3>
          <div class="grok-analysis">
            <h4>📱 X Sentiment Analysis</h4>
            <p>${grokXDisplay.replace(/\n/g, '<br>')}</p>
            ${sentimentBreakdownHTML}
            ${showContent && showContent.commentary && showContent.commentary.drGrok 
              ? (() => {
                  const drGrok = showContent.commentary.drGrok;
                  return `
                    <div class="mental-coach-section">
                      <h4>🧠 Mental Block Detection & Removal</h4>
                      ${drGrok.mentalBlocks && drGrok.mentalBlocks.length > 0 ? `
                        <div class="mental-block-detection">
                          <p><strong>Detected Mental Blocks:</strong></p>
                          ${drGrok.mentalBlocks.map(block => `
                            <div class="mental-block-item">
                              <strong>${block.type}</strong> (${block.severity})
                              <p>${block.description}</p>
                              <div class="block-removal-advice">
                                <strong>Removal Advice:</strong> ${block.removalAdvice}
                              </div>
                              <div class="coaching-message">
                                <strong>Coaching:</strong> ${block.coachingMessage}
                              </div>
                            </div>
                          `).join('')}
                        </div>
                      ` : ''}
                      ${drGrok.supportMessage ? `
                        <div class="support-message">
                          <p style="white-space: pre-wrap;">${drGrok.supportMessage}</p>
                        </div>
                      ` : ''}
                    </div>
                  `;
                })()
              : psychologicalHTML}
          </div>
        </div>

        <!-- Data Table -->
        ${dataTableHTML}

        <!-- Exit Map -->
        ${exitMapHTML}

        <!-- Closing Section -->
        <div class="news-section closing closing-enhanced">
          <h3 class="section-header">📺 Closing</h3>
          <div class="closing-summary">
            <p><strong>Today's Key Points:</strong></p>
            <ul>
              ${trapAlert && trapAlert.alert ? `<li>🚨 Trap Alert: ${trapAlert.recommendation} - ${trapDetection?.trapType || 'Trap Detected'}</li>` : ''}
              ${trapScore != null ? `<li>🎯 Trap Score: ${Math.round(trapScore)}/100</li>` : ''}
              <li>💰 BTC Price: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)</li>
              ${psychologicalSupport && psychologicalSupport.psychologicalState !== 'UNKNOWN' ? `<li>💚 Psychological State: ${psychologicalSupport.psychologicalState} (${psychologicalSupport.psychologicalRisk} Risk)</li>` : ''}
            </ul>
          </div>
          <p><strong>Next Report:</strong> ${(() => {
            const nextHour = (new Date(now.getTime() + 6 * 60 * 60 * 1000)).getUTCHours();
            return `${nextHour.toString().padStart(2, '0')}:00 UTC`;
          })()}</p>
          <div class="closing-cta">
            <a href="https://cryptotradeacademy.io">🔗 Get Full Access to Trap Defense BTC</a>
          </div>
          <p style="margin-top: 20px;">Stay tuned for the next episode</p>
        </div>

        ${showContent && showContent.callToAction ? `
        <!-- Gemini番組プロデューサー: ストーリーブランド戦略2.0 - Call to Action -->
        <div class="news-section" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: #fff; border-left: 5px solid #fff;">
          <h3 class="section-header" style="color: #fff;">🎯 Call to Action</h3>
          <div style="margin: 20px 0; padding: 20px; background-color: rgba(255,255,255,0.15); border-radius: 6px;">
            <p><strong>❌ Failure to Avoid:</strong> ${showContent.callToAction.avoidFailure}</p>
          </div>
          <div style="margin: 20px 0; padding: 20px; background-color: rgba(255,255,255,0.15); border-radius: 6px;">
            <p><strong>✅ Success Ending:</strong> ${showContent.callToAction.successEnding}</p>
          </div>
          <div style="margin: 20px 0; padding: 20px; background-color: rgba(255,255,255,0.25); border-radius: 6px; text-align: center;">
            <p style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">${showContent.callToAction.cta.direct}</p>
            <p style="font-size: 14px; opacity: 0.9;">${showContent.callToAction.cta.transitional}</p>
            <div style="margin-top: 20px;">
              <a href="https://cryptotradeacademy.io" style="display: inline-block; padding: 15px 30px; background-color: #fff; color: #ff6b6b; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">🚀 Join Trap Defense BTC Now</a>
            </div>
          </div>
        </div>
        ` : ''}

        ${showContent && showContent.narrativeArc ? `
        <!-- Gemini番組プロデューサー: ストーリーブランド戦略2.0 - Narrative Arc Close -->
        <div class="show-narrative-arc">
          <h3>📖 Narrative Arc Closes: Your Transformation</h3>
          <div class="narrative-close">
            <p><strong>Your Success Story:</strong> ${showContent.narrativeArc.close}</p>
          </div>
          <div class="key-idea-highlight">
            💎 Key Idea: ${showContent.keyIdea}
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <p>For educational purposes only. Not financial advice.</p>
          <p>Trap Defense BTC - CryptoTradeAcademy</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

module.exports = { formatRegularBriefingHTML };
