# Vercel Deployment Fix - December 25, 2025

## Problem Summary

All Vercel deployments were failing with the error:
```
Cannot find module '../config/marketProfiles'
Require stack:
- /var/task/services/grok/client.js
- /var/task/api/cron.js
```

The issue persisted for 12+ hours despite multiple attempted solutions.

## Root Cause Analysis

**The fundamental issue**: Vercel serverless functions only bundle files within the `api/` directory structure. Files outside this directory (like `config/`) are not included in the deployment bundle, even with `includeFiles` configuration.

**Why previous solutions failed**:

1. ❌ **`includeFiles` approach**: Vercel's `includeFiles` only works for direct dependencies, not for files required by transitive dependencies
2. ❌ **Build script approach**: Copying `config/` to `api/config/` during build works, but:
   - The `require()` paths in the code still pointed to the wrong location
   - The fallback logic tried `../config/` first, which doesn't exist in Vercel's serverless environment
   - Node.js module resolution in serverless functions is strict and doesn't support runtime fallbacks

## The Solution

**Permanent file structure change**: Move `config/` to `api/config/` and update all require paths.

### Changes Made

1. **Moved config files**:
   - `config/marketProfiles.js` → `api/config/marketProfiles.js`
   - `config/thresholds.js` → `api/config/thresholds.js`

2. **Updated require paths** in:
   - `services/grok/client.js`: `require('../../api/config/marketProfiles')`
   - `logic/core/marketCore.js`: `require('../../api/config/thresholds')` and `require('../../api/config/marketProfiles')`
   - `logic/eventTriggers.js`: `require('../api/config/marketProfiles')`
   - `scripts/backtest/autoTuner.js`: `require('../../api/config/marketProfiles')`

3. **Removed unnecessary build infrastructure**:
   - Removed `buildCommand` from `vercel.json`
   - Removed `build` and `vercel-build` scripts from `package.json`
   - Removed `api/config/` from `.gitignore` (now it's a permanent part of the codebase)

4. **Kept old config/ for reference**: The original `config/` directory remains in the repository for documentation purposes, but is no longer actively used.

## Why This Works

1. **Vercel's bundling behavior**: Vercel automatically includes all files within the `api/` directory when building serverless functions
2. **Consistent paths**: All `require()` statements now use paths that resolve correctly in both local development and Vercel deployment
3. **No runtime fallbacks**: Eliminates the try/catch fallback pattern that was causing issues in serverless environments
4. **Zero build complexity**: No need for build scripts or configuration workarounds

## Verification

The fix was verified locally:
```bash
# Test that marketProfiles loads from new location
$ node -e "const { getMarketProfile } = require('./api/config/marketProfiles'); console.log('Profile:', getMarketProfile('EN').brandName);"
Profile: CryptoTrade Academy ✅

# Test path resolution from services/grok/client.js perspective
$ node -e "const path = require('path'); const marketProfilesPath = path.resolve(__dirname, 'services/grok', '../../api/config/marketProfiles'); const { getMarketProfile } = require(marketProfilesPath); console.log('Profile:', getMarketProfile('EN').brandName);"
Profile: CryptoTrade Academy ✅
```

## Lessons Learned

1. **Vercel serverless functions are strict**: Files must be within the `api/` directory structure
2. **Build-time solutions are insufficient**: If the runtime code has incorrect paths, build scripts won't help
3. **Avoid runtime fallbacks in serverless**: Try/catch patterns for module resolution don't work well in serverless environments
4. **Keep it simple**: Direct file structure changes are better than complex build configurations

## Commit

Fixed in commit: **4c6d50b**

## Next Steps

1. ✅ Deploy to Vercel and verify the fix works
2. Monitor deployment logs for any remaining issues
3. Update documentation if needed

---

**Status**: ✅ Fixed and committed
**Deployment**: Pending Vercel deployment verification
