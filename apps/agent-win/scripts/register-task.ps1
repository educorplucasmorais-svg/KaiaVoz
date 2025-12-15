$taskName = "CaiaAgentWin"
$node = (Get-Command node).Source
$script = Join-Path $PSScriptRoot "..\src\index.js" | Resolve-Path
$workDir = (Resolve-Path (Join-Path $PSScriptRoot "..\")).Path

$action = New-ScheduledTaskAction -Execute $node -Argument "`"$script`"" -WorkingDirectory $workDir
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Description "Inicia o Caia Agent no logon" -Force
Write-Host "Tarefa agendada '$taskName' registrada."
