$ports = @(4040, 4400, 4500, 8080, 9099, 9150)

$connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $ports -contains $_.LocalPort }

if (-not $connections) {
  Write-Output "No emulator listeners found."
  exit 0
}

$targetPids = $connections |
  Select-Object -ExpandProperty OwningProcess -Unique

$stopped = @()

foreach ($procId in $targetPids) {
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue
  if (-not $processInfo) {
    continue
  }

  $commandLine = $processInfo.CommandLine
  $isFirebaseEmulator =
    $commandLine -match 'firebase(\.cmd|\.js)?\s+emulators:start' -or
    $commandLine -match 'cloud-firestore-emulator'

  if (-not $isFirebaseEmulator) {
    continue
  }

  Stop-Process -Id $procId -Force
  $stopped += [PSCustomObject]@{
    ProcessId = $procId
    Name = $processInfo.Name
    CommandLine = $commandLine
  }
}

if (-not $stopped) {
  Write-Output "No Firebase emulator processes matched the expected command lines."
  exit 0
}

$stopped | Format-Table -AutoSize
