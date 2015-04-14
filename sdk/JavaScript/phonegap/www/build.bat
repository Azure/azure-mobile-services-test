REM Phonegap E2E Test Build Script
REM Installs the required plugins and builds the platforms supported when
REM using OSX.

REM clean up previous builds

call rmdir /s /q ../platforms
call rmdir /s /q ../plugins

REM copy the js files from TestFramework over to TestFramework

call rmdir /s /q TestFramework
call robocopy /MIR ../../TestFramework TestFramework

call cordova plugin add com.microsoft.azure-mobile-services
REM phonegap local plugin add https://github.com/azure/azure-mobile-services-cordova.git

REM Plugins required for push notifications
call  cordova plugin add org.apache.cordova.device
call  cordova plugin add https://github.com/phonegap-build/PushPlugin.git

REM For debugging
call cordova plugin add org.apache.cordova.console

REM Now build supported platforms on OSX
REM call cordova platform add android
REM call cordova build android

REM call cordova platform add wp8
REM call cordova build wp8

call cordova platform add windows
call cordova build windows
