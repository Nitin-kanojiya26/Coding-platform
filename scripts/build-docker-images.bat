@echo off
echo ==============================================
echo Building Build Mode Docker Images
echo ==============================================

echo [1/2] Building BM_APP_IMAGE: bm-node-express...
docker build -t bm-node-express ./docker/bm-node-express
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Failed to build bm-node-express. Ensure Docker Desktop is running.
  exit /b %ERRORLEVEL%
)

echo [2/2] Building BM_HARNESS_IMAGE: bm-harness...
docker build -t bm-harness ./docker/bm-harness
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Failed to build bm-harness.
  exit /b %ERRORLEVEL%
)

echo ==============================================
echo [SUCCESS] Both images built and ready!
echo ==============================================
