@echo off
echo ====================================
echo  Face Recognition Models Downloader
echo ====================================
echo.

echo Creating models directory...
if not exist "models" mkdir models

echo.
echo Downloading SCRFD-2.5G Face Detection Model...
echo URL: https://huggingface.co/public-data/insightface/resolve/main/models/scrfd_2.5g_bnkps.onnx
echo.

curl -L -o "models/scrfd_2.5g_bnkps.onnx" "https://huggingface.co/public-data/insightface/resolve/main/models/scrfd_2.5g_bnkps.onnx"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to download SCRFD model
    echo Please download manually from: https://github.com/deepinsight/insightface/releases
    pause
    exit /b 1
)

echo  SCRFD model downloaded successfully

echo.
echo Downloading ArcFace R50 Face Recognition Model...
echo URL: https://huggingface.co/public-data/insightface/resolve/main/models/arcface_r50_v1.onnx
echo.

curl -L -o "models/arcface_r50_v1.onnx" "https://huggingface.co/public-data/insightface/resolve/main/models/arcface_r50_v1.onnx"

if %ERRORLEVEL% NEQ 0 (
    echo  Failed to download ArcFace model
    echo Please download manually from: https://github.com/deepinsight/insightface/releases
    pause
    exit /b 1
)

echo  ArcFace model downloaded successfully

echo.
echo ====================================
echo   All models downloaded successfully!
echo ====================================
echo.
echo Models saved to:
echo - models/scrfd_2.5g_bnkps.onnx (Face Detection)
echo - models/arcface_r50_v1.onnx (Face Recognition)
echo.
echo You can now start the Face Recognition system:
echo npm run dev:full
echo.
pause
