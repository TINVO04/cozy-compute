param([string]$DeployDir = 'D:/CozyGameProduction')
$ErrorActionPreference = 'Stop'
$deployRoot = (Resolve-Path -LiteralPath $DeployDir).Path
$nodeExe = (Get-Command node.exe).Source
$account = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
if (Get-ScheduledTask -TaskName 'Cozy Game Production' -ErrorAction SilentlyContinue) {
    throw 'Production task already exists. Review it before changing it.'
}
if (Get-ScheduledTask -TaskName 'Cozy Game Backup' -ErrorAction SilentlyContinue) {
    throw 'Backup task already exists. Review it before changing it.'
}
$manager = Join-Path $deployRoot 'manager'
# These scripts read the protected .env; no credentials are stored in task arguments.
$env:COZY_DEPLOY_DIR = $deployRoot
$taskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $account -LogonType Interactive -RunLevel Limited
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument ('"' + (Join-Path $manager 'windows-supervisor.mjs') + '"') -WorkingDirectory $deployRoot
Register-ScheduledTask -TaskName 'Cozy Game Production' -Action $action -Trigger (New-ScheduledTaskTrigger -AtLogOn -User $account) -Settings $taskSettings -Principal $principal | Out-Null
$backupAction = New-ScheduledTaskAction -Execute $nodeExe -Argument ('"' + (Join-Path $manager 'windows-backup.mjs') + '"') -WorkingDirectory $deployRoot
Register-ScheduledTask -TaskName 'Cozy Game Backup' -Action $backupAction -Trigger (New-ScheduledTaskTrigger -Daily -At '03:00') -Settings $taskSettings -Principal $principal | Out-Null
Write-Output 'Installed production startup at sign-in and database backup daily at 03:00 while signed in.'
