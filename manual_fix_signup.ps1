# Test Manager Signup RPC manually
# Usage: .\manual_fix_signup.ps1

$Url = "YOUR_SUPABASE_URL"
$Key = "YOUR_SERVICE_ROLE_KEY" # Use Service Role Key to simulate backend trust

# User details to fix (Replace with your broken user)
$Email = "hey1@gmail.com"
$Password = "password" # Only needed if we were doing auth, here RPC just needs it as arg
$CompanyName = "My Manual Company"
$FullName = "Manual Fix User"

$Body = @{
    user_email    = $Email
    company_name  = $CompanyName
    full_name     = $FullName
    user_password = $Password
} | ConvertTo-Json

$Headers = @{
    "apikey"        = $Key
    "Authorization" = "Bearer $Key"
    "Content-Type"  = "application/json"
}

try {
    Write-Host "Calling complete_manager_signup RPC..."
    $Response = Invoke-RestMethod -Uri "$Url/rest/v1/rpc/complete_manager_signup" -Method Post -Headers $Headers -Body $Body -ErrorAction Stop
    Write-Host "✅ Success! Response:"
    Write-Host ($Response | ConvertTo-Json -Depth 5)
}
catch {
    Write-Host "❌ Error Calling RPC:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $Stream = $_.Exception.Response.GetResponseStream()
        $Reader = New-Object System.IO.StreamReader($Stream)
        $ErrorBody = $Reader.ReadToEnd()
        Write-Host "Server Response: $ErrorBody" -ForegroundColor Yellow
    }
}
