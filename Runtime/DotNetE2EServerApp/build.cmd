@echo off

REM Use tilde to trim spaces and quotes from arguments
set customNugetSource=%~1
set defaultNugetSource=%~2

set msbuild=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\msbuild.exe
set slnFileName=ZumoE2EServerApp.sln

if "%defaultNugetSource%" EQU "" (
  set defaultNugetSource=https://www.nuget.org/api/v2/
)

REM Download Nuget
echo Downloading Nuget.exe...
call NuGet/download-nuget.cmd
if %ERRORLEVEL% NEQ 0 (
  echo Error downloading Nuget.exe
  goto ERROR_HANDLER
)
set nuget=NuGet\nuget.exe

REM Restore nuget packages
echo:
echo Restoring Nuget packages...
%nuget% restore -Source %defaultNugetSource% %slnFileName%
if %ERRORLEVEL% NEQ 0 (
  echo Error running nuget restore
  goto ERROR_HANDLER
)

REM Update Mobile Services packages to latest versions if a nuget source was specified
if "%customNugetSource%" NEQ "" (
  echo:
  echo Updating Nuget packages...
  REM TODO: Include *public* Nuget source below once the .NET ServerSDK nugets
  REM       specify dependencies with min & max versions
  %nuget% update -Source "%customNugetSource%" -Verbose %slnFileName%
  if %ERRORLEVEL% NEQ 0 (
    echo Error running nuget update
    goto ERROR_HANDLER
  )
)

echo:
echo Building...
REM build
%msbuild% %slnFileName% /p:Configuration=Release /t:clean,build /p:OutputPath=build_output\bin
if %ERRORLEVEL% NEQ 0 (
  echo MSBuild failed
  goto ERROR_HANDLER
)

exit /b 0
goto :eof

:ERROR_HANDLER
echo:
echo Build failed
exit /b 1
