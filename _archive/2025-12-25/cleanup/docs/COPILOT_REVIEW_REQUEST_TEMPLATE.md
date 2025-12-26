# GitHub Copilot Agents レビュー依頼テンプレート

## 📋 使用方法

このテンプレートを使用して、GitHub Copilot Agentsへのレビュー依頼を標準化します。

---

## 🎯 標準レビュー依頼テンプレート

```markdown
@copilot Please review this PR with special attention to:

## 🔍 Critical Checks

### 1. Variable Scope & Undefined Variable References
- [ ] All variables are properly scoped
- [ ] No undefined variable references
- [ ] Variable name consistency (especially check: `binanceData`, `binanceDataForTrap`)
- [ ] Compare with previous PRs for variable name consistency

### 2. Integration with Previous PRs
- [ ] Check PR #8 fixes are still applied (especially `binanceData` → `binanceDataForTrap`)
- [ ] Verify no regression of previously fixed issues
- [ ] Confirm variable naming consistency across PRs

### 3. Error Handling & Fallback Mechanisms
- [ ] All API calls have proper error handling
- [ ] Fallback mechanisms for API failures (especially Binance API 451 errors)
- [ ] Null/undefined value handling
- [ ] Error logging is appropriate

### 4. API Endpoint Changes (if applicable)
- [ ] API endpoint paths are correct
- [ ] Response structure changes are handled
- [ ] Backward compatibility is maintained

### 5. Deployment Readiness
- [ ] Code is ready for deployment
- [ ] No potential runtime errors
- [ ] Error messages are clear and actionable

## 📋 Review Context

**Related PRs**: PR #X (Description)
**Key Variables**: `variable1`, `variable2`
**API Dependencies**: API Name (Dependencies)
**Known Issues**: Issue #X, Issue #Y
```

---

## 📝 カスタマイズ方法

### 1. 関連PRがある場合

```markdown
**Related PRs**:
- PR #8: Variable naming fixes (`binanceData` → `binanceDataForTrap`)
- PR #14: CryptoQuant API endpoint fixes
```

### 2. 重要な変数がある場合

```markdown
**Key Variables**:
- `binanceDataForTrap`: Used for trap score calculation, must be null-safe
- `whaleFlows`: Changed structure from `{inflow, outflow}` to `{whaleRatio, isHighPressure}`
- `liquidations`: Changed from number to `{longLiquidations, shortLiquidations, totalLiquidations}`
```

### 3. API依存関係がある場合

```markdown
**API Dependencies**:
- CryptoQuant API: Used for whale ratio, liquidations, NUPL, SOPR
- Binance API: Used for funding rate, long/short ratio (may fail with 451 error)
```

### 4. 既知の問題がある場合

```markdown
**Known Issues**:
- Issue #X: Binance API 451 error in some regions (fallback required)
- Issue #Y: Variable naming inconsistency between PRs
```

---

## 🔧 プロジェクト固有のテンプレート

### CryptoQuant API関連のPR

```markdown
@copilot Please review this PR with special attention to:

## 🔍 Critical Checks

### 1. Variable Scope & Undefined Variable References
- [ ] Check `binanceData` vs `binanceDataForTrap` consistency
- [ ] Verify `whaleFlows` structure changes are handled
- [ ] Confirm `liquidations` structure changes are backward compatible

### 2. Integration with Previous PRs
- [ ] PR #8: `binanceData` → `binanceDataForTrap` fix is still applied
- [ ] PR #14: API endpoint changes are correct
- [ ] No regression of previously fixed variable naming issues

### 3. Error Handling & Fallback Mechanisms
- [ ] CryptoQuant API 404 errors are handled gracefully
- [ ] Binance API 451 errors have fallback mechanisms
- [ ] Null/undefined values are handled properly in all calculations

### 4. API Endpoint Changes
- [ ] All endpoints match CryptoQuant API v1 specification
- [ ] Response structure changes are handled in dependent code
- [ ] Backward compatibility is maintained where possible

## 📋 Review Context

**Related PRs**: PR #8 (Variable naming), PR #14 (API endpoints)
**Key Variables**: `binanceDataForTrap`, `whaleFlows`, `liquidations`
**API Dependencies**: CryptoQuant API, Binance API
**Known Issues**: Binance API 451 error (regional restriction)
```

---

## ✅ チェックリスト（レビュー依頼前）

依頼前に以下を確認してください：

- [ ] 関連する過去のPRを確認した
- [ ] 重要な変数名をリストアップした
- [ ] API依存関係を確認した
- [ ] 既知の問題を記録した
- [ ] レビュー依頼テンプレートをカスタマイズした

---

**最終更新**: 2025-12-24
**バージョン**: 1.0.0













