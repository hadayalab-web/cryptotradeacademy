# CryptoQuant ドキュメント取得スクリプト
# このスクリプトは、CryptoQuantのドキュメントとカタログをローカルに保存します

param(
    [string]$OutputDir = "$PSScriptRoot\..\docs\cryptoquant-docs",
    [switch]$OpenAfterDownload = $false
)

# 出力ディレクトリを作成
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Host "✅ 出力ディレクトリを作成しました: $OutputDir" -ForegroundColor Green
}

# ダウンロードするURL
$urls = @{
    "docs" = "https://cryptoquant.com/docs"
    "catalog" = "https://cryptoquant.com/catalog"
}

Write-Host "`n📥 CryptoQuant ドキュメントを取得中..." -ForegroundColor Cyan

foreach ($key in $urls.Keys) {
    $url = $urls[$key]
    $outputFile = Join-Path $OutputDir "$key.html"

    try {
        Write-Host "  - $key をダウンロード中..." -ForegroundColor Yellow

        # Webページを取得
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop

        # HTMLを保存
        $response.Content | Out-File -FilePath $outputFile -Encoding UTF8

        Write-Host "  ✅ $key を保存しました: $outputFile" -ForegroundColor Green
    }
    catch {
        Write-Host "  ❌ $key の取得に失敗しました: $_" -ForegroundColor Red
        Write-Host "     URL: $url" -ForegroundColor Gray
        Write-Host "     注意: Cloudflareのチャレンジがある場合、手動でブラウザからアクセスしてください" -ForegroundColor Yellow
    }
}

Write-Host "`n📝 リファレンスファイルを確認してください:" -ForegroundColor Cyan
Write-Host "   docs\cryptoquant-reference.md" -ForegroundColor White

if ($OpenAfterDownload) {
    # リファレンスファイルを開く
    $refFile = Join-Path $PSScriptRoot "..\docs\cryptoquant-reference.md"
    if (Test-Path $refFile) {
        Start-Process $refFile
    }
}

Write-Host "`n✨ 完了しました！" -ForegroundColor Green

