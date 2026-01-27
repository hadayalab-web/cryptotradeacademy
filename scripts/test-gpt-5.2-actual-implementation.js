// GPT-5.2-2025-12-11 API実装検証スクリプト
// 実際の実装と同じパラメータでAPIを呼び出して検証

require('dotenv').config();

async function testActualImplementation() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEYが設定されていません');
    process.exit(1);
  }

  console.log('🔍 GPT-5.2-2025-12-11 実装検証を開始...\n');

  // テスト1: analyzeCryptoQuantDataの実装を検証
  console.log('📝 テスト1: analyzeCryptoQuantDataの実装パラメータ');
  try {
    const response1 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.2-2025-12-11',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Return a JSON object with "status": "OK".' },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 1000,
        temperature: 0.3,
      }),
    });

    const result1 = await response1.json();
    if (response1.ok) {
      console.log('✅ テスト1成功: analyzeCryptoQuantDataの実装パラメータで動作');
      console.log(`   レスポンス: ${result1.choices[0]?.message?.content}`);
      console.log(`   使用トークン: ${result1.usage?.total_tokens}`);
    } else {
      console.log('❌ テスト1失敗:', result1.error?.message || JSON.stringify(result1));
      return;
    }
  } catch (error) {
    console.log('❌ テスト1エラー:', error.message);
    return;
  }

  console.log('');

  // テスト2: generateCryptoQuantAnalysisの実装を検証
  console.log('📝 テスト2: generateCryptoQuantAnalysisの実装パラメータ');
  try {
    const response2 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.2-2025-12-11',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "OK" and nothing else.' },
        ],
        max_completion_tokens: 800,
        temperature: 0.6,
      }),
    });

    const result2 = await response2.json();
    if (response2.ok) {
      console.log('✅ テスト2成功: generateCryptoQuantAnalysisの実装パラメータで動作');
      console.log(`   レスポンス: ${result2.choices[0]?.message?.content}`);
      console.log(`   使用トークン: ${result2.usage?.total_tokens}`);
    } else {
      console.log('❌ テスト2失敗:', result2.error?.message || JSON.stringify(result2));
      return;
    }
  } catch (error) {
    console.log('❌ テスト2エラー:', error.message);
    return;
  }

  console.log('');

  // テスト3: generateNonUserImpactReportの実装を検証
  console.log('📝 テスト3: generateNonUserImpactReportの実装パラメータ');
  try {
    const response3 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.2-2025-12-11',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "OK" and nothing else.' },
        ],
        max_completion_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const result3 = await response3.json();
    if (response3.ok) {
      console.log('✅ テスト3成功: generateNonUserImpactReportの実装パラメータで動作');
      console.log(`   レスポンス: ${result3.choices[0]?.message?.content}`);
      console.log(`   使用トークン: ${result3.usage?.total_tokens}`);
    } else {
      console.log('❌ テスト3失敗:', result3.error?.message || JSON.stringify(result3));
      return;
    }
  } catch (error) {
    console.log('❌ テスト3エラー:', error.message);
    return;
  }

  console.log('');

  // テスト4: generateTextの実装を検証
  console.log('📝 テスト4: generateTextの実装パラメータ');
  try {
    const response4 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.2-2025-12-11',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "OK" and nothing else.' },
        ],
        max_completion_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const result4 = await response4.json();
    if (response4.ok) {
      console.log('✅ テスト4成功: generateTextの実装パラメータで動作');
      console.log(`   レスポンス: ${result4.choices[0]?.message?.content}`);
      console.log(`   使用トークン: ${result4.usage?.total_tokens}`);
    } else {
      console.log('❌ テスト4失敗:', result4.error?.message || JSON.stringify(result4));
      return;
    }
  } catch (error) {
    console.log('❌ テスト4エラー:', error.message);
    return;
  }

  console.log('\n✅ すべての実装パラメータでGPT-5.2-2025-12-11 APIが正常に動作しました！');
}

testActualImplementation().catch(console.error);
