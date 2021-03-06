﻿// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    app.onactivated = function (args) {
        if (args.detail.arguments != "") {
            storage.setConfig(args.detail.arguments);
        }

        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }

            if (storage.config == undefined) {
                args.setPromise(WinJS.UI.processAll().then(function () {
                    return app.local.exists('savedAppInfo.txt').then(function (exists) {
                        if (exists) {
                            return app.local.readText('savedAppInfo.txt').then(function (data) {
                                var state = JSON.parse(data);
                                var lastAppUrl = state.lastAppUrl;
                                var lastAppKey = state.lastAppKey;
                                if (lastAppUrl) {
                                    document.getElementById('txtAppUrl').value = lastAppUrl;
                                }
                                if (lastAppKey) {
                                    document.getElementById('txtAppKey').value = lastAppKey;
                                }
                            });
                        } else {
                            return null;
                        }
                    });
                }));
            } else {
                document.getElementById('txtAppUrl').value = storage.config.AppUrl;
                document.getElementById('txtAppKey').value = storage.config.AppKey;
                handlerForAllTestsButtons(true)(null);
            }
        }
    };

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().
    };

    app.start();
})();
