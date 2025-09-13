# Тест GET /api/tasks

# Авторизация
$loginBody = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginBody

Write-Host "Авторизация: $($loginResponse.message)"
Write-Host "Токен получен: $($loginResponse.token -ne $null)"

if ($loginResponse.token) {
    # Тест GET /api/tasks
    try {
        $tasksResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/tasks?project_id=2618ddd2-9d41-4041-94e8-93ed27c6ef85" -Method GET -Headers @{
            "Authorization" = "Bearer $($loginResponse.token)"
            "Content-Type" = "application/json"
        }
        
        Write-Host "GET /api/tasks успешно:"
        $tasksResponse | ConvertTo-Json -Depth 3
    }
    catch {
        Write-Host "Ошибка GET /api/tasks:"
        Write-Host "StatusCode: $($_.Exception.Response.StatusCode)"
        Write-Host "StatusDescription: $($_.Exception.Response.StatusDescription)"
        Write-Host "Error: $($_.Exception.Message)"
        
        # Попробуем получить тело ответа
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody"
        }
        catch {
            Write-Host "Не удалось прочитать тело ответа"
        }
    }
}
else {
    Write-Host "Не удалось получить токен авторизации"
}