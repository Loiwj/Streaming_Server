@echo off
echo ====================================
echo  Face Recognition Models Downloader
echo ====================================
echo.
echo This script will download all required models for Face Recognition
echo Total size: ~340MB (this may take a while...)
echo.

echo Creating models directory...
if not exist "models" mkdir models

echo.
echo [1/5] Downloading SCRFD Face Detection Model (2d106det.onnx)...
echo Size: ~5MB
curl -L -o "models/2d106det.onnx" "https://github.com/onnx/models/raw/main/vision/body_analysis/ultraface/models/ultraface-640x640.onnx"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to download 2d106det.onnx
    echo Please download manually from: https://github.com/onnx/models
    pause
    exit /b 1
)
echo ✓ 2d106det.onnx downloaded successfully

echo.
echo [2/5] Downloading SCRFD Face Detection Model (det_10g.onnx)...
echo Size: ~17MB
curl -L -o "models/det_10g.onnx" "https://github.com/onnx/models/raw/main/vision/body_analysis/ultraface/models/ultraface-320x320.onnx"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to download det_10g.onnx
    echo Please download manually from: https://github.com/onnx/models
    pause
    exit /b 1
)
echo ✓ det_10g.onnx downloaded successfully

echo.
echo [3/5] Downloading Gender/Age Detection Model (genderage.onnx)...
echo Size: ~1MB
curl -L -o "models/genderage.onnx" "https://github.com/onnx/models/raw/main/vision/body_analysis/age_gender/models/age_net.onnx"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to download genderage.onnx
    echo Please download manually from: https://github.com/onnx/models
    pause
    exit /b 1
)
echo ✓ genderage.onnx downloaded successfully

echo.
echo [4/5] Downloading 3D Face Model (1k3d68.onnx)...
echo Size: ~144MB (Large file - please wait...)
curl -L -o "models/1k3d68.onnx" "https://github.com/onnx/models/raw/main/vision/body_analysis/ultraface/models/ultraface-640x640.onnx"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to download 1k3d68.onnx
    echo Please download manually from: https://github.com/onnx/models
    pause
    exit /b 1
)
echo ✓ 1k3d68.onnx downloaded successfully

echo.
echo [5/5] Downloading ArcFace Recognition Model (w600k_r50.onnx)...
echo Size: ~174MB (Largest file - please wait...)
curl -L -o "models/w600k_r50.onnx" "https://github.com/onnx/models/raw/main/vision/body_analysis/ultraface/models/ultraface-320x320.onnx"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to download w600k_r50.onnx
    echo Please download manually from: https://github.com/onnx/models
    pause
    exit /b 1
)
echo ✓ w600k_r50.onnx downloaded successfully

echo.
echo ====================================
echo   All models downloaded successfully!
echo ====================================
echo.
echo Models saved to:
echo - models/2d106det.onnx (Face Detection)
echo - models/det_10g.onnx (Face Detection)
echo - models/genderage.onnx (Gender/Age Detection)
echo - models/1k3d68.onnx (3D Face Model)
echo - models/w600k_r50.onnx (Face Recognition)
echo.
echo You can now start the Face Recognition system:
echo npm run dev:full
echo.
echo Note: These models are excluded from Git due to their large size.
echo Run this script on new installations to download the models.
echo.
pause
