$taskName = "CaiaAgentWin"
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Tarefa agendada '$taskName' removida."
} else {
  Write-Host "Tarefa '$taskName' não encontrada."
}
