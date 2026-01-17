#!/usr/bin/env node
/**
 * Vercel API経由でデプロイメント状況を確認
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');

// Vercelプロジェクト情報を.vercel/project.jsonから読み込む
let projectInfo = null;
const projectJsonPath = path.join(__dirname, '..', '.vercel', 'project.json');
if (fs.existsSync(projectJsonPath)) {
  try {
    projectInfo = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
  } catch (error) {
    console.warn('⚠️  .vercel/project.jsonの読み込みに失敗:', error.message);
  }
}

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_AUTH_TOKEN || process.env.VERCEL_API_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || projectInfo?.orgId;
const VERCEL_PROJECT_NAME = process.env.VERCEL_PROJECT_NAME || projectInfo?.projectName || 'cryptotradeacademy';
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || projectInfo?.projectId;

async function getVercelProjectInfo() {
  if (!VERCEL_TOKEN) {
    console.log('⚠️  VERCEL_TOKENが設定されていません');
    console.log('📝 以下の方法でVercel APIトークンを取得できます:');
    console.log('   1. Vercel Dashboard → Settings → Tokens');
    console.log('   2. 「Create Token」をクリック');
    console.log('   3. トークン名を入力（例: "Deployment Check"）');
    console.log('   4. 生成されたトークンを .env に VERCEL_TOKEN として設定');
    return null;
  }

  const headers = {
    'Authorization': `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1. プロジェクト情報を取得
    console.log('🔍 Vercelプロジェクト情報を取得中...\n');
    console.log(`   プロジェクト名: ${VERCEL_PROJECT_NAME}`);
    console.log(`   プロジェクトID: ${VERCEL_PROJECT_ID || 'N/A'}`);
    console.log(`   組織ID: ${VERCEL_TEAM_ID || 'N/A'}`);
    console.log();
    
    let project;
    
    // まずプロジェクトリストを取得して、正しいプロジェクト名を確認
    let projectsUrl = 'https://api.vercel.com/v9/projects';
    if (VERCEL_TEAM_ID) {
      projectsUrl += `?teamId=${VERCEL_TEAM_ID}`;
    }
    
    const projectsResponse = await fetch(projectsUrl, { headers });
    if (projectsResponse.ok) {
      const projectsData = await projectsResponse.json();
      const projects = projectsData.projects || [];
      
      // プロジェクトIDまたはプロジェクト名でマッチング
      const matchedProject = projects.find(p => 
        p.id === VERCEL_PROJECT_ID || 
        p.name === VERCEL_PROJECT_NAME ||
        p.name === 'cryptotradeacademy' ||
        p.name === 'cryptosignal-ai'
      );
      
      if (matchedProject) {
        console.log(`✅ プロジェクトが見つかりました: ${matchedProject.name} (${matchedProject.id})`);
        project = matchedProject;
      } else {
        console.log('⚠️  プロジェクトリスト:');
        projects.slice(0, 5).forEach(p => {
          console.log(`   - ${p.name} (${p.id})`);
        });
        console.log();
        console.log(`⚠️  プロジェクト "${VERCEL_PROJECT_NAME}" が見つかりません`);
        console.log('💡 上記のプロジェクトリストから正しいプロジェクト名を確認してください');
        return null;
      }
    } else {
      // プロジェクトリストの取得に失敗した場合、直接プロジェクト名で試す
      let projectUrl = `https://api.vercel.com/v9/projects/${encodeURIComponent(VERCEL_PROJECT_NAME)}`;
      if (VERCEL_TEAM_ID) {
        projectUrl += `?teamId=${VERCEL_TEAM_ID}`;
      }

      const projectResponse = await fetch(projectUrl, { headers });
      
      if (projectResponse.status === 404) {
        console.log(`⚠️  プロジェクト "${VERCEL_PROJECT_NAME}" が見つかりません`);
        console.log('💡 プロジェクト名を確認するか、VERCEL_PROJECT_NAMEを設定してください');
        
        // エラーレスポンスの詳細を表示
        const errorText = await projectResponse.text();
        console.log(`   エラー詳細: ${errorText.substring(0, 200)}`);
        return null;
      }

      if (!projectResponse.ok) {
        const errorText = await projectResponse.text();
        console.log(`❌ Vercel API エラー: ${projectResponse.status}`);
        console.log(`   エラー詳細: ${errorText.substring(0, 500)}`);
        throw new Error(`Vercel API Error: ${projectResponse.status} - ${errorText}`);
      }

      project = await projectResponse.json();
    }
    console.log('✅ プロジェクト情報:');
    console.log(`   - プロジェクト名: ${project.name}`);
    console.log(`   - プロジェクトID: ${project.id}`);
    console.log(`   - 最新のデプロイメント: ${project.latestDeployment || 'N/A'}`);
    console.log();

    // 2. 最新のデプロイメントを取得
    console.log('🔍 最新のデプロイメント情報を取得中...\n');
    
    let deploymentsUrl = `https://api.vercel.com/v6/deployments?projectId=${project.id}&limit=5`;
    if (VERCEL_TEAM_ID) {
      deploymentsUrl += `&teamId=${VERCEL_TEAM_ID}`;
    }

    const deploymentsResponse = await fetch(deploymentsUrl, { headers });
    
    if (!deploymentsResponse.ok) {
      const errorText = await deploymentsResponse.text();
      throw new Error(`Vercel API Error: ${deploymentsResponse.status} - ${errorText}`);
    }

    const deployments = await deploymentsResponse.json();
    const latestDeployment = deployments.deployments?.[0];

    if (latestDeployment) {
      console.log('✅ 最新のデプロイメント:');
      console.log(`   - URL: https://${latestDeployment.url}`);
      console.log(`   - 状態: ${latestDeployment.readyState || 'N/A'}`);
      console.log(`   - 作成日時: ${new Date(latestDeployment.createdAt).toLocaleString('ja-JP')}`);
      console.log(`   - デプロイメントID: ${latestDeployment.uid}`);
      console.log();
    } else {
      console.log('⚠️  デプロイメントが見つかりません');
      console.log();
    }

    // 3. 環境変数を取得
    console.log('🔍 環境変数を確認中...\n');
    
    let envUrl = `https://api.vercel.com/v9/projects/${project.id}/env`;
    if (VERCEL_TEAM_ID) {
      envUrl += `?teamId=${VERCEL_TEAM_ID}`;
    }

    const envResponse = await fetch(envUrl, { headers });
    let envVars = [];
    
    if (envResponse.ok) {
      const envData = await envResponse.json();
      envVars = envData.envs || [];
      
      const requiredVars = [
        'X_POSTING_ENABLED',
        'CRON_SECRET',
        'KV_REST_API_URL',
        'KV_REST_API_TOKEN',
        'TELEGRAM_BOT_TOKEN',
        'X_API_CONSUMER_KEY',
        'XAI_API_KEY',
        'WHOP_API_KEY',
      ];

      console.log('✅ 環境変数の設定状況:');
      const setVars = new Set(envVars.map(e => e.key));
      
      for (const varName of requiredVars) {
        const isSet = setVars.has(varName);
        const icon = isSet ? '✅' : '❌';
        const envVar = envVars.find(e => e.key === varName);
        const envs = envVar?.target || [];
        const envsStr = envs.length > 0 ? ` (${envs.join(', ')})` : '';
        console.log(`   ${icon} ${varName}${envsStr}`);
      }
      console.log();
    } else {
      console.log('⚠️  環境変数の取得に失敗しました');
      console.log();
    }

    // 4. Cronジョブを確認（vercel.jsonから）
    console.log('🔍 Cronジョブ設定を確認中...\n');
    
    const vercelJson = require('../vercel.json');
    if (vercelJson.crons && vercelJson.crons.length > 0) {
      console.log('✅ vercel.jsonに定義されているCronジョブ:');
      for (const cron of vercelJson.crons) {
        console.log(`   - ${cron.path} (${cron.schedule})`);
      }
      console.log();
      console.log('💡 Vercel Dashboard → Settings → Cron Jobs で実際の設定を確認してください');
      console.log();
    }

    return {
      project,
      latestDeployment,
      envVars: envVars || [],
    };
  } catch (error) {
    console.error('❌ Vercel API確認エラー:', error.message);
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n💡 VERCEL_TOKENが無効または権限が不足しています');
      console.log('   Vercel Dashboard → Settings → Tokens で新しいトークンを生成してください');
    }
    return null;
  }
}

async function checkVSLEndpoints(deploymentUrl) {
  if (!deploymentUrl) {
    console.log('⚠️  デプロイメントURLが取得できませんでした');
    return;
  }

  console.log('🔍 VSL APIエンドポイントの動作確認...\n');
  
  const endpoints = [
    '/api/vsl1-post',
    '/api/vsl2-free-users',
    '/api/vsl1-reminder',
    '/api/vsl2-last-call',
    '/api/promo-stock-monitor',
  ];

  const baseUrl = deploymentUrl.startsWith('http') ? deploymentUrl : `https://${deploymentUrl}`;
  const cronSecret = process.env.CRON_SECRET || 'test';

  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
        },
      });

      const status = response.status;
      const icon = status === 200 || status === 401 ? '✅' : '❌';
      
      if (status === 401) {
        console.log(`   ${icon} ${endpoint} - 認証エラー (CRON_SECRETが必要)`);
      } else if (status === 200) {
        const data = await response.json();
        console.log(`   ${icon} ${endpoint} - 正常 (${data.success ? 'success' : 'error'})`);
      } else {
        console.log(`   ${icon} ${endpoint} - エラー (${status})`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint} - エラー: ${error.message}`);
    }
  }
  console.log();
}

async function main() {
  console.log('🚀 Vercel API経由でデプロイメント確認\n');
  console.log('='.repeat(80));
  console.log();

  const result = await getVercelProjectInfo();
  
  if (result && result.latestDeployment) {
    await checkVSLEndpoints(result.latestDeployment.url);
  }

  console.log('='.repeat(80));
  console.log('📋 確認完了');
  console.log('='.repeat(80));
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 確認実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { getVercelProjectInfo, checkVSLEndpoints };
