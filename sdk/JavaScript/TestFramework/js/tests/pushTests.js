// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/// <reference path="../testFramework.js" />

function definePushTestsNamespace() {
    var tests = [],
        client = zumo.getClient(),
        channelUri;

    tests.push(new zumo.Test('InitialDeleteRegistrations', function (test, done) {
        getChannel()
            .then(function (channel) {
                channelUri = channel.uri;
                return zumo.getClient().invokeApi('deleteRegistrationsForChannel', { method: 'DELETE', parameters: { channelUri: channelUri } });
            })
            .done(done, fail(test, done));
    }));

    tests.push(new zumo.Test('Register', function (test, done) {
        getChannel()
            .then(function (channel) {
                channelUri = channel.uri;
                return zumo.getClient().push.register('wns', channelUri);
            })
            .then(function () {
                return zumo.getClient().invokeApi('verifyRegisterInstallationResult', { method: 'GET', parameters: { channelUri: channelUri } });
            })
            .then(function () {
                return zumo.getClient().push.unregister(channelUri);
            })
            .done(done, fail(test, done));
    }));

    tests.push(new zumo.Test('Unregister', function (test, done) {
        getChannel()
            .then(function (channel) {
                channelUri = channel.uri;
                return zumo.getClient().push.unregister(channelUri)
            })
            .then(function () {
                return zumo.getClient().invokeApi('verifyUnregisterInstallationResult', { method: 'GET' });
            })
            .done(done, fail(test, done));
    }));

    tests.push(new zumo.Test('RegisterWithTemplates', function (test, done) {
        getChannel()
            .then(function (channel) {
                channelUri = channel.uri;
                return zumo.getClient().push.register('wns', channelUri, createTemplates(['foo']))
            })
            .then(function () {
                return zumo.getClient().invokeApi('verifyRegisterInstallationResult', { method: 'GET', parameters: { channelUri: channelUri, templates: createTemplates() } });
            })
            .then(function () {
                return zumo.getClient().push.unregister(channelUri);
            })
            .done(done, fail(test, done));
    }));

    tests.push(new zumo.Test('RegisterWithTemplatesAndSecondaryTiles', function (test, done) {
        getChannel()
            .then(function (channel) {
                channelUri = channel.uri;
                return zumo.getClient().push.register('wns', channelUri, createTemplates(['bar']), createSecondaryTiles(channelUri, ['foo']))
            })
            .then(function () {
                return zumo.getClient().invokeApi('verifyRegisterInstallationResult', { method: 'GET', parameters: { channelUri: channelUri, templates: createTemplates(), secondaryTiles: createSecondaryTiles(channelUri, undefined, true) } });
            })
            .then(function () {
                return zumo.getClient().push.unregister(channelUri);
            })
            .done(done, fail(test, done));
    }));

    tests.push(new zumo.Test('RegisterMultiple', function (test, done) {
        getChannel()
            .then(function (channel) {
                channelUri = channel.uri;
                return zumo.getClient().push.register('wns', channelUri)
            })
            .then(function () {
                return zumo.getClient().push.register('wns', channelUri, createTemplates(['foo']));
            })
            .then(function () {
                return zumo.getClient().push.register('wns', channelUri);
            })
            .then(function () {
                return zumo.getClient().invokeApi('verifyRegisterInstallationResult', { method: 'GET', parameters: { channelUri: channelUri } });
            })
            .then(function () {
                return zumo.getClient().push.unregister(channelUri);
            })
            .done(done, fail(test, done));
    }));

    return {
        name: 'Push',
        tests: tests
    };
}

function createTemplates(tags) {
    return {
        testTemplate: {
            body: '<toast><visual><binding template="ToastText01"><text id="1">$(message)</text></binding></visual></toast>',
            headers: { 'X-WNS-Type': 'wns/toast' },
            tags: tags
        }
    }
}

function createSecondaryTiles(channelUri, tags, expectedTiles) {
    // the ordering of this is significant as the comparison performed on the server is done by serialising to JSON. 
    // If it's flaky, a more robust object comparison should be implemented
    return {
        testSecondaryTiles: {
            pushChannel: channelUri,
            pushChannelExpired: expectedTiles ? false : undefined,
            templates: createTemplates(tags)
        }
    };
}

function getChannel() {
    return Windows.Networking.PushNotifications.PushNotificationChannelManager.createPushNotificationChannelForApplicationAsync();
}

function fail(test, done) {
    return function (error) {
        test.addLog('Error occurred: ', error);
        done(false);
    }
}

zumo.tests.push = definePushTestsNamespace();

/*

    tests.push(new zumo.Test('Register push channel', function (test, done) {
        var pushManager = Windows.Networking.PushNotifications.PushNotificationChannelManager;
        pushManager.createPushNotificationChannelForApplicationAsync().done(function (channel) {
            test.addLog('Created push channel: ', { uri: channel.uri, expirationTime: channel.expirationTime });
            channel.onpushnotificationreceived = onPushNotificationReceived;
            var runtimeFeatures = zumo.util.globalTestParams[zumo.constants.RUNTIME_FEATURES_KEY];
            if (runtimeFeatures[zumo.runtimeFeatureNames.NH_PUSH_ENABLED]) {
                zumo.getClient().push.register('wns', channel.uri).done(function () {
                    test.addLog('Registered with NH');
                    channelUri = channel;
                    done(true);
                }, function (error) {
                    test.addLog('Error registering with NH: ', error);
                    done(false);
                });;
            }
            else {
                channelUri = channel;
                done(true);
            }
        }, function (error) {
            test.addLog('Error creating push channel: ', error);
            done(false);
        });
    }));

    tests.push(createPushTest('sendToastText01',
        { text1: 'hello world' },
        '<toast><visual><binding template="ToastText01"><text id="1">hello world</text></binding></visual></toast>'));

    tests.push(new zumo.Test('Unregister push channel', function (test, done) {
        if (channelUri) {
            var runtimeFeatures = zumo.util.globalTestParams[zumo.constants.RUNTIME_FEATURES_KEY];
            if (runtimeFeatures[zumo.runtimeFeatureNames.NH_PUSH_ENABLED]) {
                zumo.getClient().push.unregister(channelUri.uri).done(function () {
                    test.addLog('Unregistered with NH: ');
                    done(true);
                }, function (error) {
                    test.addLog('Failed to unregister with NH: ', error);
                    done(false);
                });
            }
            else {
                channelUri.close();
                done(true);
            }
        } else {
            test.addLog('Error, push channel needs to be registered.');
            done(false);
        }
        channelUri = null;
    }));


    function createPushTest(wnsMethod, payload, expectedPushPayload, templatePush) {
        /// <param name="wnsMethod" type="String">The method on the WNS module</param>
        /// <param name="payload" type="object">The payload to be sent to WNS</param>
        /// <param name="expectedPushPayload" type="String">The result which will be returned on the callback</param>
        var testName = 'Test for ' + wnsMethod + ': ';
        var payloadString = JSON.stringify(payload);
        testName += payloadString.length < 15 ? payloadString : (payloadString.substring(0, 15) + "...");

        var expectedNotificationType;
        var notificatonType;
        if (wnsMethod.indexOf('Badge') >= 0) {
            expectedNotificationType = pushNotifications.PushNotificationType.badge;
            notificatonType = 'badge';
        } else if (wnsMethod.indexOf('Raw') >= 0) {
            expectedNotificationType = pushNotifications.PushNotificationType.raw;
            notificatonType = 'raw';
        } else if (wnsMethod.indexOf('Tile') >= 0) {
            expectedNotificationType = pushNotifications.PushNotificationType.tile;
            notificatonType = 'tile';
        } else if (wnsMethod.indexOf('Toast') >= 0) {
            expectedNotificationType = pushNotifications.PushNotificationType.toast;
            notificatonType = 'toast';
        } else {
            throw "Unknown wnsMethod";
        }

        if (templatePush) {
            notificatonType = 'template';
        }

        if (typeof expectedPushPayload === 'object') {
            expectedPushPayload = JSON.stringify(expectedPushPayload);
        }

        return new zumo.Test(testName, function (test, done) {
            test.addLog('Test for method ', wnsMethod, ' with payload ', payload);
            var client = zumo.getClient();
            var runtimeFeatures = zumo.util.globalTestParams[zumo.constants.RUNTIME_FEATURES_KEY];
            var table = client.getTable(tableName);
            var item = {
                method: wnsMethod,
                channelUri: channelUri.uri,
                payload: payload,
                xmlPayload: expectedPushPayload,
                usingNH: runtimeFeatures[zumo.runtimeFeatureNames.NH_PUSH_ENABLED],
                nhNotificationType: notificatonType,
                templateNotification: templateNotification
            };
            table.insert(item).done(function (inserted) {
                if (inserted.response) {
                    delete inserted.response.channel;
                }
                test.addLog('Push request: ', inserted);
                waitForNotification(notificationTimeout, function (notification) {
                    if (notification) {
                        test.addLog('Notification received: ', notification);
                        if (notification.type !== expectedNotificationType) {
                            test.addLog('Error, notification type (', notification.type, ') is not the expected (', expectedNotificationType, ')');
                            done(false);
                        } else {
                            var xmlTag = "<?xml version=\"1.0\"?>";
                            notification.content = notification.content.replace(xmlTag, "");
                            if (stripFormatting(notification.content) !== expectedPushPayload) {
                                test.addLog('Error, notification payload (', notification.content, ') is not the expected (', expectedPushPayload, ')');
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
            }, function (err) {
                test.addLog('Error requesting push notification: ', err);
                done(false);
            });
        });
    }

    function stripFormatting(source) {
        return source.replace(/\r\n[\ ]* /g, '');
}

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
    }

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
    }

*/