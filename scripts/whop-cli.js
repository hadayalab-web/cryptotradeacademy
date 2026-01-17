// scripts/whop-cli.js
// Whop API 操作用の簡易CLI

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  getProduct,
  listProducts,
  updateProduct,
  getPromoCode,
  listPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  getPlan,
  listPlans,
  updatePlan,
  getExperience,
  listExperiences,
  updateExperience,
  getMembership,
  listMemberships,
  updateMembership,
  cancelMembership,
  terminateMembership,
  whopApiRequest,
} = require('../services/whop/client');

function parseArgs(args) {
  const parsed = {};
  args.forEach(arg => {
    if (!arg.startsWith('--')) {
      return;
    }
    const raw = arg.slice(2);
    if (!raw) {
      return;
    }
    const [key, ...rest] = raw.split('=');
    if (rest.length === 0) {
      parsed[key] = true;
      return;
    }
    parsed[key] = rest.join('=');
  });
  return parsed;
}

function readJsonInput(args) {
  if (args['data-json']) {
    return JSON.parse(args['data-json']);
  }
  if (!args.data) {
    return null;
  }
  const inputPath = path.isAbsolute(args.data)
    ? args.data
    : path.join(process.cwd(), args.data);
  const content = fs.readFileSync(inputPath, 'utf8');
  return JSON.parse(content);
}

function buildParams(args, reservedKeys) {
  const params = {};
  Object.entries(args).forEach(([key, value]) => {
    if (reservedKeys.has(key)) {
      return;
    }
    params[key] = value;
  });
  return params;
}

function normalizeArrayArgs(args, keys) {
  keys.forEach(key => {
    const value = args[key];
    if (typeof value === 'string' && value.includes(',')) {
      args[key] = value.split(',').map(item => item.trim()).filter(Boolean);
    }
  });
}

function writeOutput(result, args) {
  const pretty = Boolean(args.pretty);
  const output = pretty
    ? JSON.stringify(result, null, 2)
    : JSON.stringify(result);

  if (args.out) {
    const outputPath = path.isAbsolute(args.out)
      ? args.out
      : path.join(process.cwd(), args.out);
    fs.writeFileSync(outputPath, output, 'utf8');
    console.log(`Saved output to ${outputPath}`);
    return;
  }
  console.log(output);
}

function printHelp() {
  console.log(`
Whop CLI (Cursor用)

Usage:
  node scripts/whop-cli.js <command> [options]

Commands:
  products:get        --id=prod_xxx [--expand=plans,experiences]
  products:list       [--company_id=...] [--visibility=...]
  products:update     --id=prod_xxx --data=path.json [--apply]

  promo_codes:get     --id=promo_xxx
  promo_codes:list    [--company_id=...] [--product_id=...] [--plan_ids=...]
  promo_codes:create  --data=path.json [--apply]
  promo_codes:update  --id=promo_xxx --data=path.json [--apply]
  promo_codes:delete  --id=promo_xxx [--apply]

  plans:get           --id=plan_xxx
  plans:list          [--company_id=...] [--product_id=...] [--visibility=...]
  plans:update        --id=plan_xxx --data=path.json [--apply]

  experiences:get     --id=exp_xxx
  experiences:list    [--company_id=...] [--product_id=...]
  experiences:update  --id=exp_xxx --data=path.json [--apply]

  memberships:get     --id=mem_xxx
  memberships:list    [--status=active] [--product_id=...] [--plan_id=...]
  memberships:update  --id=mem_xxx --data=path.json [--apply]
  memberships:cancel  --id=mem_xxx --data=path.json [--apply]
  memberships:terminate --id=mem_xxx [--apply]

  api:call            --method=GET --path=/v2/path [--data=path.json] [--apply]

Options:
  --expand=plans,experiences   products:get の expand 指定
  --data=path.json             更新データ（JSONファイル）
  --data-json='{"key":"value"}'  更新データ（JSON文字列）
  --method=GET|POST|DELETE     api:call のHTTPメソッド
  --path=/memberships          api:call のエンドポイントパス
  --apply                      更新を実行（未指定の場合はdry-run）
  --out=path.json              出力をファイル保存（Cursor停止対策）
  --pretty                     JSONを整形出力
  --help                       このヘルプを表示
`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (!command || args.help) {
    printHelp();
    return;
  }

  normalizeArrayArgs(args, [
    'expand',
    'plan_ids',
    'product_ids',
    'plan_ids[]',
    'product_ids[]',
  ]);

  const reservedKeys = new Set([
    'id',
    'data',
    'data-json',
    'expand',
    'method',
    'path',
    'apply',
    'out',
    'pretty',
    'help',
  ]);

  const safeMethods = new Set(['GET', 'HEAD']);

  let result = null;
  switch (command) {
    case 'products:get': {
      if (!args.id) {
        throw new Error('products:get requires --id');
      }
      const expand = Array.isArray(args.expand) ? args.expand : (args.expand ? [args.expand] : []);
      result = await getProduct(args.id, expand);
      break;
    }
    case 'products:list': {
      const params = buildParams(args, reservedKeys);
      result = await listProducts(params);
      break;
    }
    case 'products:update': {
      if (!args.id) {
        throw new Error('products:update requires --id');
      }
      const payload = readJsonInput(args);
      if (!payload) {
        throw new Error('products:update requires --data or --data-json');
      }
      if (!args.apply) {
        result = { dryRun: true, id: args.id, payload };
        break;
      }
      result = await updateProduct(args.id, payload);
      break;
    }
    case 'promo_codes:get': {
      if (!args.id) {
        throw new Error('promo_codes:get requires --id');
      }
      result = await getPromoCode(args.id);
      break;
    }
    case 'promo_codes:list': {
      const params = buildParams(args, reservedKeys);
      result = await listPromoCodes(params);
      break;
    }
    case 'promo_codes:create': {
      const payload = readJsonInput(args);
      if (!payload) {
        throw new Error('promo_codes:create requires --data or --data-json');
      }
      if (!args.apply) {
        result = { dryRun: true, payload };
        break;
      }
      result = await createPromoCode(payload);
      break;
    }
    case 'promo_codes:update': {
      if (!args.id) {
        throw new Error('promo_codes:update requires --id');
      }
      const payload = readJsonInput(args);
      if (!payload) {
        throw new Error('promo_codes:update requires --data or --data-json');
      }
      if (!args.apply) {
        result = { dryRun: true, id: args.id, payload };
        break;
      }
      result = await updatePromoCode(args.id, payload);
      break;
    }
    case 'promo_codes:delete': {
      if (!args.id) {
        throw new Error('promo_codes:delete requires --id');
      }
      if (!args.apply) {
        result = { dryRun: true, id: args.id };
        break;
      }
      result = await deletePromoCode(args.id);
      break;
    }
    case 'plans:get': {
      if (!args.id) {
        throw new Error('plans:get requires --id');
      }
      result = await getPlan(args.id);
      break;
    }
    case 'plans:list': {
      const params = buildParams(args, reservedKeys);
      result = await listPlans(params);
      break;
    }
    case 'plans:update': {
      if (!args.id) {
        throw new Error('plans:update requires --id');
      }
      const payload = readJsonInput(args);
      if (!payload) {
        throw new Error('plans:update requires --data or --data-json');
      }
      if (!args.apply) {
        result = { dryRun: true, id: args.id, payload };
        break;
      }
      result = await updatePlan(args.id, payload);
      break;
    }
    case 'experiences:get': {
      if (!args.id) {
        throw new Error('experiences:get requires --id');
      }
      result = await getExperience(args.id);
      break;
    }
    case 'experiences:list': {
      const params = buildParams(args, reservedKeys);
      result = await listExperiences(params);
      break;
    }
    case 'experiences:update': {
      if (!args.id) {
        throw new Error('experiences:update requires --id');
      }
      const payload = readJsonInput(args);
      if (!payload) {
        throw new Error('experiences:update requires --data or --data-json');
      }
      if (!args.apply) {
        result = { dryRun: true, id: args.id, payload };
        break;
      }
      result = await updateExperience(args.id, payload);
      break;
    }
    case 'memberships:get': {
      if (!args.id) {
        throw new Error('memberships:get requires --id');
      }
      result = await getMembership(args.id);
      break;
    }
    case 'memberships:list': {
      const params = buildParams(args, reservedKeys);
      result = await listMemberships(params);
      break;
    }
    case 'memberships:update': {
      if (!args.id) {
        throw new Error('memberships:update requires --id');
      }
      const payload = readJsonInput(args);
      if (!payload) {
        throw new Error('memberships:update requires --data or --data-json');
      }
      if (!args.apply) {
        result = { dryRun: true, id: args.id, payload };
        break;
      }
      result = await updateMembership(args.id, payload);
      break;
    }
    case 'memberships:cancel': {
      if (!args.id) {
        throw new Error('memberships:cancel requires --id');
      }
      const payload = readJsonInput(args);
      if (!payload) {
        throw new Error('memberships:cancel requires --data or --data-json');
      }
      if (!args.apply) {
        result = { dryRun: true, id: args.id, payload };
        break;
      }
      result = await cancelMembership(args.id, payload);
      break;
    }
    case 'memberships:terminate': {
      if (!args.id) {
        throw new Error('memberships:terminate requires --id');
      }
      if (!args.apply) {
        result = { dryRun: true, id: args.id };
        break;
      }
      result = await terminateMembership(args.id);
      break;
    }
    case 'api:call': {
      if (!args.method || !args.path) {
        throw new Error('api:call requires --method and --path');
      }
      const method = String(args.method).toUpperCase();
      const payload = readJsonInput(args);
      if (!safeMethods.has(method) && !args.apply) {
        result = { dryRun: true, method, path: args.path, payload };
        break;
      }
      result = await whopApiRequest(args.path, {
        method,
        body: payload || undefined,
        returnRaw: Boolean(args.out),
      });
      break;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }

  writeOutput(result, args);
}

main().catch(error => {
  console.error(`[Whop CLI] Error: ${error.message}`);
  process.exit(1);
});
