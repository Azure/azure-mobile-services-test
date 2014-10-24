﻿// ----------------------------------------------------------------------------
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

    var saveAppInfo = function (lastAppUrl, lastAppKey) {
        /// <param name="lastAppUrl" type="String">The last value used in the application URL text box</param>
        /// <param name="lastAppKey" type="String">The last value used in the application key text box</param>
        /// <param name="lastUploadLogUrl" type="String">The last value used in the upload logs URL text box</param>
        var state = {
            lastAppUrl: lastAppUrl,
            lastAppKey: lastAppKey,            
        };

        WinJS.Application.local.writeText('savedAppInfo.txt', JSON.stringify(state));
    }

    return {
        alert: alertFunction,
        saveAppInfo: saveAppInfo,
        IsHTMLApplication: false,
    };
}

var testPlatform = createPlatformSpecificFunctions();
