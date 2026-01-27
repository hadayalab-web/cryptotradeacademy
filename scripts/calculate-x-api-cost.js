// scripts/calculate-x-api-cost.js
// X APIのコスト計算

const dailyPosts = 557;
const monthlyPosts = dailyPosts * 30;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('💰 X API コスト計算');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📊 現在の投稿予測数:');
console.log(`   1日: ${dailyPosts}投稿`);
console.log(`   1ヶ月（30日）: ${monthlyPosts.toLocaleString()}投稿\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('💰 X API 料金プラン（2026年）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const plans = [
  {
    name: 'Free',
    price: 0,
    monthlyPosts: 1500,
    description: '書き込みのみ、読み取り不可',
    features: ['1,500投稿/月（書き込みのみ）', '1アプリ、1プロジェクト']
  },
  {
    name: 'Basic',
    price: 100,
    monthlyPosts: 50000,
    description: 'アプリ単位50,000投稿/月、ユーザー単位3,000投稿/月',
    features: ['10,000投稿/月（読み取り）', '3,000投稿/月（書き込み、ユーザー単位）', '50,000投稿/月（書き込み、アプリ単位）', '3アプリ/プロジェクト']
  },
  {
    name: 'Pro',
    price: 5000,
    monthlyPriceAnnual: 4500,
    monthlyPosts: 300000,
    description: '300,000投稿/月（書き込み）',
    features: ['1,000,000投稿/月（読み取り）', '300,000投稿/月（書き込み）', 'フィルターストリームAPI', 'フルアーカイブ検索', '3アプリ/プロジェクト']
  },
  {
    name: 'Enterprise',
    price: 42000,
    monthlyPosts: 50000000,
    description: 'カスタムプラン',
    features: ['50,000,000+投稿/月', '完全なストリーム', 'リプレイ機能', 'エンゲージメントメトリクス', '専任アカウントチーム', 'カスタム条件']
  }
];

plans.forEach(plan => {
  console.log(`${plan.name}:`);
  if (plan.monthlyPriceAnnual) {
    console.log(`   料金: $${plan.price.toLocaleString()}/月（月払い）、$${plan.monthlyPriceAnnual.toLocaleString()}/月（年払い）`);
  } else {
    console.log(`   料金: $${plan.price.toLocaleString()}/月`);
  }
  console.log(`   制限: ${plan.monthlyPosts.toLocaleString()}投稿/月`);
  console.log(`   説明: ${plan.description}`);
  plan.features.forEach(feature => {
    console.log(`   - ${feature}`);
  });
  console.log('');
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 必要なプラン');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (monthlyPosts <= plans[0].monthlyPosts) {
  console.log(`✅ Freeプランで対応可能: $0/月`);
} else if (monthlyPosts <= plans[1].monthlyPosts) {
  console.log(`⚠️ Basicプラン: $${plans[1].price}/月`);
  console.log(`   注意: ユーザー単位の制限（3,000投稿/月）を超える可能性があります`);
  console.log(`   アプリ単位では50,000投稿/月まで対応可能ですが、`);
  console.log(`   複数のインフルエンサーアカウントを使用する場合は制限に注意が必要です`);
} else if (monthlyPosts <= plans[2].monthlyPosts) {
  console.log(`✅ Proプラン: $${plans[2].price.toLocaleString()}/月（月払い）`);
  console.log(`   または: $${plans[2].monthlyPriceAnnual.toLocaleString()}/月（年払い、年間$${((plans[2].price - plans[2].monthlyPriceAnnual) * 12).toLocaleString()}節約）`);
  console.log(`   余裕: ${plans[2].monthlyPosts - monthlyPosts}投稿/月の余裕あり`);
} else {
  console.log(`⚠️ Enterpriseプランが必要: $${plans[3].price.toLocaleString()}/月〜`);
  console.log(`   カスタム条件での契約が必要です`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('💡 推奨プラン');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(`📊 現在の投稿数: ${monthlyPosts.toLocaleString()}投稿/月`);
console.log(`\n✅ 推奨: Proプラン（$${plans[2].price.toLocaleString()}/月）`);
console.log(`   理由:`);
console.log(`   - 300,000投稿/月まで対応可能（現在の${monthlyPosts.toLocaleString()}投稿/月を余裕でカバー）`);
console.log(`   - フィルターストリームAPIとフルアーカイブ検索が利用可能`);
console.log(`   - 年払いで年間$${((plans[2].price - plans[2].monthlyPriceAnnual) * 12).toLocaleString()}節約可能`);
console.log(`   - 将来的な拡張にも対応可能`);

console.log(`\n📈 コスト比較:`);
console.log(`   Basicプラン: $${plans[1].price}/月 = $${(plans[1].price * 12).toLocaleString()}/年`);
console.log(`   Proプラン（月払い）: $${plans[2].price.toLocaleString()}/月 = $${(plans[2].price * 12).toLocaleString()}/年`);
console.log(`   Proプラン（年払い）: $${plans[2].monthlyPriceAnnual.toLocaleString()}/月 = $${(plans[2].monthlyPriceAnnual * 12).toLocaleString()}/年`);

console.log('\n⚠️ 注意事項:');
console.log('   - Basicプランはユーザー単位で3,000投稿/月の制限があります');
console.log('   - 複数のインフルエンサーアカウントを使用する場合、各アカウントが3,000投稿/月の制限を受けます');
console.log('   - 現在の投稿数（16,710投稿/月）はBasicプランのアプリ単位制限（50,000投稿/月）内ですが、');
console.log('     ユーザー単位の制限を考慮すると、Proプランが安全です');
