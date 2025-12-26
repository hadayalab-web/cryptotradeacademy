# CryptoQuant API検証スクリプト（Infisical対応版）
# 使用方法: .\scripts\test-cryptoquant-api-with-infisical.ps1

Write-Host "🔍 CryptoQuant API検証スクリプト（Infisical対応版）" -ForegroundColor Cyan
Write-Host ""

# InfisicalからCRYPTOQUANT_API_KEYを取得（もしInfisicalを使用している場合）
# 注意: InfisicalのトークンとプロジェクトIDが設定されている必要があります

$env:CRYPTOQUANT_API_KEY = $null

# .envファイルから読み込む（優先）
if (Test-Path ".env") {
    Write-Host "📄 .envファイルから読み込み..." -ForegroundColor Yellow
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^CRYPTOQUANT_API_KEY=(.+)$") {
            $env:CRYPTOQUANT_API_KEY = $matches[1].Trim()
            Write-Host "✅ CRYPTOQUANT_API_KEYを.envから取得しました（長さ: $($env:CRYPTOQUANT_API_KEY.Length)文字）" -ForegroundColor Green
        }
    }
}

# Infisicalから取得（.envにない場合）
if (-not $env:CRYPTOQUANT_API_KEY) {
    Write-Host "🔐 Infisicalから取得を試みます..." -ForegroundColor Yellow

    # Infisicalの設定を確認
    if (Test-Path ".infisical.json") {
        $infisicalConfig = Get-Content ".infisical.json" | ConvertFrom-Json
        $token = $infisicalConfig.token
        $projectId = $infisicalConfig.projectId

        if ($token -and $projectId) {
            Write-Host "📦 InfisicalプロジェクトID: $projectId" -ForegroundColor Cyan

            # Infisical CLIがインストールされているか確認
            $infisicalPath = Get-Command infisical -ErrorAction SilentlyContinue
            if ($infisicalPath) {
                try {
                    $apiKey = infisical secrets get CRYPTOQUANT_API_KEY --token $token --projectId $projectId 2>&1
                    if ($LASTEXITCODE -eq 0 -and $apiKey) {
                        $env:CRYPTOQUANT_API_KEY = $apiKey.Trim()
                        Write-Host "✅ CRYPTOQUANT_API_KEYをInfisicalから取得しました" -ForegroundColor Green
                    } else {
                        Write-Host "⚠️ InfisicalからCRYPTOQUANT_API_KEYを取得できませんでした" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "❌ Infisicalから取得中にエラー: $_" -ForegroundColor Red
                }
            } else {
                Write-Host "⚠️ Infisical CLIがインストールされていません" -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠️ .infisical.jsonにトークンまたはプロジェクトIDが設定されていません" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ .infisical.jsonファイルが見つかりません" -ForegroundColor Yellow
    }
}

# APIキーが設定されているか確認
if (-not $env:CRYPTOQUANT_API_KEY) {
    Write-Host ""
    Write-Host "❌ CRYPTOQUANT_API_KEYが設定されていません" -ForegroundColor Red
    Write-Host ""
    Write-Host "以下のいずれかの方法でAPIキーを設定してください:" -ForegroundColor Yellow
    Write-Host "1. .envファイルに CRYPTOQUANT_API_KEY=your_api_key を追加" -ForegroundColor Cyan
    Write-Host "2. InfisicalにCRYPTOQUANT_API_KEYを設定して、このスクリプトを実行" -ForegroundColor Cyan
    Write-Host "3. 環境変数として直接設定: `$env:CRYPTOQUANT_API_KEY='your_api_key'" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "🚀 CryptoQuant API検証スクリプトを実行します..." -ForegroundColor Green
Write-Host ""

# Node.jsスクリプトを実行
node scripts/test-cryptoquant-api.js

# 実行結果の確認
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 検証が正常に完了しました" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ 検証中にエラーが発生しました（終了コード: $LASTEXITCODE）" -ForegroundColor Red
    exit $LASTEXITCODE
}



















