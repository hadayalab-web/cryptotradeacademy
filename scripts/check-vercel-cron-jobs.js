// scripts/check-vercel-cron-jobs.js
// Vercel Cronジョブのリストを取得して確認

const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_NAME = 'cryptotradeacademy';
const TEAM_ID = process.env.VERCEL_TEAM_ID || null; // オプション

if (!VERCEL_TOKEN) {
  console.error('❌ VERCEL_TOKEN環境変数が設定されていません');
  console.log('   環境変数にVERCEL_TOKENを設定してください');
  process.exit(1);
}

async function getVercelCronJobs() {
  return new Promise((resolve, reject) => {
    // Vercel API: GET /v1/projects/{projectId}/crons
    // まずプロジェクトIDを取得する必要がある
    const projectPath = TEAM_ID 
      ? `/v9/projects/${PROJECT_NAME}?teamId=${TEAM_ID}`
      : `/v9/projects/${PROJECT_NAME}`;
    
    const options = {
      hostname: 'api.vercel.com',
      path: projectPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    console.log('📡 Vercel APIに接続中...');
    console.log(`   Project: ${PROJECT_NAME}`);
    if (TEAM_ID) {
      console.log(`   Team ID: ${TEAM_ID}`);
    }
    console.log('');

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200 || res.statusCode === 201) {
            const project = JSON.parse(data);
            const projectId = project.id;
            console.log(`✅ プロジェクト情報を取得しました`);
            console.log(`   Project ID: ${projectId}`);
            console.log('');

            // Cronジョブのリストを取得
            getCronJobsList(projectId, resolve, reject);
          } else {
            console.error(`❌ プロジェクト情報の取得に失敗しました`);
            console.error(`   Status: ${res.statusCode}`);
            console.error(`   Response: ${data}`);
            reject(new Error(`Failed to get project: ${res.statusCode}`));
          }
        } catch (error) {
          console.error('❌ レスポンスの解析に失敗しました:', error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ リクエストエラー:', error.message);
      reject(error);
    });

    req.end();
  });
}

function getCronJobsList(projectId, resolve, reject) {
  const cronPath = TEAM_ID
    ? `/v1/projects/${projectId}/crons?teamId=${TEAM_ID}`
    : `/v1/projects/${projectId}/crons`;

  const options = {
    hostname: 'api.vercel.com',
    path: cronPath,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  console.log('📡 Cronジョブのリストを取得中...');
  console.log('');

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const result = JSON.parse(data);
          const crons = result.crons || result || [];
          
          console.log('='.repeat(80));
          console.log('📋 Vercel Cronジョブ一覧');
          console.log('='.repeat(80));
          console.log('');

          if (crons.length === 0) {
            console.log('⚠️ Cronジョブが1件も設定されていません');
            console.log('   vercel.jsonに設定されているCronジョブが反映されていない可能性があります');
          } else {
            console.log(`✅ ${crons.length}件のCronジョブが見つかりました`);
            console.log('');

            // vercel.jsonの設定と比較
            const expectedCrons = [
              { path: '/api/x-post-free-report', schedule: '5 6,18 * * *' },
              { path: '/api/x-quote-repost', schedule: '0 12-22 * * *' },
            ];

            crons.forEach((cron, idx) => {
              const path = cron.path || cron.endpoint || 'N/A';
              const schedule = cron.schedule || cron.cron || 'N/A';
              const state = cron.state || cron.status || 'N/A';
              const lastRun = cron.lastRun || cron.lastExecution || 'N/A';
              const nextRun = cron.nextRun || cron.nextExecution || 'N/A';

              console.log(`${idx + 1}. ${path}`);
              console.log(`   Schedule: ${schedule}`);
              console.log(`   State: ${state}`);
              console.log(`   Last Run: ${lastRun}`);
              console.log(`   Next Run: ${nextRun}`);
              console.log('');

              // X投稿関連のCronジョブをチェック
              if (path.includes('x-post') || path.includes('x-quote')) {
                const expected = expectedCrons.find(e => e.path === path);
                if (expected) {
                  if (schedule === expected.schedule) {
                    console.log(`   ✅ スケジュールが正しく設定されています`);
                  } else {
                    console.log(`   ⚠️ スケジュールが異なります`);
                    console.log(`      期待値: ${expected.schedule}`);
                    console.log(`      実際値: ${schedule}`);
                  }
                }
              }
            });

            // X投稿関連のCronジョブが存在するかチェック
            const xPostCrons = crons.filter(cron => {
              const path = cron.path || cron.endpoint || '';
              return path.includes('x-post') || path.includes('x-quote');
            });

            console.log('='.repeat(80));
            console.log('📊 X投稿関連Cronジョブの確認');
            console.log('='.repeat(80));
            console.log('');

            if (xPostCrons.length === 0) {
              console.log('❌ X投稿関連のCronジョブが1件も見つかりませんでした');
              console.log('   → vercel.jsonに設定されているが、Vercelに反映されていない可能性があります');
              console.log('   → 再デプロイを実行してください');
            } else {
              console.log(`✅ X投稿関連のCronジョブ: ${xPostCrons.length}件`);
              xPostCrons.forEach(cron => {
                const path = cron.path || cron.endpoint || 'N/A';
                const state = cron.state || cron.status || 'N/A';
                console.log(`   - ${path}: ${state}`);
              });
            }
          }

          console.log('='.repeat(80));
          resolve(crons);
        } else {
          console.error(`❌ Cronジョブの取得に失敗しました`);
          console.error(`   Status: ${res.statusCode}`);
          console.error(`   Response: ${data}`);
          reject(new Error(`Failed to get crons: ${res.statusCode}`));
        }
      } catch (error) {
        console.error('❌ レスポンスの解析に失敗しました:', error.message);
        reject(error);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ リクエストエラー:', error.message);
    reject(error);
  });

  req.end();
}

// 実行
getVercelCronJobs()
  .then(() => {
    console.log('');
    console.log('✅ 確認完了');
  })
  .catch((error) => {
    console.error('');
    console.error('❌ エラーが発生しました:', error.message);
    console.error('');
    console.log('💡 ヒント:');
    console.log('   1. VERCEL_TOKEN環境変数が正しく設定されているか確認してください');
    console.log('   2. プロジェクト名が正しいか確認してください');
    console.log('   3. Vercel APIのレート制限に達していないか確認してください');
    process.exit(1);
  });
