param(
    [int]$PollSeconds = 10,
    [int]$StableChecks = 3
)

$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
$logPath = Join-Path $repoPath '.git\auto-push.log'
$mutex = [System.Threading.Mutex]::new($false, 'Local\StylishMeAutoPush')

if (-not $mutex.WaitOne(0)) {
    exit 0
}

function Write-AutoPushLog([string]$Message) {
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -LiteralPath $logPath -Value "[$timestamp] $Message"
}

function Get-ChangeSignature {
    $status = & git -C $repoPath status --porcelain=v1 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to read Git status: $status"
    }
    return ($status -join "`n")
}

try {
    Write-AutoPushLog 'Auto-push watcher started.'
    $lastSignature = ''
    $stableCount = 0

    while ($true) {
        $signature = Get-ChangeSignature

        if ([string]::IsNullOrWhiteSpace($signature)) {
            $lastSignature = ''
            $stableCount = 0
        }
        elseif ($signature -eq $lastSignature) {
            $stableCount++

            if ($stableCount -ge $StableChecks) {
                & git -C $repoPath add --all 2>&1 | ForEach-Object { Write-AutoPushLog $_ }
                $commitMessage = 'Auto-save: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
                & git -C $repoPath commit -m $commitMessage 2>&1 | ForEach-Object { Write-AutoPushLog $_ }

                if ($LASTEXITCODE -eq 0) {
                    & git -C $repoPath push origin main 2>&1 | ForEach-Object { Write-AutoPushLog $_ }
                    if ($LASTEXITCODE -eq 0) {
                        Write-AutoPushLog 'Changes pushed successfully.'
                    }
                    else {
                        Write-AutoPushLog 'Push failed; the commit remains safely stored locally.'
                    }
                }

                $lastSignature = ''
                $stableCount = 0
            }
        }
        else {
            $lastSignature = $signature
            $stableCount = 1
        }

        Start-Sleep -Seconds $PollSeconds
    }
}
catch {
    Write-AutoPushLog "Watcher stopped: $($_.Exception.Message)"
    exit 1
}
finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}

