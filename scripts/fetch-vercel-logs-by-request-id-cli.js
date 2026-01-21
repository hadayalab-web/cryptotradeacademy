#!/usr/bin/env node
/**
 * Vercel CLI経由でRequest IDに関連するログを取得
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'QU4PnKlo611mYVksqjfNC7Fl';
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'vercel-logs');

// 出力ディレクトリを作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * プロジェクト情報を取得（API経由）
 */
async function getProjectInfo() {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      path: '/v9/projects',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const projectsData = JSON.parse(data);
          const projects = projectsData.projects || [];
          const project = projects.find(p => 
            p.name === 'cryptotradeacademy' ||
            p.name === 'cryptosignal-ai'
          );
          resolve(project || null);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

/**
 * 最新のデプロイメントを取得（API経由）
 */
async function getLatestDeployment(projectId, teamId = null) {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    let path = `/v6/deployments?projectId=${projectId}&limit=1`;
    if (teamId) {
      path += `&teamId=${teamId}`;
    }

    const options = {
      hostname: 'api.vercel.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const deploymentsData = JSON.parse(data);
          resolve(deploymentsData.deployments?.[0] || null);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

/**
 * Vercel CLIでログを取得し、Request IDでフィルタリング
 */
function getLogsByRequestIdCLI(deploymentId, requestId) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Vercel CLIでログを取得中...`);
    console.log(`   デプロイメントID: ${deploymentId}`);
    console.log(`   Request ID: ${requestId}\n`);

    const matchingLogs = [];
    let totalLogs = 0;
    let buffer = '';

    // Vercel CLIを実行（--jsonオプションでJSON形式で取得）
    const vercelProcess = spawn('vercel', ['logs', deploymentId, '--json', '--token', VERCEL_TOKEN], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    const timeout = setTimeout(() => {
      vercelProcess.kill();
      console.log(`\n⚠️  タイムアウト（60秒）。取得できたログ: ${totalLogs}件、マッチ: ${matchingLogs.length}件`);
      resolve(matchingLogs);
    }, 60000);

    vercelProcess.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

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

      // 進捗表示
      if (totalLogs % 50 === 0) {
        process.stdout.write(`\r📊 処理中: ${totalLogs}件... マッチ: ${matchingLogs.length}件`);
      }
    });

    vercelProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('not authenticated') || error.includes('not found')) {
        clearTimeout(timeout);
        reject(new Error(`Vercel CLI error: ${error}`));
      }
    });

    vercelProcess.on('close', (code) => {
      clearTimeout(timeout);
      
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

      process.stdout.write('\r' + ' '.repeat(80) + '\r'); // 進捗行をクリア
      
      if (code !== 0 && matchingLogs.length === 0 && totalLogs === 0) {
        reject(new Error(`Vercel CLI exited with code ${code}`));
      } else {
        console.log(`📊 総ログ数: ${totalLogs}件`);
        console.log(`✅ マッチしたログ: ${matchingLogs.length}件\n`);
        resolve(matchingLogs);
      }
    });

    vercelProcess.on('error', (error) => {
      clearTimeout(timeout);
      if (error.code === 'ENOENT') {
        reject(new Error('Vercel CLIがインストールされていません。npm install -g vercel を実行してください。'));
      } else {
        reject(error);
      }
    });
  });
}

/**
 * メイン処理
 */
async function main() {
  const requestId = process.argv[2] || '9d618291-d0fd-4856-8d36-2c69f0ecd521';

  console.log('🚀 Vercelログ取得（Request ID指定・CLI版）\n');
  console.log('='.repeat(80));
  console.log(`Request ID: ${requestId}\n`);

  try {
    // 1. プロジェクト情報を取得
    console.log('🔍 プロジェクト情報を取得中...');
    const project = await getProjectInfo();
    if (!project) {
      console.error('❌ プロジェクトが見つかりません');
      process.exit(1);
    }
    console.log(`✅ プロジェクト: ${project.name} (${project.id})\n`);

    // 2. 最新のデプロイメントを取得
    console.log('🔍 最新のデプロイメントを取得中...');
    const deployment = await getLatestDeployment(project.id, project.teamId);
    if (!deployment) {
      console.error('❌ デプロイメントが見つかりません');
      process.exit(1);
    }
    console.log(`✅ デプロイメント: ${deployment.uid}`);
    console.log(`   URL: https://${deployment.url}`);
    console.log(`   状態: ${deployment.readyState}\n`);

    // 3. Vercel CLIでログを取得
    const logs = await getLogsByRequestIdCLI(deployment.uid, requestId);

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
  } catch (error) {
    console.error('❌ 実行エラー:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  });
}

module.exports = { getLogsByRequestIdCLI };
