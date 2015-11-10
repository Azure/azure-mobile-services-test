#!/bin/bash -x

# Make sure we are executing in this script's directory
cd "$( cd "$( dirname "$0" )" && pwd )"
rm -R Results
mkdir Results

DIR="$( pwd )"

if [ $# -lt 6 ]
then
  #           $0 $1                  $2                  $3         $4                        $5           $6             $7 (optional)
  echo Usage: $0 \<Application URL\> \<Application Key\> \<device\> \<zumotestuser password\> \<Blob URL\> \<Blob Token\> \<iOSsdkZip\>
  echo Where
  echo   \<Application URL\> is the URL of the Mobile Service
  echo   \<Application key\> is the app key for that service
  echo   \<device\> is one of the following:
  echo       - iPad2Sim             - iPadSimAir          - iPadSimAir2
  echo       - iPadSimPro           - iPadSimRetina       - iPhoneSim4s
  echo       - iPhoneSim5           - iPhoneSim5s         - iPhoneSim6
  echo       - iPhoneSim6Plus       - iPhoneSim6s         - iPhoneSim6sWatch
  echo       - iPhone6sPlus         - iPhone6sPlusWatch
  echo   \<loginPassword\> - the password to use for log in operations \(for zumotestuser account\)
  echo   \<iOSsdkZip\> is the zip file location of the framework to test against \(optional\)
  exit 1
fi

echo "$3"
export DEVICE_ARG=
export APP_NAME=
export DEVICE_CMD_ARG=$3

echo Device: $DEVICE_CMD_ARG

# Build current app to test with
pushd ZumoE2ETestApp

if [ $7 ]
then
  # Copy specified framework
  cp -f $7 sdk.zip
else
  # Copy in current version of the framework
  curl --location --output sdk.zip --silent http://aka.ms/gc6fex
fi

unzip -o sdk.zip

xcodebuild -sdk iphonesimulator9.1 || exit 1

popd

if [ "$DEVICE_CMD_ARG" == "iPad2Sim" ]; then
  echo Using iPad 2 Simulator
  export DEVICE_ARG=iPad\ 2\ \(9.1\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$DEVICE_CMD_ARG" == "iPadSimAir" ]; then
  echo Using iPad Air Simulator
  export DEVICE_ARG=iPad\ Air\ \(9.1\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$DEVICE_CMD_ARG" == "iPadSimAir2" ]; then
  echo Using iPad Air 2 Simulator
  export DEVICE_ARG=iPad\ Air\ 2\ \(9.1\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$DEVICE_CMD_ARG" == "iPadSimPro" ]; then
  echo Using iPad Pro Simulator
  export DEVICE_ARG=iPad\ Pro\ \(9.1\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$DEVICE_CMD_ARG" == "iPadSimRetina" ]; then
  echo Using iPad Retina Simulator
  export DEVICE_ARG=iPad\ Retina\ \(9.1\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$DEVICE_CMD_ARG" == "iPhoneSim4s" ]; then
  echo Using iPhone 4s Simulator
  export DEVICE_ARG=iPhone\ 4s\ \(9.1\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$DEVICE_CMD_ARG" == "iPhoneSim5" ]; then
  echo Using iPhone 5 Simulator
  export DEVICE_ARG=iPhone\ 5\ \(9.1\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$DEVICE_CMD_ARG" == "iPhoneSim5s" ]; then
  echo Using iPhone 5s Simulator
  export DEVICE_ARG=iPhone\ 5s\ \(9.1\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$DEVICE_CMD_ARG" == "iPhoneSim6" ]; then
  echo Using iPhone 6 Simulator
  export DEVICE_ARG=iPhone\ 6\ \(9.1\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$DEVICE_CMD_ARG" == "iPhoneSim6Plus" ]; then
  echo Using iPhone 6 Plus Simulator
  export DEVICE_ARG=iPhone\ 6\ Plus\ \(9.1\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$DEVICE_CMD_ARG" == "iPhoneSim6s" ]; then
  echo Using iPhone 6s Simulator
  export DEVICE_ARG=iPhone\ 6s\ \(9.1\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$DEVICE_CMD_ARG" == "iPhoneSim6sWatch" ]; then
  echo Using iPhone 6s Simulator + Apple Watch
  export DEVICE_ARG=iPhone\ 6s\ \(9.1\)\ +\ Apple\ Watch\ -\ 38mm\ \(2.0\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$DEVICE_CMD_ARG" == "iPhoneSim6sPlus" ]; then
  echo Using iPhone 6s Plus Simulator
  export DEVICE_ARG=iPhone\ 6s\ \(9.1\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$DEVICE_CMD_ARG" == "iPhoneSim6sPlusWatch" ]; then
  echo Using iPhone 6s Plus Simulator + Apple Watch
  export DEVICE_ARG=iPhone\ 6s\ Plus\ \(9.1\)\ +\ Apple\ Watch\ -\ 42mm\ \(2.0\)
  APP_NAME=$DIR/ZumoE2ETestApp/build/Release-iphonesimulator/ZumoE2ETestApp.app
fi

if [ "$APP_NAME" == "" ]
then
  echo Unsupported device: "$3"
  exit 1
fi

echo DEVICE_ARG: $DEVICE_ARG
echo APP_NAME: $APP_NAME
EscapedToken=${6//&/\\&}

sed -e "s|--APPLICATION_URL--|$1|g" ZumoAutomationTemplate.js > ZumoAutomationWithData.js
sed -e "s|--APPLICATION_KEY--|$2|g" -i "" ZumoAutomationWithData.js
sed -e "s|--BLOB_URL--|$5|g" -i "" ZumoAutomationWithData.js
sed -e "s|--BLOB_TOKEN--|$EscapedToken|g" -i "" ZumoAutomationWithData.js
sed -e "s|--AUTH_PASSWORD--|$4|g" -i "" ZumoAutomationWithData.js

echo Replaced data on template - now running instruments
echo Args: DEVICE_ARG = $DEVICE_ARG
echo APP_NAME = $APP_NAME

export INSTRUMENT_TEMPLATE=/Applications/Xcode.app/Contents/Applications/Instruments.app/Contents/PlugIns/AutomationInstrument.xrplugin/Contents/Resources/Automation.tracetemplate

echo Running instruments...
instruments -w "$DEVICE_ARG" -t "$INSTRUMENT_TEMPLATE" "$APP_NAME" -e UIASCRIPT "ZumoAutomationWithData.js" -e UIARESULTSPATH "Results" || exit 1

exit 0
