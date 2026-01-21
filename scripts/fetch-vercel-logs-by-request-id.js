#!/usr/bin/env node
/**
 * Vercel API経由でRequest IDに関連するログを取得
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'QU4PnKlo611mYVksqjfNC7Fl';
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'vercel-logs');

// 出力ディレクトリを作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * HTTPリクエストを実行（Promise版）
 */
function httpsRequest(url, options = {}) {
  const https = require('https');
  const urlObj = new URL(url);
  
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: 15000,
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

/**
 * プロジェクト情報を取得
 */
async function getProjectInfo() {
  try {
    // プロジェクトリストを取得
    const projectsData = await httpsRequest('https://api.vercel.com/v9/projects');
    const projects = projectsData.projects || [];
    
    // cryptotradeacademyプロジェクトを探す
    const project = projects.find(p => 
      p.name === 'cryptotradeacademy' ||
      p.name === 'cryptosignal-ai'
    );

    if (!project) {
      console.error('❌ プロジェクトが見つかりません');
      console.log('利用可能なプロジェクト:');
      projects.slice(0, 5).forEach(p => console.log(`  - ${p.name} (${p.id})`));
      return null;
    }

    return project;
  } catch (error) {
    console.error('❌ プロジェクト情報の取得に失敗:', error.message);
    return null;
  }
}

/**
 * 最新のデプロイメントを取得
 */
async function getLatestDeployment(projectId, teamId = null) {
  try {
    let deploymentsUrl = `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1`;
    if (teamId) {
      deploymentsUrl += `&teamId=${teamId}`;
    }

    const data = await httpsRequest(deploymentsUrl);
    return data.deployments?.[0] || null;
  } catch (error) {
    console.error('❌ デプロイメント情報の取得に失敗:', error.message);
    return null;
  }
}

/**
 * デプロイメントのログを取得（Request IDでフィルタリング）
 */
async function getLogsByRequestId(projectId, deploymentId, requestId, teamId = null) {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    let logsUrl = `/v1/projects/${projectId}/deployments/${deploymentId}/runtime-logs`;
    if (teamId) {
      logsUrl += `?teamId=${teamId}`;
    }

    console.log(`📥 ログを取得中: https://api.vercel.com${logsUrl}`);
    console.log(`🔍 Request IDでフィルタリング: ${requestId}\n`);

    const options = {
      hostname: 'api.vercel.com',
      path: logsUrl,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'User-Agent': 'Node.js',
      },
      timeout: 30000, // 30秒タイムアウト
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', (chunk) => { errorData += chunk; });
        res.on('end', () => {
          reject(new Error(`Failed to fetch logs: ${res.statusCode} - ${errorData}`));
        });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      const matchingLogs = [];
      let totalLogs = 0;
      let hasData = false;

      res.on('data', (chunk) => {
        hasData = true;
        buffer += chunk.toString();
        
        // 改行で区切って処理
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 最後の不完全な行を保持

        for (const line of lines) {
          if (!line.trim()) continue;
          totalLogs++;

          try {
            const log = JSON.parse(line);
            
            // Request IDでフィルタリング
            const logRequestId = log.requestId || 
                                log.request?.id ||
                                (log.message && log.message.includes(requestId) ? requestId : null);
            
            if (logRequestId === requestId || 
                (log.message && log.message.includes(requestId)) ||
                (log.text && log.text.includes(requestId))) {
              matchingLogs.push(log);
            }
          } catch (error) {
            // JSONパースエラーは無視
            continue;
          }
        }

        // 進捗表示（100件ごと）
        if (totalLogs % 100 === 0) {
          process.stdout.write(`\r📊 処理中: ${totalLogs}件のログを処理... マッチ: ${matchingLogs.length}件`);
        }
      });

      res.on('end', () => {
        // 残りのバッファを処理
        if (buffer.trim()) {
          try {
            const log = JSON.parse(buffer.trim());
            const logRequestId = log.requestId || 
                                log.request?.id ||
                                (log.message && log.message.includes(requestId) ? requestId : null);
            
            if (logRequestId === requestId || 
                (log.message && log.message.includes(requestId)) ||
                (log.text && log.text.includes(requestId))) {
              matchingLogs.push(log);
            }
            totalLogs++;
          } catch (error) {
            // 無視
          }
        }

        if (hasData) {
          process.stdout.write('\r' + ' '.repeat(80) + '\r'); // 進捗行をクリア
        }

        console.log(`📊 総ログ数: ${totalLogs}件`);
        console.log(`✅ マッチしたログ: ${matchingLogs.length}件\n`);

        resolve(matchingLogs);
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout after 30 seconds'));
    });

    req.end();
  });
}

/**
 * メイン処理
 */
async function main() {
  const requestId = process.argv[2] || '9d618291-d0fd-4856-8d36-2c69f0ecd521';

  console.log('🚀 Vercelログ取得（Request ID指定）\n');
  console.log('='.repeat(80));
  console.log(`Request ID: ${requestId}\n`);

  // 1. プロジェクト情報を取得
  const project = await getProjectInfo();
  if (!project) {
    process.exit(1);
  }

  console.log(`✅ プロジェクト: ${project.name} (${project.id})\n`);

  // 2. 最新のデプロイメントを取得
  const deployment = await getLatestDeployment(project.id, project.teamId);
  if (!deployment) {
    console.error('❌ デプロイメントが見つかりません');
    process.exit(1);
  }

  console.log(`✅ デプロイメント: ${deployment.uid}`);
  console.log(`   URL: https://${deployment.url}`);
  console.log(`   状態: ${deployment.readyState}\n`);

  // 3. ログを取得
  const logs = await getLogsByRequestId(project.id, deployment.uid, requestId, project.teamId);

  if (logs.length === 0) {
    console.log('⚠️  Request IDに一致するログが見つかりませんでした');
    console.log('💡 最新のデプロイメントのログを確認してください');
    process.exit(0);
  }

  // 4. ログをファイルに保存
  const outputFile = path.join(OUTPUT_DIR, `logs-request-${requestId}.json`);
  fs.writeFileSync(
    outputFile,
    JSON.stringify(logs, null, 2),
    'utf-8'
  );

  console.log(`💾 ログを保存: ${outputFile}\n`);

  // 5. ログの概要を表示
  console.log('📋 ログ概要:\n');
  
  const errorLogs = logs.filter(log => 
    (log.level || '').toLowerCase().includes('error') ||
    (log.message || '').toLowerCase().includes('error')
  );

  const warningLogs = logs.filter(log => 
    (log.level || '').toLowerCase().includes('warning')
  );

  console.log(`   - エラーログ: ${errorLogs.length}件`);
  console.log(`   - 警告ログ: ${warningLogs.length}件`);
  console.log(`   - その他: ${logs.length - errorLogs.length - warningLogs.length}件\n`);

  // エラーログがある場合は表示
  if (errorLogs.length > 0) {
    console.log('❌ エラーログ:\n');
    errorLogs.slice(0, 5).forEach((log, index) => {
      console.log(`   ${index + 1}. [${log.timestamp || log.timestampInMs || 'N/A'}] ${log.level || 'error'}`);
      console.log(`      ${(log.message || log.text || '').substring(0, 200)}`);
      if (log.requestPath) {
        console.log(`      Path: ${log.requestPath}`);
      }
      if (log.responseStatusCode) {
        console.log(`      Status: ${log.responseStatusCode}`);
      }
      console.log();
    });
  }

  console.log('='.repeat(80));
  console.log('✅ 完了');
  console.log('='.repeat(80));
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { getLogsByRequestId };
