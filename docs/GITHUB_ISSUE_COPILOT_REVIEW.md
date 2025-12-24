# GitHub Issue Template: Copilot Review Request

## Issue Title
```
Code Review Request: Binance API Integration & Backtest Improvements
```

## Issue Body
```markdown
## 📋 Review Request

@copilot Please review the recent implementation of Binance API integration and backtest improvements.

### Recent Changes Summary

1. **Binance API Integration** (`services/binance/client.js`)
   - New Binance API client with Funding Rate, Open Interest, Long/Short Ratio endpoints
   - Complementary data fetching for CryptoQuant integration

2. **CryptoQuant + Binance Data Integration**
   - Enhanced `calculateTrapScore()` with Binance data corrections
   - Enhanced `scoreSocial()` with Binance data corrections
   - Improved score calculation accuracy

3. **Algorithm Auto-Tuning Framework** (`scripts/backtest/autoTuner.js`)
   - Grid search implementation
   - Parameter optimization framework

### Key Files to Review

- `services/binance/client.js` (new)
- `services/cryptoquant/deepMetrics.js` (modified)
- `logic/core/marketCore.js` (modified)
- `api/cron.js` (modified)
- `scripts/backtest/autoTuner.js` (new)

### Specific Review Questions

1. **Binance API Client**:
   - Are API endpoints correct according to Binance documentation?
   - Is error handling sufficient?
   - Any rate limiting concerns?

2. **Score Calculation**:
   - Are Binance data corrections (Funding Rate, Long/Short Ratio) logically sound?
   - Do score adjustments make sense?
   - Are edge cases handled?

3. **Data Integration**:
   - Is parallel data fetching efficient?
   - Are error fallbacks appropriate?

4. **Code Quality**:
   - Code style and consistency
   - Performance optimization opportunities
   - Documentation adequacy

### Related Documentation

- Review request details: `docs/COPILOT_REVIEW_REQUEST.md`
- Implementation review: `docs/IMPLEMENTATION_REVIEW.md`
- Backtest improvement plan: `docs/BACKTEST_IMPROVEMENT_PLAN.md`

### Commits to Review

- `e975b04`: fix: Complete Binance data integration in trapScore calculation
- `97fcb7f`: feat: Binance API integration and backtest improvements
- `e151222`: docs: Add GitHub Copilot review request document

---

**Priority**: Medium
**Estimated Review Time**: 30-60 minutes
**Labels**: `code-review`, `enhancement`, `backtest`
```

## How to Create the Issue

1. Go to: https://github.com/hadayalab-web/cryptosignal-ai/issues/new
2. Copy the Issue Body above
3. Paste into the issue body
4. Add labels: `code-review`, `enhancement`, `backtest`
5. Assign to: @copilot (or @hadayalab-web)
6. Submit the issue

---

Alternatively, you can use GitHub CLI:

```bash
gh issue create \
  --title "Code Review Request: Binance API Integration & Backtest Improvements" \
  --body "$(cat docs/GITHUB_ISSUE_COPILOT_REVIEW.md | sed -n '/^```markdown$/,/^```$/p' | sed '1d;$d')" \
  --label "code-review,enhancement,backtest" \
  --assignee "@copilot"
```

