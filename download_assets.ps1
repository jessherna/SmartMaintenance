# Create assets directory if it doesn't exist
$assetsDir = "frontend\assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force
}

# Download icon.png
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/expo/expo/master/templates/expo-template-blank/assets/icon.png" -OutFile "$assetsDir\icon.png"

# Download splash.png
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/expo/expo/master/templates/expo-template-blank/assets/splash.png" -OutFile "$assetsDir\splash.png"

# Download adaptive-icon.png
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/expo/expo/master/templates/expo-template-blank/assets/adaptive-icon.png" -OutFile "$assetsDir\adaptive-icon.png"

# Download favicon.png
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/expo/expo/master/templates/expo-template-blank/assets/favicon.png" -OutFile "$assetsDir\favicon.png"

Write-Host "All asset files have been downloaded successfully!"
