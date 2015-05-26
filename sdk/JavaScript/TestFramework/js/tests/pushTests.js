// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/// <reference path="../testFramework.js" />

function definePushTestsNamespace() {
    var tests = [],
        channelUri,
        registrationWaitInterval = 10000;

    var testTemplate = {
            body: '<toast><visual><binding template="ToastText01"><text id="1">$(message)</text></binding></visual></toast>',
            name: 'templateForToastWinJS',
            headers: {
                'X-WNS-Type': 'wns/toast',
                'X-WNS-TTL': '1000'
            },
            lowerHeaders: {
                'x-wns-type': 'wns/toast',
                'x-wns-ttl': '1000'
            },
            tags: [ 'World' ]
    };

    var pushNotifications = Windows.Networking.PushNotifications;
    var pushNotificationQueue = [];

    var onPushNotificationReceived = function (e) {
        var notificationPayload;
        switch (e.notificationType) {
            case pushNotifications.PushNotificationType.toast:
                notificationPayload = e.toastNotification.content.getXml();
                break;

            case pushNotifications.PushNotificationType.tile:
                notificationPayload = e.tileNotification.content.getXml();
                break;

            case pushNotifications.PushNotificationType.badge:
                notificationPayload = e.badgeNotification.content.getXml();
                break;

            case pushNotifications.PushNotificationType.raw:
                notificationPayload = e.rawNotification.content;
                break;
        }
        pushNotificationQueue.push({ type: e.notificationType, content: notificationPayload });
    };

    function waitForNotification(timeout, timeAfterPush, continuation) {
        /// <param name="timeout" type="Number">Time to wait for push notification in milliseconds</param>
        /// <param name="timeAfterPush" type="Number">Time to sleep after a push is received. Used to prevent
        ///            blasting the push notification service.</param>
        /// <param name="continuation" type="function(Object)">Function called when the timeout expires.
        ///            If there was a push notification, it will be passed; otherwise null will be passed
        ///            to the function.</param>
        if (typeof timeAfterPush === 'function') {
            continuation = timeAfterPush;
            timeAfterPush = 3000; // default to 3 seconds
        }
        var start = Date.now();
        var waitForPush = function () {
            var now = Date.now();
            if (pushNotificationQueue.length) {
                var notification = pushNotificationQueue.pop();
                setTimeout(function () {
                    continuation(notification);
                }, timeAfterPush);
            } else {
                if ((now - start) > timeout) {
                    continuation(null); // Timed out
                } else {
                    setTimeout(waitForPush, 500); // try it again in 500ms
                }
            }
        }

        waitForPush();
    };

    tests.push(new zumo.Test('InitialDeleteRegistrations', function (test, done) {
        testPlatform.getPushChannel()
            .then(function (channel) {
                channelUri = channel.uri;
                return zumo.getClient().push.unregisterAll(channel.uri);
            })
            .then(getRegistrations(channelUri, 'wns'))
            .then(function (registrations) {
                zumo.assert.isTrue(Array.isArray(registrations));
                zumo.assert.areEqual(0, registrations.length);
                zumo.assert.areEqual('{}', JSON.stringify(zumo.getClient().push._registrationManager._storageManager._registrations));
                return true;
            })
            .done(done, fail(test, done));
    }));

    tests.push(new zumo.Test('RegisterNative', function (test, done) {
        testPlatform.getPushChannel()
            .then(function (channel) {
                channelUri = channel.uri;
                zumo.getClient().push.registerNative(channelUri, [ 'tag1' ]);
                channel.onpushnotificationreceived = onPushNotificationReceived;
            })
            .then(wait(registrationWaitInterval))
            .then(getRegistrations(channelUri, 'wns'))
            .then(function (registrations) {
                zumo.assert.isTrue(Array.isArray(registrations));
                zumo.assert.areEqual(1, registrations.length);
                zumo.assert.areEqual('{"$Default":"' + registrations[0].registrationId + '"}', JSON.stringify(zumo.getClient().push._registrationManager._storageManager._registrations));
                return true;
            })
            .done(done, fail(test, done));
    }));

    tests.push(createPushTest('wns',
        'toast',
        'tag1',
        '<?xml version="1.0"?><toast><visual><binding template="ToastText01"><text id="1">hello world</text></binding></visual></toast>'));

    tests.push(new zumo.Test('UnregisterNative', function (test, done) {
        testPlatform.getPushChannel()
            .then(function (channel) {
                channelUri = channel.uri;
                return zumo.getClient().push.unregisterNative();
            })
            .then(getRegistrations(channelUri, 'wns'))
            .then(function (registrations) {
                zumo.assert.isTrue(Array.isArray(registrations));
                zumo.assert.areEqual(0, registrations.length);
                zumo.assert.areEqual('{}', JSON.stringify(zumo.getClient().push._registrationManager._storageManager._registrations));
                return true;
            })
            .done(done, fail(test, done));
    }));

    tests.push(new zumo.Test('RegisterWithTemplate', function (test, done) {
        testPlatform.getPushChannel()
            .then(function (channel) {
                channelUri = channel.uri;
                zumo.getClient().push.registerTemplate(channelUri, testTemplate.body, testTemplate.name, testTemplate.headers, testTemplate.tags);
                channel.onpushnotificationreceived = onPushNotificationReceived;
            })
            .then(wait(registrationWaitInterval))
            .then(getRegistrations(channelUri, 'wns'))
            .then(function (registrations) {
                zumo.assert.isTrue(Array.isArray(registrations));
                zumo.assert.areEqual(1, registrations.length);
                zumo.assert.areEqual('{"templateForToastWinJS":"' + registrations[0].registrationId + '"}', JSON.stringify(zumo.getClient().push._registrationManager._storageManager._registrations));
                zumo.assert.areEqual(zumo.getClient().push._registrationManager._storageManager.pushHandle, registrations[0].deviceId, 'Local storage should have channelUri from returned registrations');
                zumo.assert.areEqual(registrations[0].deviceId, channelUri, 'Returned registrations should use channelUri sent from registered template');
                Object.getOwnPropertyNames(registrations[0].headers).forEach(function (header) {
                    zumo.assert.areEqual(registrations[0].headers[header], testTemplate.lowerHeaders[header.toLowerCase()], 'Each header returned by registration should match what was registered');
                });
                zumo.assert.areEqual(Object.getOwnPropertyNames(registrations[0].headers).length, Object.getOwnPropertyNames(testTemplate.headers).length, 'Returned registration should contain same number of headers sent from registered template');

                var features = zumo.util.globalTestParams[zumo.constants.RUNTIME_FEATURES_KEY];
                if (features === undefined) {
                    throw 'Runtime features undefined, run "tests setup" test group first';
                }
                else if (features[zumo.runtimeFeatureNames.DotNetRuntime_Only]) {
                    zumo.assert.areEqual(registrations[0].tags.length, testTemplate.tags.length, 'Returned registration should contain tags sent from registered template');
                } else {
                    zumo.assert.areEqual(registrations[0].tags.length, testTemplate.tags.length + 1, 'Returned registration should contain tags sent from registered template and 1 extra for installationId');
                    zumo.assert.isTrue(registrations[0].tags.indexOf(WindowsAzure.MobileServiceClient._applicationInstallationId) > -1, 'Expected the installationID in the tags');
                }
                zumo.assert.areEqual(registrations[0].templateName, testTemplate.name, 'Expected returned registration to use templateName it was fed');
                zumo.assert.areEqual(registrations[0].templateBody, testTemplate.body, 'Expected returned registration to use templateBody it was fed');
                zumo.assert.areEqual(zumo.getClient().push._registrationManager._storageManager.getRegistrationIdWithName(testTemplate.name), registrations[0].registrationId, 'Expected the stored registrationId to equal the one returned from service');
                return true;
            })
            .done(done, fail(test, done));
    }));

    tests.push(createPushTest('template',
        'toast',
        'World',
        '{ message: "hello world template" }',
        '<toast><visual><binding template="ToastText01"><text id="1">hello world template</text></binding></visual></toast>'));

    tests.push(new zumo.Test('UnregisterTemplate', function (test, done) {
        testPlatform.getPushChannel()
            .then(function (channel) {
                channelUri = channel.uri;
                return zumo.getClient().push.unregisterTemplate(testTemplate.name);
            })
            .then(getRegistrations(channelUri, 'wns'))
            .then(function (registrations) {
                zumo.assert.isTrue(Array.isArray(registrations));
                zumo.assert.areEqual(0, registrations.length);
                zumo.assert.areEqual('{}', JSON.stringify(zumo.getClient().push._registrationManager._storageManager._registrations));
                return true;
            })
            .done(done, fail(test, done));
    }));
    
    tests.push(new zumo.Test('RegisterMultiple', function (test, done) {
        testPlatform.getPushChannel()
            .then(function (channel) {
                channelUri = channel.uri;
                return zumo.getClient().push.registerNative(channelUri);
            })
            .then(function () {
                return zumo.getClient().push.registerTemplate(channelUri, testTemplate.body, testTemplate.name, testTemplate.headers, testTemplate.tags);
            })
            .then(function () {
                return zumo.getClient().push.registerNative(channelUri);
            })
            .then(wait(registrationWaitInterval))
            .then(getRegistrations(channelUri, 'wns'))
            .then(function (registrations) {
                zumo.assert.isTrue(Array.isArray(registrations));
                zumo.assert.areEqual(2, registrations.length);
                return true;
            })
            .then(function () {
                return zumo.getClient().push.unregisterAll(channelUri);
            })
            .then(getRegistrations(channelUri, 'wns'))
            .then(function (registrations) {
                zumo.assert.isTrue(Array.isArray(registrations));
                zumo.assert.areEqual(0, registrations.length);
                zumo.assert.areEqual('{}', JSON.stringify(zumo.getClient().push._registrationManager._storageManager._registrations));
                return true;
            })
            .done(done, fail(test, done));
    }));

    function createPushTest(provider, method, tag, payload, expectedPayload) {

        var testName = 'Test for ' + provider + '/' + method;

        if (!expectedPayload) {
            expectedPayload = payload;
        }

        return new zumo.Test(testName, function (test, done) {
            test.addLog('Test for provider ', provider, ', method ', method, ', tag ', tag, ', payload ', payload);
            var client = zumo.getClient();

            client.invokeApi('push', {
                method: 'POST',
                body: {
                    method: 'send',
                    type: provider,
                    payload: payload,
                    token: 'dummy',
                    pushType: method,
                    tag: tag
                }
            }).done(function (response) {
                waitForNotification(15000, function (notification) {
                    if (notification) {
                        test.addLog('Notification received: ', notification);
                        if (notification.type !== pushNotifications.PushNotificationType.toast) {
                            test.addLog('Error, notification type (', notification.type, ') is not the expected (', pushNotifications.PushNotificationType.toast, ')');
                            done(false);
                        } else {
                            if (notification.content !== expectedPayload) {
                                test.addLog('Error, notification payload (', notification.content, ') is not the expected (', expectedPayload, ')');
                                done(false);
                            } else {
                                test.addLog('Push notification received successfully');
                                done(true);
                            }
                        }
                    } else {
                        test.addLog('Error, push not received on the allowed timeout');
                        done(false);
                    }
                });
            }, function (error) {
                test.addLog('Error calling push api, ' + error.toString);
            });
        });
    }

    return {
        name: 'Push',
        tests: tests
    };
}

function getRegistrations(channelUri, platform) {
    return function () {
        return new WinJS.Promise(function (complete) {
            zumo.getClient().push._registrationManager._pushHttpClient.listRegistrations(channelUri, platform, function (error, registrations) {
                complete(registrations);
            });
        });
    }
}

function wait(interval) {
    return function () {
        return WinJS.Promise.timeout(interval);
    }
}

function fail(test, done) {
    return function (error) {
        test.addLog('Error occurred: ', error);
        done(false);
    }
}

zumo.tests.push = definePushTestsNamespace();
