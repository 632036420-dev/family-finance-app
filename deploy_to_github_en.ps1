# Create a GitHub repository and push local project
# Run this script in PowerShell; it will prompt for a GitHub Personal Access Token

function Read-Token {
    Write-Host "Please paste your GitHub Personal Access Token and press Enter:" -NoNewline
    $secure = Read-Host -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
    return $plain
}

$token = Read-Token
if (-not $token) { Write-Error "No token provided. Exiting."; exit 1 }

$defaultName = "family-finance-app"
$repoName = Read-Host "Enter GitHub repo name (press Enter to use default: $defaultName)"
if ([string]::IsNullOrWhiteSpace($repoName)) { $repoName = $defaultName }

$privateAnswer = Read-Host "Make repository private? (Y/n, default Y)"
$private = $true
if ($privateAnswer -and $privateAnswer.ToLower().StartsWith('n')) { $private = $false }

try {
    $body = @{ name = $repoName; private = $private } | ConvertTo-Json
    $headers = @{ Authorization = "token $token"; "User-Agent" = "family-finance-deployer" }
    $resp = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method POST -Headers $headers -Body $body
} catch {
    Write-Error "Failed to create GitHub repo: $($_.Exception.Message)"
    exit 1
}

$cloneUrl = $resp.clone_url
$repoHtml = $resp.html_url
Write-Host "Repository created: $repoHtml"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git not found. Install git first: https://git-scm.com/downloads"
    exit 1
}

if (-not (Test-Path ".git")) {
    git init
    git add .
    git commit -m "Initial commit"
} else {
    git add .
    try { git commit -m "chore: update" } catch { Write-Host "No changes to commit" }
}

try {
    $remotes = git remote
    if ($remotes -notmatch 'origin') { git remote add origin $cloneUrl } else { git remote set-url origin $cloneUrl }
    git branch -M main
    git push -u origin main
} catch {
    Write-Error "Push failed: $($_.Exception.Message)"
    exit 1
}

Write-Host "Push completed. Repo URL: $repoHtml"

Write-Host "\nNext steps (Replit import):"
Write-Host "1) Go to https://replit.com and sign in."
Write-Host "2) Create -> Import from GitHub -> select the repo: $repoHtml"
Write-Host "3) In Replit, set an Environment Variable: key=\"DASHSCOPE_API_KEY\", value=your-api-key"
Write-Host "4) Set Run command: node cloudfunctions/api/index.js"
Write-Host "5) Start the Repl; Replit will provide a public URL. Paste that URL into the front-end settings."

Write-Host "Script finished."