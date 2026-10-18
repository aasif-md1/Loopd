$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut("d:\Loopd\Loopd Music.lnk")
$s.TargetPath = "d:\Loopd\release-windows\win-unpacked\Loopd.exe"
$s.WorkingDirectory = "d:\Loopd\release-windows\win-unpacked"
$s.IconLocation = "d:\Loopd\assets\images\loopd-icon.ico"
$s.Description = "Loopd Music Desktop App"
$s.Save()
Write-Host "Shortcut created successfully!"
