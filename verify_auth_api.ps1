$Url = "https://pdeqjsyucaaxulgeaqol.supabase.co/auth/v1/token?grant_type=password"
$AnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZXFqc3l1Y2FheHVsZ2VhcW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjc4NTAsImV4cCI6MjA4MzkwMzg1MH0.LtOwwt_Z4ECq-bae6Son34E4qefjhjQwkgLLzDjM7Zk"

$Body = @{
    email    = "Driver@gmail.com"
    password = "12345678"  # Replace with the actual password if you know it, otherwise use a known user
} | ConvertTo-Json

$Headers = @{
    "apikey"       = $AnonKey
    "Content-Type" = "application/json"
}

Write-Host "Testing Login for Driver@gmail.com..."
try {
    $Response = Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers -Body $Body -ErrorAction Stop
    Write-Host "✅ LOGIN SUCCESS!" -ForegroundColor Green
    Write-Host "Token: $($Response.access_token.Substring(0, 20))..."
}
catch {
    Write-Host "❌ LOGIN FAILED" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    
    $Stream = $_.Exception.Response.GetResponseStream()
    $Reader = New-Object System.IO.StreamReader($Stream)
    $ErrorBody = $Reader.ReadToEnd()
    Write-Host "Error Details: $ErrorBody"
}
