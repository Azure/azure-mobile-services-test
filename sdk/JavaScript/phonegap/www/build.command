# Phonegap E2E Test Build Script
# Installs the required plugins and builds the platforms supported when
# using OSX.

# clean up previous builds

#rm -rf ../platforms
#rm -rf ../plugins

# copy the js files from TestFramework over to TestFramework

rm -rf TestFramework 
rsync -rlK ../../TestFramework .

# Plugins required for authentication
phonegap local plugin add org.apache.cordova.inappbrowser

# Plugins required for push notifications
phonegap local plugin add org.apache.cordova.device
phonegap local plugin add https://github.com/phonegap-build/PushPlugin.git

# For debugging
phonegap local plugin add org.apache.cordova.console

# Now build supported platforms on OSX
phonegap local build android
phonegap local build ios
