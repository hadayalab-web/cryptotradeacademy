// config/officialCryptoXAccounts.js
// Crypto関連のX公式アカウントリスト（引用リポスト・リスト取得で必須）
// 取得: 本リスト → X API で実在確認 → KV 在庫にストック

/**
 * 取引所・ブローカー公式（Xユーザー名＝@なし）
 */
const EXCHANGES = [
  "binance",
  "coinbase",
  "krakenfx",
  "OKX",
  "Bybit_Official",
  "BitgetOfficial",
  "kucoincom",
  "Gemini",
  "Bitfinex",
  "bitFlyer",
  "Bitstamp",
  "CryptoCom",
  "huobiglobal",
  "gate_io",
  "Bitso",
  "MercadoBitcoin",
  "LunoMoney",
  "WazirXIndia",
  "CoinDCX",
  "upbitglobal"
];

/**
 * プロジェクト・ファウンデーション・公式
 */
const PROJECTS_AND_FOUNDATIONS = [
  "BitcoinMagazine",
  "VitalikButerin",
  "ethereum",
  "solana",
  "Ripple",
  "RippleXDev",
  "Cardano",
  "IOHK_Charles",
  "Polkadot",
  "avalancheavax",
  "chainlink",
  "Polygon",
  "Uniswap",
  "LidoFinance",
  "AaveAave",
  "CurveFinance",
  "MakerDAO",
  "compoundfinance",
  "SushiSwap",
  "base",
  "arbitrum",
  "optimismFND",
  "zksync",
  "Starknet",
  "cosmos",
  "Injective_",
  "AptosLabs",
  "SuiNetwork",
  "NEARProtocol",
  "FantomFDN",
  "Algorand",
  "Hedera",
  "Tronfoundation",
  "litecoin",
  "BitcoinCash",
  "monero",
  "dogecoin",
  "Shibtoken",
  "pepe",
  "worldcoin",
  "Tether_to",
  "circle",
  "Paxos"
];

/**
 * 企業・VC・メディア公式
 */
const COMPANIES_AND_MEDIA = [
  "MicroStrategy",
  "saylor",
  "Tesla",
  "SpaceX",
  "xai",
  "elonmusk",
  "a16z",
  "paradigm",
  "MulticoinCap",
  "Polychain",
  "DCGco",
  "grayscale",
  "CoinDesk",
  "Cointelegraph",
  "TheBlock__",
  "decrypt",
  "Blockworks_",
  "BanklessHQ",
  "MessariCrypto",
  "CryptoQuant",
  "Glassnode",
  "Nansen",
  "DuneAnalytics",
  "DefiLlama"
];

/**
 * 全公式アカウントを1配列で取得（重複除去・小文字正規化なし＝Xは大小区別）
 * @returns {string[]} ユーザー名（@なし）
 */
function getOfficialCryptoUsernames() {
  const seen = new Set();
  const out = [];
  for (const u of [...EXCHANGES, ...PROJECTS_AND_FOUNDATIONS, ...COMPANIES_AND_MEDIA]) {
    const name = (u && String(u).trim()).replace(/^@/, "");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/**
 * カテゴリ別に取得
 */
function getOfficialByCategory() {
  return {
    exchanges: [...EXCHANGES],
    projectsAndFoundations: [...PROJECTS_AND_FOUNDATIONS],
    companiesAndMedia: [...COMPANIES_AND_MEDIA]
  };
}

module.exports = {
  EXCHANGES,
  PROJECTS_AND_FOUNDATIONS,
  COMPANIES_AND_MEDIA,
  getOfficialCryptoUsernames,
  getOfficialByCategory
};
