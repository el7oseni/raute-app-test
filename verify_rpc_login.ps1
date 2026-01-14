$Url = "https://pdeqjsyucaaxulgeaqol.supabase.co/rest/v1/rpc/login_driver"
$AnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZXFqc3l1Y2FheHVsZ2VhcW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjc4NTAsImV4cCI6MjA4MzkwMzg1MH0.LtOwwt_Z4ECq-bae6Son34E4qefjhjQwkgLLzDjM7Zk"

$Body = @{
    p_email    = "Driver@gmail.com"
    p_password = "12345678"  # Using 'password' as per our hard reset, or change to 12345678 if needed
} | ConvertTo-Json

$Headers = @{
    "apikey"       = $AnonKey
    "Content-Type" = "application/json"
}

Write-Host "Testing Custom Login RPC..."
try {
    $Response = Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers -Body $Body -ErrorAction Stop
    
    if ($Response.success -eq $true) {
        Write-Host "✅ LOGIN SUCCESS!" -ForegroundColor Green
        Write-Host "User ID: $($Response.user_id)"
    }
    else {
        Write-Host "❌ LOGIN REFUSED (Logic Error)" -ForegroundColor Yellow
        Write-Host "Error: $($Response.error)"
    }
}
catch {
    Write-Host "❌ RPC CALL FAILED (Server Error)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    
    $Stream = $_.Exception.Response.GetResponseStream()
    if ($Stream) {
        $Reader = New-Object System.IO.StreamReader($Stream)
        $ErrorBody = $Reader.ReadToEnd()
        Write-Host "Error Details: $ErrorBody"
    }
}
