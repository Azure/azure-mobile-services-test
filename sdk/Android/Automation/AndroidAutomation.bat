@echo off

rem initialize variables from jenkins job
set runId=%1
set daylightClientId=%2
set daylightClientSecret=%3
set dayLightUrl=%4
set mobileAppUrl=%5
set mobileAppKey=%6
set googleUserId=%7
set googleWebAppClientId=%8
set runTimeVersion=%9
FOR /L %%G IN (1,1,9) DO shift
set dayLightProject=%1

echo:
echo ===============================================
echo === Input command line parameters:
echo ===    runId:           		"%runId%"
echo ===    daylightClientId:		"%daylightClientId%"
echo ===    daylightClientSecret:	"%daylightClientSecret%"
echo ===    dayLightUrl:    		"%dayLightUrl%"
echo ===    mobileAppUrl:    		"%mobileAppUrl%"
echo ===    mobileAppKey:    		"%mobileAppKey%"
echo ===    googleUserId:    		"%googleUserId%"
echo ===    googleWebAppClientId:	"%googleWebAppClientId%"
echo ===    runTimeVersion:  		"%runTimeVersion%"
echo ===    dayLightProject: 		"%dayLightProject%"
echo ===============================================
echo:

IF %dayLightProject% EQU "" (
  echo Insufficient arguments supplied.
  exit /b 1
  goto :eof
)

rem @echo on

set setUpPath=%cd%\..\
echo setUpPath: %setUpPath%

set getLibsScript=%setUpPath%ZumoE2ETestApp\libs\getLibs.ps1
echo getLibsScript: %getLibsScript%

set outputApk=%setUpPath%ZumoE2ETestApp\build\outputs\apk\ZumoE2ETestApp-debug.apk
echo outputApk: %outputApk%

echo JAVA_HOME - I: %JAVA_HOME%
echo ANDROID_HOME - I: %ANDROID_HOME%

rem verify env variables
if "%JAVA_HOME%" == "" (
    set JAVA_HOME=C:\Progra~1\Java\jdk1.8.0_20
)

if "%ANDROID_HOME%" == "" (
    set ANDROID_HOME=C:\Users\zumolab\AppData\Local\Android\android-sdk
)

set ANDROID_TOOLS=%ANDROID_HOME%\tools
set ANDROID_PTOOLS=%ANDROID_HOME%\platform-tools

echo JAVA_HOME: %JAVA_HOME%
echo ANDROID_HOME: %ANDROID_HOME%
echo ANDROID_TOOLS: %ANDROID_TOOLS%
echo ANDROID_PTOOLS: %ANDROID_PTOOLS%

set AppPackageName=com.microsoft.windowsazure.mobileservices.zumoe2etestapp
set CompletionFileName=/sdcard/done_android_e2e.txt

rem Download required libs
powershell -File %getLibsScript%
if %ERRORLEVEL% NEQ 0 (
	echo Error building the Project
	GOTO ERROR_HANDLER
)

rem Build Appx package
echo Clean Build
ECHO %setUpPath%gradlew.bat clean -p %setUpPath%
call %setUpPath%gradlew.bat clean -p %setUpPath%
if %ERRORLEVEL% NEQ 0 (
   echo Error cleaning the Project
   GOTO ERROR_HANDLER
)

echo Building the Android APK...
ECHO %setUpPath%gradlew.bat assembledebug -p %setUpPath%
call %setUpPath%gradlew.bat assembledebug -p %setUpPath%

if %ERRORLEVEL% NEQ 0 (
  echo Error building the Project
  GOTO ERROR_HANDLER
)

echo Build complete

echo Getting device state...
FOR /f "delims=" %%i in ('%ANDROID_PTOOLS%\adb -d get-state') DO SET emuState=%%i
IF "%emuState%" EQU "device" (
  echo Android device detected, looks good.
) ELSE (
  echo Android device not found or in a bad state.
  GOTO ERROR_HANDLER
)

echo Deploying app to device....
%ANDROID_PTOOLS%\adb -d install -r %outputApk%
if %ERRORLEVEL% NEQ 0 (
  GOTO ERROR_HANDLER
)

%ANDROID_PTOOLS%\adb -d shell rm %CompletionFileName%

echo Deployment complete. Launching app...
%ANDROID_PTOOLS%\adb -d shell am start ^
  -e "pref_run_unattended"				"true" ^
  -e "pref_mobile_service_url"			"%mobileAppUrl%" ^
  -e "pref_mobile_service_key"			"%mobileAppKey%" ^
  -e "pref_google_userid"				"%googleUserId%" ^
  -e "pref_google_webapp_clientid"		"%googleWebAppClientId%" ^
  -e "pref_master_run_id"				"%runId%" ^
  -e "pref_runtime_version"				"%runTimeVersion%" ^
  -e "pref_daylight_client_id"			"%daylightClientId%" ^
  -e "pref_daylight_client_secret"		"%daylightClientSecret%" ^
  -e "pref_daylight_url"				"%dayLightUrl%" ^
  -e "pref_daylight_project"			"%dayLightProject%" ^
  %AppPackageName%/.MainActivity
if %ERRORLEVEL% NEQ 0 (
  GOTO ERROR_HANDLER
)
echo Launched

SET counter=0
SET pollInterval=1
SET returnCode=0

echo Waiting for tests to complete...
timeout /t %pollInterval%
:WaitForTests_loop1
  REM Timeout after 20 minutes
  IF %counter% LEQ 1200 (
    GOTO :WaitForTests_poll
  ) ELSE (
    GOTO :WaitForTests_timeout
  )
  :WaitForTests_poll
    SET /A "counter+=pollInterval"
    %ANDROID_PTOOLS%\adb -d shell cat %CompletionFileName% | find "Completed successfully."
    IF %ERRORLEVEL% NEQ 0 (
      echo App is still running ^(%counter% seconds^)...
      timeout /t %pollInterval%
      GOTO :WaitForTests_loop1
    ) ELSE (
      echo Tests completed
      GOTO :WaitForTests_done
    )
  :WaitForTests_timeout
  REM Time-out, let's kill the app and return failure
  SET returnCode=1
  echo Timeout expired.
:WaitForTests_done
  echo Killing the app...
  %ANDROID_PTOOLS%\adb shell am force-stop %AppPackageName%
  IF %ERRORLEVEL% EQU 0 (
    echo App killed successfully
  ) ELSE (
    echo App could not be killed
  )

echo Done

exit /b %returnCode%
goto :eof

rem error handler in case any of the above execution method fails
:ERROR_HANDLER
echo Error Occured
exit /b 1
