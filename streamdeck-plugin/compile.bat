@echo off
if not exist Release\ mkdir Release
del Release\com.zoton2.example.streamDeckPlugin >nul 2>&1
DistributionTool.exe -b -i com.zoton2.example.sdPlugin -o Release
pause