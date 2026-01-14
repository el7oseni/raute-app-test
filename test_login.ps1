# Test Login API directly
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcWNvdnhrcXZpdWZhZ2d1dnVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjUxOTE3NSwiZXhwIjoyMDgyMDk1MTc1fQ.Cp0mwWnUqVS07l9IEZKjvGwXDkdCjnUErQcCovRoCXc"
    "Content-Type" = "application/json"
}

$body = @{
    email = "loloz@gmail.com"
    password = "12345678"
} | ConvertTo-Json

Write-Host "Testing login for loloz@gmail.com..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Method Post -Uri "https://ysqcovxkqviufagguvue.supabase.co/auth/v1/token?grant_type=password" -Headers $headers -Body $body
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host "Status Code:" $_.Exception.Response.StatusCode.Value__
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "Error Details:" -ForegroundColor Red
    Write-Host $errorBody
}
