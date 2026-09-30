$ErrorActionPreference = 'Stop'
for ($cozyAttempt = 0; $cozyAttempt -lt 90; $cozyAttempt++) {
    try {
        $cozyResponse = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5173' -TimeoutSec 2
        if ($cozyResponse.StatusCode -eq 200) {
            Start-Process 'http://localhost:5173'
            exit 0
        }
    } catch {
        # Vite may still be compiling. Never open an unavailable page.
    }
    Start-Sleep -Seconds 1
}
exit 1
