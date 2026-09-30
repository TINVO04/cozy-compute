param([string]$RunnerDir = 'D:/CozyGameRunner')
$ErrorActionPreference = 'Stop'
$runnerRoot = (Resolve-Path -LiteralPath $RunnerDir).Path
$account = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
if (Get-ScheduledTask -TaskName 'Cozy Game GitHub Runner' -ErrorAction SilentlyContinue) {
    throw 'Runner task already exists. Review it before changing it.'
}
$action = New-ScheduledTaskAction -Execute (Join-Path $runnerRoot 'bin/Runner.Listener.exe') -Argument 'run' -WorkingDirectory $runnerRoot
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $account -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'Cozy Game GitHub Runner' -Action $action -Trigger (New-ScheduledTaskTrigger -AtLogOn -User $account) -Settings $settings -Principal $principal | Out-Null
Start-ScheduledTask -TaskName 'Cozy Game GitHub Runner'
Write-Output 'GitHub runner started, with automatic startup at sign-in.'
