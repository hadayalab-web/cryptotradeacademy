# scripts/request-copilot-review.ps1
# GitHub Copilot Agentへのレビュー依頼自動化スクリプト (PowerShell版)

param(
    [int]$IssueNumber = 0
)

Write-Host "🚀 Starting Copilot review request process..." -ForegroundColor Cyan

try {
    # Issue番号が指定されていない場合、最新のレビューIssueを検索
    if ($IssueNumber -eq 0) {
        Write-Host "🔍 Searching for latest review request issue..." -ForegroundColor Yellow
        $issues = gh issue list --limit 10 --json number,title,state | ConvertFrom-Json

        $reviewIssues = $issues | Where-Object {
            $_.state -eq "OPEN" -and
            ($_.title -like "*Review*" -or $_.title -like "*review*")
        }

        if ($reviewIssues.Count -eq 0) {
            throw "No review request issues found. Please create one first."
        }

        # 最新のIssueを使用
        $IssueNumber = $reviewIssues[0].number
        Write-Host "✅ Found review issue: #$IssueNumber - $($reviewIssues[0].title)" -ForegroundColor Green
    }

    Write-Host "`n📋 Preparing Copilot review request for issue #$IssueNumber..." -ForegroundColor Cyan

    # Issueの詳細を取得
    $issue = gh issue view $IssueNumber --json number,title,body,url | ConvertFrom-Json

    Write-Host "`n📄 Issue: #$($issue.number) - $($issue.title)" -ForegroundColor White
    Write-Host "🔗 URL: $($issue.url)`n" -ForegroundColor Blue

    # Copilot Agent用のコメントを作成
    $copilotComment = @"
@copilot Please review the code changes mentioned in this issue.

## Review Instructions

Please review the following files and provide feedback on:

### Review Focus Areas
1. **Code Quality**: Style, consistency, best practices
2. **Logic Correctness**: Algorithm implementation, data flow
3. **Error Handling**: Edge cases, error recovery
4. **Performance**: Optimization opportunities
5. **Documentation**: Code comments, README updates

### Related Documentation
- See `docs/COPILOT_REVIEW_REQUEST.md` for detailed review questions
- See `docs/IMPLEMENTATION_REVIEW.md` for implementation review

Please provide:
- Code quality feedback
- Logic validation
- Performance optimization suggestions
- Edge case identification
- Best practice recommendations

Thank you! 🙏
"@

    # コメントを一時ファイルに保存
    $commentFile = Join-Path $env:TEMP "copilot-review-comment-$IssueNumber.md"
    $copilotComment | Out-File -FilePath $commentFile -Encoding UTF8

    # Issueにコメントを追加
    Write-Host "💬 Adding Copilot review request comment..." -ForegroundColor Yellow
    gh issue comment $IssueNumber --body-file $commentFile

    # 一時ファイルを削除
    Remove-Item $commentFile -ErrorAction SilentlyContinue

    Write-Host "`n✅ Copilot review request added successfully!" -ForegroundColor Green
    Write-Host "`n📌 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Check issue #$IssueNumber : $($issue.url)" -ForegroundColor White
    Write-Host "   2. Wait for Copilot Agent to process the review" -ForegroundColor White
    Write-Host "   3. Monitor issue comments for review feedback`n" -ForegroundColor White

    Write-Host "Issue URL: $($issue.url)" -ForegroundColor Blue

    return $issue.url
}
catch {
    Write-Host "`n❌ Error requesting Copilot review: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

