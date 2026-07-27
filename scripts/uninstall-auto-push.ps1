$ErrorActionPreference = 'SilentlyContinue'
$taskName = 'StylishMe Auto Push'
Stop-ScheduledTask -TaskName $taskName
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
Write-Output "Removed: $taskName"

