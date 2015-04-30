// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

function createPlatformSpecificFunctions() {

    var alertFunction;
    if (typeof alert === 'undefined') {
        alertFunction = function (text, done) {
            var dialog = new Windows.UI.Popups.MessageDialog(text);
            dialog.showAsync().done(function () {
                if (typeof done === 'function') {
                    done();
                }
            });
        }
    }

    var saveAppInfo = function (lastAppUrl, lastGatewayUrl, lastAppKey) {
        /// <param name="lastAppUrl" type="String">The last value used in the application URL text box</param>
        /// <param name="lastGatewayUrl" type="String">The last value used in the gateway URL text box</param>
        /// <param name="lastAppKey" type="String">The last value used in the application key text box</param>
        var state = {
            lastAppUrl: lastAppUrl,
            lastGatewayUrl: lastGatewayUrl,
            lastAppKey: lastAppKey,            
        };

        WinJS.Application.local.writeText('savedAppInfo.txt', JSON.stringify(state));
    }

    function getPushChannel() {
        return Windows.Networking.PushNotifications.PushNotificationChannelManager.createPushNotificationChannelForApplicationAsync();
    }

    return {
        alert: alertFunction,
        saveAppInfo: saveAppInfo,
        IsHTMLApplication: false,
        getPushChannel: getPushChannel
    };
}

var testPlatform = createPlatformSpecificFunctions();
