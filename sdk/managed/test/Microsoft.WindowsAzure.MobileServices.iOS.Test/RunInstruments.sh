#!/bin/bash

git clean -xdfq

# Make sure we are executing in this script's directory
cd "$( cd "$( dirname "$0" )" && pwd )"
rm -R Results
mkdir Results

DIR="$( pwd )"

if [ $# -lt 9 ]
then
  echo 'Usage:' $0 '<Application URL> <Application key> <Daylight URL> <Daylight Project> <clientId> <clientSecret> <runId> <Tag expression> <Runtime version> <nugetSourceOverride>'
  echo 'Where'
  echo '  <Application URL> is the URL of the Mobile Service'
  echo '  <Application key> is the app key for that service'
  echo '  <Tag expression> example: !NodeRuntimeOnly*!DotNetRuntimeBug'
  echo '  <Runtime version> is reported to daylight'
  echo '  <nugetSourceOverride> will perform a nuget update from the specified location'
  exit 1
fi

SLN_FILE=$DIR/../../Microsoft.WindowsAzure.Mobile.Managed_IncludeXamarin.sln

mobileAppUrl=$1
mobileAppKey=$2
dayLightUrl=$3
dayLightProject=$4
clientId=$5
clientSecret=$6
runId=$7
tags=$8
runTimeVersion=$9
shift
nugetSourceOverride=$9

echo
echo "==============================================="
echo "=== Input command line parameters:"
echo "===    mobileAppUrl:    $mobileAppUrl"
echo "===    mobileAppKey:    $mobileAppKey"
echo "===    dayLightUrl:     $dayLightUrl"
echo "===    dayLightProject: $dayLightProject"
echo "===    clientId:        $clientId"
echo "===    clientSecret:    $clientSecret"
echo "===    runId:           $runId"
echo "===    tags:            $tags"
echo "===    runTimeVersion:  $runTimeVersion"
echo "===    nugetSourceOverride: $nugetSourceOverride"
echo "==============================================="
echo

echo
echo Restoring Nuget packages...
nuget restore $SLN_FILE

if [[ $nugetSourceOverride ]]
then
  echo Updating Nuget from $nugetSourceOverride
  nuget update $SLN_FILE -Source $nugetSourceOverride -Verbose -Prerelease
else
  echo Not updating Nugets
fi

echo
echo Building...
/Applications/Xamarin\ Studio.app/Contents/MacOS/mdtool build -t:Build -c:"Debug|iPhoneSimulator" $SLN_FILE || exit 1


DEVICE_ARG=iPhone\ 6\ \(8.1\ Simulator\)
APP_NAME=$DIR/bin/iPhoneSimulator/Debug/MicrosoftWindowsAzureMobileiOSTest.app

echo APP_NAME: $APP_NAME

echo
echo Skipping test CustomAPI_JToken_SupportsAnyFormat...
tags="$tags -CustomAPI_JToken_SupportsAnyFormat"
echo "   Adjusted tags to '$tags'"

cp ZumoAutomationTemplate.js ZumoAutomationWithData.js
sed -e "s|--APPLICATION_URL--|$mobileAppUrl|g"     ZumoAutomationWithData.js > tmp.js && mv tmp.js ZumoAutomationWithData.js || exit 1
sed -e "s|--APPLICATION_KEY--|$mobileAppKey|g"     ZumoAutomationWithData.js > tmp.js && mv tmp.js ZumoAutomationWithData.js || exit 1
sed -e "s|--DAYLIGHT_URL--|$dayLightUrl|g"         ZumoAutomationWithData.js > tmp.js && mv tmp.js ZumoAutomationWithData.js || exit 1
sed -e "s|--DAYLIGHT_PROJECT--|$dayLightProject|g" ZumoAutomationWithData.js > tmp.js && mv tmp.js ZumoAutomationWithData.js || exit 1
sed -e "s|--CLIENT_ID--|$clientId|g"               ZumoAutomationWithData.js > tmp.js && mv tmp.js ZumoAutomationWithData.js || exit 1
sed -e "s|--CLIENT_SECRET--|$clientSecret|g"       ZumoAutomationWithData.js > tmp.js && mv tmp.js ZumoAutomationWithData.js || exit 1
sed -e "s|--RUN_ID--|$runId|g"                     ZumoAutomationWithData.js > tmp.js && mv tmp.js ZumoAutomationWithData.js || exit 1
sed -e "s|--TAG_EXPRESSION--|$tags|g"              ZumoAutomationWithData.js > tmp.js && mv tmp.js ZumoAutomationWithData.js || exit 1
sed -e "s|--RUNTIME_VERSION--|$runTimeVersion|g"   ZumoAutomationWithData.js > tmp.js && mv tmp.js ZumoAutomationWithData.js || exit 1

INSTRUMENT_TEMPLATE=/Applications/Xcode.app/Contents/Applications/Instruments.app/Contents/PlugIns/AutomationInstrument.xrplugin/Contents/Resources/Automation.tracetemplate

echo
echo Running instruments...
instruments -w "$DEVICE_ARG" -t "$INSTRUMENT_TEMPLATE" "$APP_NAME" -e UIASCRIPT "ZumoAutomationWithData.js" -e UIARESULTSPATH "Results" || exit 1

exit 0
