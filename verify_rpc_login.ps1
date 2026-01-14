# This script is for local testing only
# Keys should be loaded from environment variables or inserted manually during debug sessions
$Url = "YOUR_SUPABASE_URL"
$AnonKey = "YOUR_ANON_KEY"

$Body = @{
    p_email    = "Driver@gmail.com"
    p_password = "password"
} | ConvertTo-Json

# ... Rest of script logic remains logic only ...
Write-Host "Please insert keys manually to run test."
