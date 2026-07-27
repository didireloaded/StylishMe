$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
$watcherPath = Join-Path $PSScriptRoot 'auto-push.ps1'
$taskName = 'StylishMe Auto Push'
$powerShellPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$arguments = "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$watcherPath`""

$action = New-ScheduledTaskAction -Execute $powerShellPath -Argument $arguments -WorkingDirectory $repoPath
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Automatically commits and pushes settled StylishMe code changes to GitHub.' -Force | Out-Null
Start-ScheduledTask -TaskName $taskName

Write-Output "Installed and started: $taskName"

