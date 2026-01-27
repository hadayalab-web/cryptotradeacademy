// GPT-5.2-2025-12-11 API検証スクリプト
// 実際にAPIを呼び出して、実装が正しいか検証する

require('dotenv').config();

async function testGPT52API() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEYが設定されていません');
    process.exit(1);
  }

  console.log('🔍 GPT-5.2-2025-12-11 API検証を開始...\n');

  // テスト1: max_completion_tokensのみを使用
  console.log('📝 テスト1: max_completion_tokensのみを使用');
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
          { role: 'user', content: 'Say "test1" and nothing else.' },
        ],
        max_completion_tokens: 10,
      }),
    });

    const result1 = await response1.json();
    if (response1.ok) {
      console.log('✅ テスト1成功: max_completion_tokensのみで動作');
      console.log(`   レスポンス: ${result1.choices[0]?.message?.content}`);
    } else {
      console.log('❌ テスト1失敗:', result1.error?.message || JSON.stringify(result1));
    }
  } catch (error) {
    console.log('❌ テスト1エラー:', error.message);
  }

  console.log('');

  // テスト2: max_completion_tokens + max_tokensの両方を使用（現在の実装）
  console.log('📝 テスト2: max_completion_tokens + max_tokensの両方を使用');
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
          { role: 'user', content: 'Say "test2" and nothing else.' },
        ],
        max_completion_tokens: 10,
        max_tokens: 10, // 後方互換性のため残す
      }),
    });

    const result2 = await response2.json();
    if (response2.ok) {
      console.log('✅ テスト2成功: max_completion_tokens + max_tokensの両方で動作');
      console.log(`   レスポンス: ${result2.choices[0]?.message?.content}`);
    } else {
      console.log('❌ テスト2失敗:', result2.error?.message || JSON.stringify(result2));
    }
  } catch (error) {
    console.log('❌ テスト2エラー:', error.message);
  }

  console.log('');

  // テスト3: max_tokensのみを使用（非推奨だが動作するか確認）
  console.log('📝 テスト3: max_tokensのみを使用（非推奨）');
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
          { role: 'user', content: 'Say "test3" and nothing else.' },
        ],
        max_tokens: 10, // 非推奨だが後方互換性のため動作するか確認
      }),
    });

    const result3 = await response3.json();
    if (response3.ok) {
      console.log('✅ テスト3成功: max_tokensのみでも動作（後方互換性あり）');
      console.log(`   レスポンス: ${result3.choices[0]?.message?.content}`);
    } else {
      console.log('⚠️ テスト3警告:', result3.error?.message || JSON.stringify(result3));
      console.log('   （max_tokensのみは非推奨のため、エラーでも問題なし）');
    }
  } catch (error) {
    console.log('❌ テスト3エラー:', error.message);
  }

  console.log('\n✅ 検証完了');
}

testGPT52API().catch(console.error);
