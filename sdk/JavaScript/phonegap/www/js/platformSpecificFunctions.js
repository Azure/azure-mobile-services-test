// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

function createPlatformSpecificFunctions() {

    var alertFunction;

    alertFunction = function (text, done) {
        window.alert(text);
        if (done) {
            done();
        }
    };

    var saveAppInfo = function (lastAppUrl, lastAppKey) {
        /// <param name="lastAppUrl" type="String">The last value used in the application URL text box</param>
        /// <param name="lastAppKey" type="String">The last value used in the application key text box</param>        
        var state = {
            lastAppUrl: lastAppUrl,
            lastAppKey: lastAppKey,            
        };
    };

    return {
        alert: alertFunction,
        saveAppInfo: saveAppInfo,
        IsHTMLApplication: true,
    };
}

var testPlatform = createPlatformSpecificFunctions();
