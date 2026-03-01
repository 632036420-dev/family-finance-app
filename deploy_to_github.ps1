# 将本地项目推送到 GitHub，并输出后续在 Replit 的导入说明
# 运行方式：在 PowerShell 中执行本脚本，会提示输入 GitHub Personal Access Token

param()

function Read-PlainToken {
    Write-Host "请粘贴你的 GitHub Personal Access Token（输入后直接回车）："
    $secure = Read-Host -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
    return $plain
}

$token = Read-PlainToken
if (-not $token) { Write-Error "未提供 token，脚本退出"; exit 1 }

# 提示仓库名
$defaultName = "family-finance-app"
$repoName = Read-Host "输入要创建的 GitHub 仓库名（回车使用默认: $defaultName）"
if ([string]::IsNullOrWhiteSpace($repoName)) { $repoName = $defaultName }

# 是否私有
$privateAnswer = Read-Host "是否将仓库设置为私有？(Y/n, 默认 Y)"
$private = $true
if ($privateAnswer -and $privateAnswer.ToLower().StartsWith('n')) { $private = $false }

# 创建仓库请求
try {
    $body = @{ name = $repoName; private = $private } | ConvertTo-Json
    $headers = @{ Authorization = "token $token"; "User-Agent" = "family-finance-deployer" }
    $resp = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method POST -Headers $headers -Body $body
} catch {
    Write-Error "创建 GitHub 仓库失败：$($_.Exception.Message)"
    exit 1
}

$cloneUrl = $resp.clone_url
$repoHtml = $resp.html_url
Write-Host "✅ GitHub 仓库已创建： $repoHtml"

# 确认 git 可用
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "未找到 git，请先安装 Git 并确保在 PATH 中，然后重试。https://git-scm.com/downloads"
    exit 1
}

# 初始化或提交
if (-not (Test-Path ".git")) {
    git init
    git add .
    git commit -m "Initial commit"
} else {
    git add .
    try { git commit -m "chore: update" } catch { Write-Host "无变更需要提交或提交失败" }
}

# 设置远程并推送
try {
    $remotes = git remote
    if ($remotes -notmatch 'origin') {
        git remote add origin $cloneUrl
    } else {
        # 将本地项目推送到 GitHub，并输出后续在 Replit 的导入说明
        # 运行方式：在 PowerShell 中执行本脚本，会提示输入 GitHub Personal Access Token

        param()

        function Read-PlainToken {
            Write-Host "请粘贴你的 GitHub Personal Access Token（输入后直接回车）："
            $secure = Read-Host -AsSecureString
            $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
            try { $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
            return $plain
        }

        $token = Read-PlainToken
        if (-not $token) { Write-Error "未提供 token，脚本退出"; exit 1 }

        # 提示仓库名
        $defaultName = "family-finance-app"
        $repoName = Read-Host "输入要创建的 GitHub 仓库名（回车使用默认: $defaultName）"
        if ([string]::IsNullOrWhiteSpace($repoName)) { $repoName = $defaultName }

        # 是否私有
        $privateAnswer = Read-Host "是否将仓库设置为私有？(Y/n, 默认 Y)"
        $private = $true
        if ($privateAnswer -and $privateAnswer.ToLower().StartsWith('n')) { $private = $false }

        # 创建仓库请求
        try {
            $body = @{ name = $repoName; private = $private } | ConvertTo-Json
            $headers = @{ Authorization = "token $token"; "User-Agent" = "family-finance-deployer" }
            $resp = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method POST -Headers $headers -Body $body
        } catch {
            Write-Error "创建 GitHub 仓库失败：$($_.Exception.Message)"
            exit 1
        }

        $cloneUrl = $resp.clone_url
        $repoHtml = $resp.html_url
        Write-Host "✅ GitHub 仓库已创建： $repoHtml"

        # 确认 git 可用
        if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
            Write-Error "未找到 git，请先安装 Git 并确保在 PATH 中，然后重试。https://git-scm.com/downloads"
            exit 1
        }

        # 初始化或提交
        if (-not (Test-Path ".git")) {
            git init
            git add .
            git commit -m "Initial commit"
        } else {
            git add .
            try { git commit -m "chore: update" } catch { Write-Host "无变更需要提交或提交失败" }
        }

        # 设置远程并推送
        try {
            $remotes = git remote
            if ($remotes -notmatch 'origin') {
                git remote add origin $cloneUrl
            } else {
                git remote set-url origin $cloneUrl
            }
            git branch -M main
            git push -u origin main
        } catch {
            Write-Error "推送失败：$($_.Exception.Message)"
            exit 1
        }

        Write-Host "✅ 推送完成。仓库地址： $repoHtml"

        # 输出 Replit 导入说明
        Write-Host "`n--- 下一步：在 Replit 导入仓库（推荐） ---`n"
        Write-Host "1. 打开 https://replit.com/ ，登录或注册。"
        Write-Host "2. 点击 Create -> Import from GitHub，然后选择刚创建的仓库： $repoHtml 。"
        Write-Host "3. 在 Replit 的 Secrets（Environment variables）中添加："
        Write-Host "   Key: DASHSCOPE_API_KEY"
        Write-Host "   Value: （你的通义千问 API Key）"
        Write-Host "4. 在 Replit 的 Run 命令中输入： node cloudfunctions/api/index.js"
        Write-Host "5. 启动后，Replit 会为你提供一个公网 URL，复制该 URL，并在前端设置页填入（示例：https://your-repl-url）"

        Write-Host "`n如果你希望我继续尝试在 Replit 上自动创建 Repl，请在浏览器登录 Replit 并提供 Replit 的 API token（不推荐在聊天中贴 token）。建议你手动在 Replit 控制台完成导入，最简单也最安全。`n"

        Write-Host "脚本执行完毕。"
