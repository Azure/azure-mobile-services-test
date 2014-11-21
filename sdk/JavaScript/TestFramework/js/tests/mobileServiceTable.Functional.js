// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/// <reference path="../../../ZumoE2ETestAppJs/ZumoE2ETestAppHTML/js/platformSpecificFunctions.js" />
/// <reference path="../../../ZumoE2ETestAppJs/ZumoE2ETestAppJs/js/MobileServices.js" />
/// <reference path="../testFramework.js" />

function defineTableGenericFunctionalTestsNamespace() {
    var tests = [];
    var stringIdTableName = 'roundtriptable';
    var intIdTableName = 'intidroundtriptable';
    var globalTest = null;
    var globaldone = null;
    //Helper functions
    function newLink() {
        var def = $.Deferred();
        return def;
    }

    function awaitTestComplete(test, done, completionPromise) {
        completionPromise.then(function () {
            test.addLog('Test ' + test.name + ' passed.');
            done(true);
        }, function () {
            test.addLog('Test ' + test.name + ' failed.');
            done(false);
        });
    }

    var failFn = function (err) {
        if (err != undefined) {
            globalTest.addLog('Error' + JSON.stringify(err));
        }
        globaldone(false);
    }

    function emptyTable(table) {
        var emptyTablePromise = newLink();
        var readPromise = newLink();
        var promises = [readPromise];
        // Read the table
        table.read().then(function (results) {
            if (results.length == 0) {
                readPromise.resolve();
            } else {
                results.forEach(function (result) {
                    var deleteItemPromise = newLink();
                    promises.push(deleteItemPromise);
                    table.del(result).then(function () {
                        deleteItemPromise.resolve();
                    }, function () {
                        deleteItemPromise.reject();
                    });
                });
                readPromise.resolve();
            }
        }, function () {
            readPromise.reject();
        });

        // Assert that the deletes completed.
        $.when.apply($, promises).then(function () {
            emptyTablePromise.resolve();
        }, function () {
            emptyTablePromise.reject();
        });

        // 2nd attempt to clean up table.
        var emptyTablePromise2 = newLink();
        emptyTablePromise.then(function () {
            var readPromise2 = newLink();
            var promises2 = [readPromise2];
            table.read().then(function (results) {
                if (results.length == 0) {
                    readPromise2.resolve();
                }
                results.forEach(function (result2) {
                    var deletePromise2 = newLink();
                    promises2.push(deletePromise2);
                    table.del(result2)
                        .then(function () {
                            deletePromise2.resolve();
                        }, function () {
                            deletePromise2.reject();
                        });
                });
                readPromise2.resolve();
            }, function () {
                readPromise2.reject();
            });
            $.when.apply($, promises2).then(function () {
                emptyTablePromise2.resolve();
            }, function () {
                emptyTablePromise2.reject();
            });
        })
        return emptyTablePromise2;
    }

    tests.push(new zumo.Test('Identify enabled runtime features for functional tests', function (test, done) {
        var testCompletePromise = newLink();

        var client = zumo.getClient();
        client.invokeApi('runtimeInfo', {
            method: 'GET'
        }).done(function (response) {
            var runtimeInfo = response.result;
            test.addLog('Runtime features: ', runtimeInfo);
            var features = runtimeInfo.features;
            zumo.util.globalTestParams[zumo.constants.RUNTIME_FEATURES_KEY] = features;
            if (runtimeInfo.runtime.type.indexOf("node") > -1) {
                validStringIds.push("...");
                validStringIds.push("id with 255 characters " + new Array(257 - 24).join('A'));
                validStringIds.push("id with allowed ascii characters  !#$%&'()*,-.0123456789:;<=>@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}");
                validStringIds.push("id with allowed extended ascii characters ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ");
            }
            if (runtimeInfo.runtime.type.indexOf("NET") > -1) {
                validStringIds.push("id with 128 characters " + new Array(129 - 24).join('A'));
                validStringIds.push("id with allowed ascii characters  !#$%&'()*,-.0123456789:;<=>@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}".substr(0, 127));
                validStringIds.push("id with allowed extended ascii characters ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ".substr(0, 127));
            }
            testCompletePromise.resolve();
        }, function (err) {
            test.addLog('Error retrieving runtime info: ', err);
            testCompletePromise.reject();
        });

        awaitTestComplete(test, done, testCompletePromise);
    }));

    tests.push(new zumo.Test('UpdateAsyncWithWithMergeConflict', function (test, done) {
        var testCompletePromise = newLink();
        var client = zumo.getClient();
        var table = client.getTable(stringIdTableName);
        var savedVersion;
        var correctVersion;

        table.systemProperties = WindowsAzure.MobileServiceTable.SystemProperties.All;

        var insertPromise = newLink();

        test.addLog('Emptying table ' +  stringIdTableName + 'before test');
        var emptyTablePromise = emptyTable(table);
        emptyTablePromise.then(function () {
            var item = { id: 'an id', name: 'a value' };
            table.insert(item).then(function (item) {
                insertPromise.resolve(item);
            }, function () {
                insertPromise.reject();
            });
        }, function () {
            test.addLog('Table not emptied.');
            insertPromise.reject();
        });

        var updatePromise = newLink();
        insertPromise.then(function (item) {
            test.addLog('Item inserted to table with version ' + item.__version);
            savedVersion = item.__version;
            item.name = 'Hello!';
            table.update(item).then(function (item) {
                test.addLog('Updating item on table with version ' + savedVersion);
                test.addLog('Item updated');
                updatePromise.resolve(item);
            }, function () {
                test.addLog('Failed to update item on table with version ' + savedVersion);
                updatePromise.reject();
            })
        }, function (err) {
            test.addLog('Failed to insert the item.');
            test.addLog('Error' + JSON.stringify(err));
            updatePromise.reject();
        });

        var updatePromise2 = newLink();
        updatePromise.then(function (item) {
            test.addLog('Item version is now ' + item.__version);
            var a1 = assert.areNotEqual(item.__version, savedVersion);
            item.name = 'But Wait!';
            correctVersion = item.__version;
            item.__version = savedVersion;

            test.addLog('Attempting to update item on table with version ' + savedVersion + ' when it should be ' + correctVersion);

            table.update(item).then(function (items) {
                test.addLog('Update item on table with version ' + savedVersion + ' succeeded when it should not have.');
                updatePromise2.reject();
            }, function (error) {
                test.addLog('Update item on table with version ' + savedVersion + ' failed.');
                if (assert.areEqual(test, 412, error.request.status) &&
                          error.message.indexOf("Precondition Failed") > -1 &&
                          assert.areEqual(test, error.serverInstance.__version, correctVersion) &&
                          assert.areEqual(test, error.serverInstance.name, 'Hello!')) {
                    item.__version = correctVersion;
                    updatePromise2.resolve(item);
                } else {
                    test.addLog('Update item on table with version ' + savedVersion + ' failed, but the response was incorrect.');
                    updatePromise2.reject();
                }
            });
        }, function (err) {
            test.addLog('Failed to update the item.');
            test.addLog('Error' + JSON.stringify(err));
            updatePromise2.reject();
        });

        updatePromise2.then(function (item) {
            table.update(item).then(function (item) {
                if (assert.areNotEqual(item.__version, correctVersion)) {
                    testCompletePromise.resolve();
                } else {
                    testCompletePromise.reject();
                }
            }, function () {
                testCompletePromise.reject()
            });
        }, function () {
            testCompletePromise.reject()
        });

        awaitTestComplete(test, done, testCompletePromise);
    }));

    tests.push(new zumo.Test('DeleteAsyncWithNosuchItemAgainstStringIdTable', function (test, done) {
        var testCompletePromise = newLink();
        var client = zumo.getClient();
        var table = client.getTable(stringIdTableName);
        var emptyTablePromise = emptyTable(table);

        var insertPromises = [newLink()];
        emptyTablePromise.then(function () {
            test.addLog('Initialize our data');
            validStringIds.forEach(function (testId) {
                var insertPromise = newLink();
                insertPromises.push(insertPromise)
                table.insert({ id: testId, name: 'Hey' }).then(function (testId) {
                    test.addLog('Inserted item with Id ' + testId);
                    insertPromise.resolve();
                }, function (err, testId) {
                    test.addLog('Failed to insert item with Id ' + testId);
                    test.addLog('Error' + JSON.stringify(err));
                    insertPromise.reject();
                });
            });
            insertPromises[0].resolve();            
        }, function (err) {
            insertPromises[0].reject();
        });

        var insertCompletePromise = newLink();
        test.addLog('Waiting for inserts to complete.');
        $.when.apply($, insertPromises).then(function () {
            test.addLog('Inserts completed.');
            insertCompletePromise.resolve();
        }, function (err) {
            test.addLog('Inserts failed to complete.');
            test.addLog('Error' + JSON.stringify(err));
            insertCompletePromise.reject();
        });

        var lookupPromises = [newLink()];
        test.addLog('Looking up items that were recently inserted.');
        insertCompletePromise.then(function () {
            validStringIds.forEach(function (testId) {
                var lookupPromise = newLink();
                lookupPromises.push(lookupPromise);
                table.lookup(testId).then(function (item) {
                    if (assert.areEqual(test, item.id, testId)) {
                        lookupPromise.resolve();
                    }
                    else {
                        test.addLog('Failed to look up item with id ' + testId + ' because item.id did not match');
                        lookupPromise.reject();
                    }
                }, function (err) {
                    test.addLog('Failed to look up item with id ' + testId);
                    test.addLog('Error' + JSON.stringify(err));
                    lookupPromise.reject();
                });
            });
            lookupPromises[0].resolve();
        }, function (err) {
            test.addLog('Error' + JSON.stringify(err));
            lookupPromises[0].reject();
        });

        var lookupCompletePromise = newLink();
        $.when.apply($, lookupPromises).then(function () {
            lookupCompletePromise.resolve();
        }, function (err) {
            test.addLog('Error' + JSON.stringify(err));
            lookupCompletePromise.reject();
        });

        var deletePromises = [newLink()];
        lookupCompletePromise.then(function () {
            test.addLog('Delete our data');
            validStringIds.forEach(function (testId) {
                var deletePromise = newLink();
                deletePromises.push(deletePromise);
                table.del({ id: testId }).then(function () {
                    test.addLog('Delete item ' + testId + ' succeeded');
                    deletePromise.resolve();
                }, function (err) {
                    test.addLog('Delete item ' + testId + ' failed');
                    test.addLog('Error' + JSON.stringify(err));
                    deletePromise.reject();
                });
            });
            deletePromises[0].resolve();
        }, function () {
            deletePromises[0].reject();
        });

        var deleteCompletePromise = newLink();
        $.when.apply($, deletePromises).then(function () {
            test.addLog('Delete items succeeded');
            deleteCompletePromise.resolve();
        }, function (err) {
            test.addLog('Delete items failed');
            test.addLog('Error' + JSON.stringify(err));
            deleteCompletePromise.reject();
        });

        var delete2Promises = [newLink()];
        deleteCompletePromise.then(function () {
            test.addLog('Delete our data');
            validStringIds.forEach(function (testId) {
                var delete2Promise = newLink();
                delete2Promises.push(delete2Promise);
                table.del({ id: testId }).then(function (result) {
                    test.addLog('Should have failed');
                    delete2Promise.reject();
                }, function (error) {
                    delete2Promise.resolve();
                });
            });
            delete2Promises[0].resolve();
        }, function (err) {
            delete2Promises[0].reject();
        });

        $.when.apply($, delete2Promises).then(function () {
            testCompletePromise.resolve();
        }, function () {
            testCompletePromise.reject();
        });

        awaitTestComplete(test, done, testCompletePromise);
    }));

    tests.push(new zumo.Test('FilterReadAsyncWithEmptyStringIdAgainstStringIdTable', function (test, done) {
        var testCompletePromise = newLink();
        var client = zumo.getClient();
        var table = client.getTable(stringIdTableName);
        var emptyTablePromise = emptyTable(table);
        var insertPromises = [newLink()];
        emptyTablePromise.then(function () {
            test.addLog('Inserting valid string Ids to table ' + table.name);
            validStringIds.forEach(function (testId) {
                var insertPromise = newLink();
                insertPromises.push(insertPromise)
                table.insert({ id: testId, name: 'Hey' }).then(function () {
                    test.addLog('Inserted test Id ' + testId);
                    insertPromise.resolve();
                }, function (err) {
                    test.addLog('Failed to insert test Id ' + testId);
                    insertPromise.reject();
                });
            });
            insertPromises[0].resolve();
        }, function (err) {
            insertPromises[0].reject();
        });

        var readStart = newLink();
        $.when.apply($, insertPromises).then(function () {
            test.addLog("Inserts completed.");
            readStart.resolve();
        }, function (err) {
            test.addLog("Inserts failed.");
            readStart.reject();
        });

        var promises = [newLink()];
        readStart.then(function () {
            test.addLog('Checking that we cannot read Ids we did not insert');
            var testIds = emptyStringIds.concat(invalidStringIds).concat(null);
            testIds.forEach(function (testId) {
                var idNotExistPromise = newLink();
                promises.push(idNotExistPromise);
                table.where({ id: testId }).read().then(function (items) {
                    test.addLog('Read id ' + testId + ' succeeded');
                    var noItemsReturned = assert.areEqual(test, items.length, 0);
                    if (noItemsReturned) {
                        test.addLog('No items returned for unused Id ' + testId);
                        idNotExistPromise.resolve();
                    } else {
                        test.addLog('Failure because items were returned for unused Id ' + testId);
                        idNotExistPromise.reject();
                    }
                }, function (error) {
                    test.addLog('Read failed');
                    test.addLog('Error' + JSON.stringify(err));
                    idNotExistPromise.reject();
                });
            });
            promises[0].resolve();
        }, function (err) {
            promises[0].reject();
        });

        $.when.apply($, promises).then(function () {
            testCompletePromise.resolve();
        }, function (err) {
            testCompletePromise.reject();
        });
        awaitTestComplete(test, done, testCompletePromise);
    }));

    tests.push(new zumo.Test('RefreshAsyncWithNoSuchItemAgainstStringIdTable', function (test, done) {
        var testCompletePromise = newLink();

        var client = zumo.getClient();
        var table = client.getTable(stringIdTableName);
        var emptyTablePromise = emptyTable(table);

        var insertPromises = [newLink()];
        emptyTablePromise.then(function () {
            test.addLog('Initialize our data');
            validStringIds.forEach(function (testId) {
                var insertPromise = newLink();
                insertPromises.push(insertPromise)
                table.insert({ id: testId, name: 'Hey' }).then(function () {
                    insertPromise.resolve();
                }, function (err) {
                    insertPromise.reject();
                });
            });

            insertPromises[0].resolve();
            var lookupStart = newLink();
            $.when.apply($, insertPromises).then(function () {
                lookupStart.resolve();
            }, function (err) {
                lookupStart.reject();
            });

            var lookupPromises = [newLink()];
            lookupStart.then(function () {
                validStringIds.forEach(function (testId) {
                    var def = newLink();
                    lookupPromises.push(def);
                    table.lookup(testId).then(function (item) {
                        if (assert.areEqual(test, item.id, testId)) {
                            def.resolve();
                        }
                        else {
                            def.reject();
                        }
                    }, function (error) {
                        def.reject();
                    });
                });

                lookupPromises[0].resolve();

                var deleteStart = newLink();
                $.when.apply($, lookupPromises).then(function () {
                    deleteStart.resolve();
                }, function (err) {
                    deleteStart.reject();
                });

                var deletePromises = [newLink()];
                deleteStart.then(function () {
                    test.addLog('Delete our data');
                    validStringIds.forEach(function (testId) {
                        var def = newLink();
                        deletePromises.push(def);
                        table.del({ id: testId }).then(function () {
                            def.resolve();
                        }, function (err) {
                            test.addLog('Should have suceeded');
                            test.addLog('Error' + JSON.stringify(err));
                            def.reject();
                        });
                    });

                    deletePromises[0].resolve();
                    var refreshStart = newLink();
                    $.when.apply($, deletePromises).then(function () {
                        refreshStart.resolve();
                    }, function () {
                        refreshStart.reject();
                    });

                    var refreshPromises = [newLink()];
                    refreshStart.then(function () {
                        test.addLog('Refresh our data');
                        validStringIds.forEach(function (testId) {
                            var def = newLink();
                            refreshPromises.push(def);
                            table.refresh({ id: testId, Name: 'Hey' }).then(function (result) {
                                test.addLog('Should have failed');
                                def.reject();
                            }, function (error) {
                                def.resolve();
                            });
                        });
                        refreshPromises[0].resolve();
                        $.when.apply($, refreshPromises).then(function () {
                            testCompletePromise.resolve();
                        }, function () {
                            testCompletePromise.reject();
                        });
                    })
                }, function () {
                    testCompletePromise.reject();
                })
            });
        }, function (error) {
            testCompletePromise.reject();
        });
        awaitTestComplete(test, done, testCompletePromise);
    }));

    // BUG #1706815 (query system properties)
    tests.push(new zumo.Test('AsyncFilterSelectOrderingOperationsNotImpactedBySystemProperties', function (test, done) {
        test.addLog('test table sorting with various system properties');
        var client = zumo.getClient(),
            savedItems = [];
        var forLink = [newLink()]
        var i = 0;
        var table = client.getTable(stringIdTableName);
        table.systemProperties = WindowsAzure.MobileServiceTable.SystemProperties.All;
        var emptyTablePromise = emptyTable(table);

        emptyTablePromise.then(function () {
            var insertPromise = newLink();
            table.insert({ id: '1', name: 'value' }).then(function (item) {
                insertPromise.resolve(item);
            });
            return insertPromise;
        }).then(function (item) {
            var insertPromise = newLink();
            savedItems.push(item);
            table.insert({ id: '2', name: 'value' }).then(function (item) {
                insertPromise.resolve(item);
            });
            return insertPromise;
        }).then(function (item) {
            savedItems.push(item);
            var insertPromise = newLink();
            table.insert({ id: '3', name: 'value' }).then(function (item) {
                insertPromise.resolve(item);
            });
            return insertPromise;
        }).then(function (item) {
            savedItems.push(item);
            var insertPromise = newLink();
            table.insert({ id: '4', name: 'value' }).then(function (item) {
                insertPromise.resolve(item);
            });
            return insertPromise;
        }).then(function (item) {
            savedItems.push(item);
            var insertPromise = newLink();
            table.insert({ id: '5', name: 'value' }).then(function (item) {
                insertPromise.resolve(item);
            });
            return insertPromise;
        }).then(function (item) {
            savedItems.push(item);
            forLink[0].resolve(0);
        });


        testSystemProperties.forEach(function (systemProperties) {
            i = i + 1;
            forLink[i] = newLink();
            forLink[i - 1].then(function (i2) {
                table.systemProperties = testSystemProperties[i2];
                test.addLog('testing properties: ' + systemProperties);

                var orderbyPromise = newLink();
                table.orderBy('__createdAt').read().then(function (item) {
                    orderbyPromise.resolve(item);
                }, function () { forLink[i2 + 1].reject(); });

                orderbyPromise.then(function (items) {
                    for (var i = 0; i < items.length - 1; i++) {
                        if (!(items[i].id < items[i + 1].id)) {
                            forLink[i2 + 1].reject();
                        }
                    }
                    var orderbyPromise = newLink();
                    table.orderBy('__updatedAt').read().then(function (item) {
                        orderbyPromise.resolve(item);
                    }, function () { forLink[i2 + 1].reject(); })
                    return orderbyPromise;
                }, function () {
                    forLink[i2 + 1].reject();
                }).then(function (items) {
                    for (var i = 0; i < items.length - 1; i++) {
                        if (!(items[i].id < items[i + 1].id)) {
                            forLink[i2 + 1].reject();
                        }
                    }
                    var orderbyPromise = newLink();
                    table.orderBy('__version').read().then(function (item) {
                        orderbyPromise.resolve(item);
                    }, function () { forLink[i2 + 1].reject(); })
                    return orderbyPromise;
                }, function () {
                    forLink[i2 + 1].reject();
                }).then(function (items) {
                    for (var i = 0; i < items.length - 1; i++) {
                        if (!(items[i].id < items[i + 1].id)) {
                            forLink[i2 + 1].reject();
                        }
                    }
                    var wherePromise = newLink();
                    table.where(function (value) { return this.__createdAt >= value; }, savedItems[3].__createdAt).read().then(function (items) {
                        wherePromise.resolve(items);
                    }, function () { forLink[i2 + 1].reject(); })
                    return wherePromise;
                }).then(function (items) {
                    var wherePromise = newLink();
                    if (!assert.areEqual(test, 2, items.length)) {
                        forLink[i2 + 1].reject();
                    }

                    table.where(function (value) { return this.__updatedAt >= value; }, savedItems[3].__updatedAt).read().then(function (items) {
                        wherePromise.resolve(items);
                    }, function () { forLink[i2 + 1].reject(); })
                    return wherePromise;
                }).then(function (items) {
                    if (!assert.areEqual(test, 2, items.length)) {
                        forLink[i2 + 1].reject();
                    }

                    var wherePromise = newLink();
                    table.where({ __version: savedItems[3].__version }).read().then(function (items) {
                        wherePromise.resolve(items);
                    }, function () { forLink[i2 + 1].reject(); })
                    return wherePromise;
                }).then(function (items) {
                    if (!assert.areEqual(test, 1, items.length)) {
                        forLink[i2 + 1].reject();
                    }
                    var wherePromise = newLink();
                    table.select('id', '__createdAt').read().then(function (items) {
                        wherePromise.resolve(items);
                    }, function () { forLink[i2 + 1].reject(); })
                    return wherePromise;
                }).then(function (items) {
                    for (var i = 0; i < items.length; i++) {
                        if (items[i].__createdAt == null) {
                            forLink[i2 + 1].reject();
                        }
                    }
                    var selectPromise = newLink();
                    table.select('id', '__updatedAt').read().then(function (items) {
                        selectPromise.resolve(items)
                    }, function () { forLink[i2 + 1].reject(); })
                    return selectPromise;
                }).then(function (items) {
                    for (var i = 0; i < items.length; i++) {
                        if (items[i].__updatedAt == null) {
                            forLink[i2 + 1].reject();
                        }
                    }
                    var selectPromise = newLink();
                    table.select('id', '__version').read().then(function (items) {
                        selectPromise.resolve(items)
                    }, function () { forLink[i2 + 1].reject(); })
                    return selectPromise;
                }).then(function (items) {
                    for (var i = 0; i < items.length; i++) {
                        if (items[i].__version == null) {
                            var rejected = true;
                            forLink[i2 + 1].reject();
                        }
                    }
                    if (!rejected) {
                        forLink[i2 + 1].resolve(i2 + 1);
                    }
                })
            })
        })

        $.when.apply($, forLink).then(function () {
            done(true);
        }, function () {
            done(false);
        });
    }, [zumo.runtimeFeatureNames.NodeRuntime_Only]));

    // BUG #2133523: .NET runtime should respond 400 if query requests invalid system properties
    tests.push(new zumo.Test('AsyncTableOperationsWithInvalidSystemPropertiesQuerystring', function (test, done) {
        var client = zumo.getClient(),
            savedItem;
        var table = client.getTable(stringIdTableName);

        var forLink = [newLink()]
        var i = 0;
        forLink[i].resolve(i);

        testInvalidSystemPropertyQueryStrings.forEach(function (systemProperties) {
            i = i + 1;
            forLink[i] = newLink();
            forLink[i - 1].then(function (i2) {
                systemProperties = testInvalidSystemPropertyQueryStrings[i2];
                var systemPropertiesKeyValue = systemProperties.split('='),
                    userParams = {};

                userParams[systemPropertiesKeyValue[0]] = systemPropertiesKeyValue[1];
                test.addLog('querystring: ' + systemProperties);
                var insertPromise = newLink();
                table.insert({ id: 'an id', name: 'a value' }, userParams).then(function (item) {
                    forLink[i2 + 1].reject();
                }, function (error) {
                    insertPromise.resolve();
                });

                var readPromise = newLink();
                insertPromise.then(function () {
                    return table.read('', userParams).then(function (items) {
                        forLink[i2 + 1].reject();
                    }, function (error) {
                        readPromise.resolve();
                    })
                })

                var wherePromise = newLink();
                readPromise.then(function () {
                    return table.where({ __version: 'AAA' }).read(userParams).then(function (items) {
                        forLink[i2 + 1].reject();
                    }, function (error) {
                        wherePromise.resolve();
                    })
                });

                var lookupPromise = newLink();
                readPromise.then(function () {
                    return table.lookup('an id', userParams).then(function (items) {
                        forLink[i2 + 1].reject();
                    }, function (error) {
                        lookupPromise.resolve();
                    })
                });


                lookupPromise.then(function () {
                    table.update({ id: 'an id', name: 'new value' }, userParams).then(function (items) {
                        forLink[i2 + 1].reject();
                    }, function (error) {
                        forLink[i2 + 1].resolve(i2 + 1);
                    })
                });
            })
        })
        $.when.apply($, forLink).then(function () {
            done(true);
        }, function () {
            done(false);
        });
    }, [zumo.runtimeFeatureNames.NodeRuntime_Only]));

    // BUG #1706815 (OData query for version field (string <--> byte[] mismatch)
    tests.push(new zumo.Test('AsyncTableOperationsWithAllSystemPropertiesUsingCustomSystemParameters', function (test, done) {
        var client = zumo.getClient(),
            savedItem;
        var table = client.getTable(stringIdTableName);

        var forLink = [newLink()]
        var i = 0;
        forLink[i].resolve(i);

        testValidSystemPropertyQueryStrings.forEach(function (systemProperties) {
            i = i + 1;
            forLink[i] = newLink();
            forLink[i - 1].then(function (i2) {
                systemProperties = testValidSystemPropertyQueryStrings[i2];
                var systemPropertiesKeyValue = systemProperties.split('='),
                                    userParams = {
                                    },
                                    savedVersion;

                userParams[systemPropertiesKeyValue[0]] = systemPropertiesKeyValue[1];

                var lowerCaseSysProperties = systemProperties.toLowerCase();
                shouldHaveCreatedAt = lowerCaseSysProperties.indexOf('created') !== -1,
                shouldHaveUpdatedAt = lowerCaseSysProperties.indexOf('updated') !== -1,
                shouldHaveVersion = lowerCaseSysProperties.indexOf('version') !== -1;

                if (lowerCaseSysProperties.indexOf('*') !== -1) {
                    shouldHaveCreatedAt = shouldHaveUpdatedAt = shouldHaveVersion = true;
                }

                table.read().then(function (results) {
                    var readPromise = newLink();
                    var promises = [];
                    results.forEach(function (result) {
                        var delProm = newLink();
                        promises.push(delProm);
                        table.del(result).then(function () { delProm.resolve(); });
                    });
                    $.when.apply($, promises).done(function () {
                        readPromise.resolve();
                    });
                    return readPromise;
                }, function () { forLink[i2 + 1].reject(); }).then(function () {
                    var insertPromise = newLink();
                    table.insert({ id: 'an id', name: 'a value' }, userParams).then(function (item) {
                        insertPromise.resolve(item);
                    });
                    return insertPromise;
                }, function () { forLink[i2 + 1].reject(); })
               .then(function (item) {
                   var insertPromise2 = newLink();
                   var a1 = assert.areEqual(test, shouldHaveCreatedAt, item.__createdAt !== undefined);
                   var a2 = assert.areEqual(test, shouldHaveUpdatedAt, item.__updatedAt !== undefined);
                   var a3 = assert.areEqual(test, shouldHaveVersion, item.__version !== undefined);
                   savedItem = item;
                   if (a1 && a2 && a3) {
                       table.read('', userParams).then(function (item) {
                           insertPromise2.resolve(item);
                       },
                       function () { forLink[i2 + 1].reject(); });
                   }
                   else {
                       insertPromise2.reject();
                   }
                   return insertPromise2;
               }, function () { forLink[i2 + 1].reject(); })
               .then(function (items) {
                   var wherePromise = newLink();
                   var a4 = assert.areEqual(test, 1, items.length);
                   var item = items[0];
                   var create = assert.areEqual(test, shouldHaveCreatedAt, item.__createdAt !== undefined);
                   var update = assert.areEqual(test, shouldHaveUpdatedAt, item.__updatedAt !== undefined);
                   var version = assert.areEqual(test, shouldHaveVersion, item.__version !== undefined);


                   var whereCriteria = null;
                   if (shouldHaveCreatedAt) {
                       whereCriteria = { __createdAt: savedItem.__createdAt }
                   }

                   if (shouldHaveUpdatedAt) {
                       whereCriteria = { __updatedAt: savedItem.__updatedAt }
                   }

                   if (shouldHaveVersion) {
                       whereCriteria = { __version: savedItem.__version }
                   }

                   if (create && update && version && a4) {
                       table.where(whereCriteria).read(userParams).then(function (item) {
                           wherePromise.resolve(item);
                       }, function () { forLink[i2 + 1].reject(); });
                   }
                   else {
                       wherePromise.reject();
                   }
                   return wherePromise;
               }, function () { forLink[i2 + 1].reject(); })
               .then(function (items) {
                   var a4 = assert.areEqual(test, 1, items.length);
                   var item = items[0];
                   var create = assert.areEqual(test, shouldHaveCreatedAt, item.__createdAt !== undefined);
                   var update = assert.areEqual(test, shouldHaveUpdatedAt, item.__updatedAt !== undefined);
                   var version = assert.areEqual(test, shouldHaveVersion, item.__version !== undefined);

                   var lookupPromise = newLink();
                   if (create && update && version && a4) {
                       table.lookup(savedItem.id, userParams).then(function (item) {
                           lookupPromise.resolve(item);
                       }, function () {
                           forLink[i2 + 1].reject();
                       })
                   }
                   else {
                       forLink[i2 + 1].reject();
                   }
                   return lookupPromise;
               }, function () { forLink[i2 + 1].reject(); })
               .then(function (item) {
                   var updatePromise = newLink();
                   var a1 = (assert.areEqual(test, shouldHaveCreatedAt, item.__createdAt !== undefined) &&
                             assert.areEqual(test, shouldHaveUpdatedAt, item.__updatedAt !== undefined) &&
                         assert.areEqual(test, shouldHaveVersion, item.__version !== undefined));

                   savedItem.name = 'Hello!';
                   savedVersion = item.__version;

                   if (a1) {
                       table.update(savedItem, userParams).then(function (item) {
                           updatePromise.resolve(item);
                       }, function () {
                           forLink[i2 + 1].reject();
                       })
                   }
                   else {
                       updatePromise.reject();
                   }
                   return updatePromise;
               }, function () { forLink[i2 + 1].reject(); })
               .then(function (item) {
                   var a1 = (assert.areEqual(test, shouldHaveCreatedAt, item.__createdAt !== undefined) &&
                                        assert.areEqual(test, shouldHaveUpdatedAt, item.__updatedAt !== undefined) &&
                                        assert.areEqual(test, shouldHaveVersion, item.__version !== undefined));
                   if (shouldHaveVersion) {
                       a1 = a1 && assert.areNotEqual(item.__version, savedVersion);
                   }

                   if (a1) {
                       table.del(item).then(function (item) {
                           forLink[i2 + 1].resolve(i2 + 1);
                       }, function () {
                           forLink[i2 + 1].reject();
                       })
                   } else {
                       forLink[i2 + 1].reject();
                   }
               })
            })
        })
        $.when.apply($, forLink).then(function () {
            done(true);
        }, function () {
            done(false);
        });
    }, [zumo.runtimeFeatureNames.NodeRuntime_Only]));

    tests.push(new zumo.Test('LookupAsyncWithNosuchItemAgainstStringIdTable', function (test, done) {
        var client = zumo.getClient();
        var table = client.getTable(stringIdTableName);
        var emptyTablePromise = emptyTable(table);

        var insertPromises = [newLink()];
        emptyTablePromise.then(function () {
            test.addLog('Initialize our data');
            validStringIds.forEach(function (testId) {
                var insertPromise = newLink();
                insertPromises.push(insertPromise)
                table.insert({
                    id: testId, name: 'Hey'
                }).then(function () {
                    insertPromise.resolve();
                }, function (err) {
                    test.addLog('Error' + JSON.stringify(err));
                    insertPromise.reject();
                });
            });

            insertPromises[0].resolve();

            var deleteStart = newLink();
            $.when.apply($, insertPromises).then(function () {
                deleteStart.resolve();
            }, function (err) {
                done(false);
            });

            var deletePromises = [newLink()];
            deleteStart.then(function () {
                test.addLog('Delete our data');
                validStringIds.forEach(function (testId) {
                    var def = newLink();
                    deletePromises.push(def);
                    table.del({ id: testId }).then(function () {
                        def.resolve();
                    }, function (err) {
                        test.addLog('Should have suceeded');
                        test.addLog('Error' + JSON.stringify(err));
                        def.reject();
                    });
                });

                deletePromises[0].resolve();
                var lookupStart = newLink();
                $.when.apply($, deletePromises).then(function () {
                    lookupStart.resolve();
                }, function () {
                    done(false);
                });

                var lookupPromises = [newLink()];
                lookupStart.then(function () {
                    validStringIds.forEach(function (testId) {
                        var def = newLink();
                        lookupPromises.push(def);
                        table.lookup(testId).then(function (item) {
                            test.addLog('Should have failed');
                            return def.reject();
                        }, function (error) {
                            def.resolve();
                        });
                    });
                    lookupPromises[0].resolve();
                    $.when.apply($, lookupPromises).then(function () {
                        done(true);
                    }, function () {
                        done(false);
                    });
                })
            })
        }, function (error) {
            done(false);
        });
    }));


    // This test has a bug in it where two threads seemingly get instantiated.
    tests.push(new zumo.Test('InsertAsyncWithExistingItemAgainstStringIdTable', function (test, done) {
        var client = zumo.getClient();
        var table = client.getTable(stringIdTableName);
        var testCompletePromise = newLink();
        var emptyTablePromise = emptyTable(table);

        var insertPromises = [newLink()];
        emptyTablePromise.then(function () {
            test.addLog('Initialize our data');
            // Set the inserts to perform
            validStringIds.forEach(function (testId) {
                var insertPromise = newLink();
                insertPromises.push(insertPromise)
                table.insert({ id: testId, name: 'Hey' }).then(function () {
                    test.addLog('Inserted ' + testId);
                    insertPromise.resolve();
                }, function (err) {
                    test.addLog('Failed to insert ' + testId);
                    if (err != undefined) { test.addLog('Error' + JSON.stringify(err)); }
                    insertPromise.reject();
                });
            });

            // Wait for the inserts to complete.
            insertPromises[0].resolve();
            test.addLog('Waiting for inserts to complete');
            var lookupStart = newLink();
            $.when.apply($, insertPromises).then(function () {
                test.addLog('Inserts completed');
                lookupStart.resolve();
            }, function (err) {
                test.addLog('Inserts did not complete.  Failing test.');
                lookupStart.reject();
            });

            var lookupPromises = [newLink()];
            lookupStart.then(function () {
                validStringIds.forEach(function (testId) {
                    var def = newLink();
                    lookupPromises.push(def);
                    table.lookup(testId).then(function (item) {
                        if (assert.areEqual(test, item.id, testId)) {
                            def.resolve();
                        }
                        else {
                            def.reject();
                        }
                    }, function (error) {
                        if (err != undefined) { test.addLog('Error' + JSON.stringify(err)); }
                        def.reject();
                    });
                });

                lookupPromises[0].resolve();

                var insertStart = newLink();
                $.when.apply($, lookupPromises).then(function () {
                    insertStart.resolve();
                }, function (err) {
                    insertStart.reject();
                });

                var insertDupePromises = [newLink()];
                insertStart.then(function () {
                    test.addLog('Insert duplicates into our data');
                    validStringIds.forEach(function (testId) {
                        var def = newLink();
                        insertDupePromises.push(def);
                        return table.insert({ id: testId, name: 'I should really not do this' }).then(function (item) {
                            test.addLog('Should have failed');
                            def.reject();
                        }, function (error) {
                            def.resolve();
                        });
                    });
                    insertDupePromises[0].resolve();
                    $.when.apply($, insertDupePromises).then(function () {
                        testCompletePromise.resolve();
                    }, function () {
                        testCompletePromise.reject();
                    });
                })
            });
        }, function (error) {
            testCompletePromise.reject();
        });

        testCompletePromise.then(done(true), done(false));
    }));

    tests.push(new zumo.Test('UpdateAsyncWithNosuchItemAgainstStringIdTable', function (test, done) {
        var client = zumo.getClient();
        var table = client.getTable(stringIdTableName);
        var emptyTablePromise = emptyTable(table);

        var insertPromises = [newLink()];
        emptyTablePromise.then(function () {
            test.addLog('Initialize our data');
            validStringIds.forEach(function (testId) {
                var insertPromise = newLink();
                insertPromises.push(insertPromise)
                table.insert({
                    id: testId, name: 'Hey'
                }).then(function () {
                    insertPromise.resolve();
                }, function (err) {
                    insertPromise.reject();
                });
            });

            insertPromises[0].resolve();

            var deleteStart = newLink();
            $.when.apply($, insertPromises).then(function () {
                deleteStart.resolve();
            }, function (err) {
                done(false);
            });

            var deletePromises = [newLink()];
            deleteStart.then(function () {
                test.addLog('Delete our data');
                validStringIds.forEach(function (testId) {
                    var def = newLink();
                    deletePromises.push(def);
                    table.del({ id: testId }).then(function () {
                        def.resolve();
                    }, function (err) {
                        test.addLog('Should have suceeded');
                        test.addLog('Error' + JSON.stringify(err));
                        def.reject();
                    });
                });

                deletePromises[0].resolve();
                var updateStart = newLink();
                $.when.apply($, deletePromises).then(function () {
                    updateStart.resolve();
                }, function () {
                    done(false);
                });

                var updatePromises = [newLink()];
                updateStart.then(function () {
                    test.addLog('Update records the don\'t exist');
                    validStringIds.forEach(function (testId) {
                        var def = newLink();
                        updatePromises.push(def);
                        return table.update({ id: testId, name: 'Alright!' }).then(function (item) {
                            test.addLog('Should have failed');
                            return def.reject();
                        }, function (error) {
                            def.resolve();
                        });
                    });
                    updatePromises[0].resolve();
                    $.when.apply($, updatePromises).then(function () {
                        done(true);
                    }, function () {
                        done(false);
                    });
                })
            })
        }, function (error) {
            done(false);
        });
    }));

    tests.push(new zumo.Test('AsyncTableOperationsWithIntegerAsStringIdAgainstIntIdTable', function (test, done) {
        globalTest = test;
        globaldone = done;
        var client = zumo.getClient();
        var table = client.getTable(intIdTableName);
        var testId;

        emptyTable(table).then(function () {
            test.addLog('Insert record');
            var insertPromise = newLink();
            table.insert({
                name: 'Hey'
            }).then(function (item) {
                insertPromise.resolve();
                testId = item.id;
            }, failFn);
            return insertPromise;
        }).then(function (item) {
            var readPromise = newLink();
            test.addLog('read table');
            table.read().then(function (items) {
                readPromise.resolve(items);
            }, failFn);
            return readPromise;
        }).then(function (items) {
            var selectPromise = newLink();
            var a1 = assert.areEqual(test, 1, items.length);
            var a2 = assert.areEqual(test, testId, items[0].id);
            var a3 = assert.areEqual(test, "Hey", items[0].name);
            if (a1 && a2 && a3) {
                test.addLog('perform select');
                table.select(function () {
                    this.xid = this.id; this.xname = this.name; return this;
                }).read().then(function (item) {
                    selectPromise.resolve(item);
                }, failFn);
            }
            else {
                selectPromise.reject();
            }
            return selectPromise;
        }).then(function (items) {
            var lookupPromise = newLink();
            var a1 = assert.areEqual(test, 1, items.length);
            var a2 = assert.areEqual(test, testId, items[0].xid);
            var a3 = assert.areEqual(test, 'Hey', items[0].xname);
            if (a1 && a2 && a3) {
                test.addLog('perform lookup');
                table.lookup(items[0].xid).then(function (items) {
                    lookupPromise.resolve(items)
                }, failFn);
            }
            else {
                lookupPromise.reject();
            }
            return lookupPromise;
        }).then(
                 function (item) {
                     var updatePromise = newLink();
                     var a1 = assert.areEqual(test, testId, item.id);
                     var a2 = assert.areEqual(test, 'Hey', item.name);
                     if (a1 && a2) {
                         test.addLog('perform update');
                         item.name = 'What?';
                         table.update(item).then(function (items) {
                             updatePromise.resolve(items)
                         }, failFn);
                     }
                     else {
                         updatePromise.reject();
                     }
                     return updatePromise;
                 }).then(
                 function (item) {
                     var refreshPromise = newLink();
                     var a1 = assert.areEqual(test, testId, item.id);
                     var a2 = assert.areEqual(test, 'What?', item.name);
                     if (a1 && a2) {
                         test.addLog('perform refresh');
                         table.refresh({
                             id: item.id, name: 'Hey'
                         }).then(function (item) {
                             refreshPromise.resolve(item)
                         }, failFn);
                     }
                     else {
                         refreshPromise.reject();
                     }
                     return refreshPromise;
                 }).then(
                 function (item) {
                     var readPromise = newLink();
                     var a1 = assert.areEqual(test, testId, item.id);
                     var a2 = assert.areEqual(test, 'What?', item.name);
                     if (a1 && a2) {
                         test.addLog('perform read again');
                         table.read().then(function (items) {
                             readPromise.resolve(items);
                         }, failFn);
                     }
                     else {
                         readPromise.reject();
                     }
                     return readPromise;
                 }).then(
         function (items) {
             var a1 = assert.areEqual(test, 1, items.length);
             var a2 = assert.areEqual(test, testId, items[0].id);
             var a3 = assert.areEqual(test, 'What?', items[0].name);
             if (a1 && a2 && a3) {
                 done(true);
             }
             else {
                 done(false);
             }
         });
    }));



    tests.push(new zumo.Test('DeleteAsyncWithWithMergeConflict', function (test, done) {
        globalTest = test;
        globaldone = done;
        test.addLog('test delete with conflict')
        var client = zumo.getClient();
        var table = client.getTable(stringIdTableName),
                savedVersion,
                correctVersion;

        table.systemProperties = WindowsAzure.MobileServiceTable.SystemProperties.All;

        var insertPromise = newLink();
        emptyTable(table).then(function () {
            table.insert({
                id: 'an id', name: 'a value'
            }).then(function (item) {
                insertPromise.resolve(item)
            }, failFn)
        }, failFn);

        var updatePromise = newLink();
        insertPromise.then(function (item) {
            savedVersion = item.__version;
            item.name = 'Hello!';
            table.update(item).then(function (items) {
                updatePromise.resolve(items);
            }, failFn)
        })

        var deletePromise = newLink();
        updatePromise.then(function (item) {
            var a1 = assert.areNotEqual(item.__version, savedVersion);
            item.name = 'But Wait!';
            correctVersion = item.__version;
            item.__version = savedVersion;
            table.del(item).then(function (item) {
                deletePromise.reject();
            }, function (error) {
                var a1 = (assert.areEqual(test, 412, error.request.status) &&
                          error.message.indexOf("Precondition Failed") > -1 &&
                          assert.areEqual(test, error.serverInstance.__version, correctVersion) &&
                          assert.areEqual(test, error.serverInstance.name, 'Hello!'));
                if (a1) {
                    item.__version = correctVersion;
                    deletePromise.resolve(item);
                }
                else {
                    deletePromise.reject();
                }

            });
        });

        deletePromise.then(function (item) {
            table.del(item).then(function () {
                done(true);
            }, failFn)
        }, function () {
            done(false);
        });
    }));

    tests.push(new zumo.Test('ReadAsyncWithValidIntIdAgainstIntIdTable', function (test, done) {
        globaldone = done;
        globalTest = test;
        var client = zumo.getClient();
        var table = client.getTable(intIdTableName);
        var emptyTablePromise = emptyTable(table);

        emptyTablePromise.then(function () {
            test.addLog('Insert record');
            var insertPromise = newLink();
            table.insert({
                name: 'Hey'
            }).then(function (item) {
                insertPromise.resolve(item);
                testId = item.id;
            }, failFn);
            return insertPromise;
        }).then(function (item) {
            var readPromise = newLink();
            table.read().then(function (item) {
                readPromise.resolve(item);
            }, failFn);
            return readPromise;
        }).then(function (items) {
            var a1 = assert.areEqual(test, 1, items.length);
            var a2 = items[0].id > 0;
            var a3 = assert.areEqual(test, 'Hey', items[0].name);
            if (a1 && a2 && a3) {
                done(true);
            }
            else {
                done(false);
            }
        });
    }));

    // BUG #1706815 (OData query for version field (string <--> byte[] mismatch)
    tests.push(new zumo.Test('AsyncTableOperationsWithAllSystemProperties', function (test, done) {
        globalTest = test;
        globaldone = done;
        var client = zumo.getClient();
        var table = client.getTable(stringIdTableName);

        var savedItem,
            savedVersion,
            savedUpdatedAt;

        table.systemProperties = WindowsAzure.MobileServiceTable.SystemProperties.All;  //All
        var emptyTablePromise = emptyTable(table);

        var insertPromise = newLink();
        emptyTablePromise.then(function () {
            table.insert({
                id: 'an id', Name: 'a value'
            }).then(function (item) {
                insertPromise.resolve(item);
            })
            return insertPromise;
        }, failFn);

        var readPromise = newLink();
        insertPromise.then(function (item) {
            if (item.__createdAt != null && item.__updatedAt != null && item.__version != null) {
                table.read().then(function (item) {
                    readPromise.resolve(item);
                }, failFn);
            }
            else {
                readPromise.reject();
            }
            return readPromise;
        }, failFn);


        var wherePromise = newLink();
        readPromise.then(function (items) {
            assert.areEqual(test, 1, items.length)
            var item = items[0];
            if (item.__createdAt != null && item.__updatedAt != null && item.__version != null) {
                savedItem = item;
            }
            else {
                wherePromise.reject;
            }
            table.where(function (value) {
                return this.__version == value
            }, item.__version).read().then(
                function (items) {
                    wherePromise.resolve(items);
                }, failFn);
            return wherePromise;
        }, failFn);

        var wherePromise2 = newLink();
        wherePromise.then(function (items) {
            assert.areEqual(test, 1, items.length)
            var item = items[0];
            if (item.__createdAt == null || item.__updatedAt == null || item.__version == null) {
                wherePromise2.reject();
            }
            table.where(function (value) {
                return this.__createdAt == value
            }, savedItem.__createdAt).read().then(
                function (items) {
                    wherePromise2.resolve(items);
                }, failFn);
            return wherePromise2;
        }, failFn);

        var wherePromise3 = newLink();
        wherePromise2.then(function (items) {
            assert.areEqual(test, 1, items.length)
            var item = items[0];
            if (item.__createdAt == null || item.__updatedAt == null || item.__version == null) {
                wherePromise3.reject();
            }
            table.where(function (value) {
                return this.__updatedAt == value
            }, savedItem.__updatedAt).read().then(
                function (items) {
                    wherePromise3.resolve(items);
                }, failFn);
            return wherePromise3;
        }, failFn);

        var lookupPromise = newLink();
        wherePromise3.then(function (items) {
            assert.areEqual(test, 1, items.length)
            var item = items[0];
            if (item.__createdAt == null || item.__updatedAt == null || item.__version == null) {
                lookupPromise.reject();
            }
            table.lookup(savedItem.id).then(function (items) {
                lookupPromise.resolve(items);
            }, failFn);
            return lookupPromise;
        }, failFn);

        var updatePromise = newLink();
        lookupPromise.then(function (item) {
            var a1 = assert.areEqual(test, item.id, savedItem.id);
            var a2 = assert.areEqual(test, item.__updatedAt.valueOf(), savedItem.__updatedAt.valueOf());
            var a3 = assert.areEqual(test, item.__createdAt.valueOf(), savedItem.__createdAt.valueOf());
            var a4 = assert.areEqual(test, item.__version, savedItem.__version);

            savedItem.name = 'Hello';
            savedVersion = savedItem.__version; //WinJS Mutates
            savedUpdatedAt = savedItem.__updatedAt.valueOf();

            if (a1 && a2 && a3 && a4) {
                table.update(savedItem).then(function (items) {
                    updatePromise.resolve(items);
                }, failFn);
            }
            else {
                updatePromise.reject();
            }
            return updatePromise;
        }, failFn);

        var readPromise2 = newLink();
        updatePromise.then(function (item) {
            var a1 = assert.areEqual(test, item.id, savedItem.id);
            var a2 = assert.areEqual(test, item.__createdAt.valueOf(), savedItem.__createdAt.valueOf());
            var a3 = assert.areNotEqual(test, item.__version, savedVersion);
            var a4 = (test, item.__updatedAt.valueOf() != savedUpdatedAt);
            savedItem = item;

            if (a1 && a2 && a3 && a4) {
                table.read().then(function (items) {
                    readPromise2.resolve(items);
                }, failFn);
            }
            else {
                readPromise2.reject();
            }

            return readPromise2;
        }, failFn);

        readPromise2.then(function (items) {
            var item = items[0];
            var a1 = assert.areEqual(test, item.id, savedItem.id);
            var a2 = assert.areEqual(test, item.__updatedAt.valueOf(), savedItem.__updatedAt.valueOf());
            var a3 = assert.areEqual(test, item.__createdAt.valueOf(), savedItem.__createdAt.valueOf());
            var a4 = assert.areEqual(test, item.__version, savedItem.__version);

            if (a1 && a2 && a3 && a4) {
                table.del(savedItem).then(
                    function () {
                        done(true);
                    },
                    function (error) {
                        done(false);
                    });
            }
            else {
                done(false);
            }
        }, failFn);

    }, [zumo.runtimeFeatureNames.NodeRuntime_Only]));

    //RDBug 1734883:SDK: JS: Account for broken client-server contract when talking to .NET based runtimes
    tests.push(new zumo.Test('AsyncTableOperationsWithSystemPropertiesSetExplicitly', function (test, done) {
        globalTest = test;
        globaldone = done;
        var client = zumo.getClient();
        var table = client.getTable(stringIdTableName),
            props = WindowsAzure.MobileServiceTable.SystemProperties;
        table.systemProperties = props.Version | props.CreatedAt | props.UpdatedAt;

        var emptyTablePromise = emptyTable(table);

        var insertPromise = newLink();
        emptyTablePromise.then(function () {
            table.insert({
                name: 'a value'
            }).then(function (item) {
                insertPromise.resolve(item);
            })
            return insertPromise;
        }, failFn);

        var insertPromise2 = newLink();
        insertPromise.then(function (item) {
            if (item.__createdAt != null && item.__updatedAt != null && item.__version != null) {
                table.systemProperties = props.Version | props.CreatedAt;
                table.insert({
                    name: 'a value'
                }).then(function (item) {
                    insertPromise2.resolve(item);
                }, failFn);
            }
            else {
                done(false);
                insertPromise2.reject();
            }
        });

        var insertPromise3 = newLink();
        insertPromise2.then(function (item) {
            if (item.__createdAt != null && item.__updatedAt == null && item.__version != null) {
                table.systemProperties = props.UpdatedAt | props.CreatedAt;
                table.insert({
                    name: 'a value'
                }).then(function (item) {
                    insertPromise3.resolve(item);
                }, failFn);
            }
            else {
                insertPromise3.reject();
            }
            return insertPromise3;
        }, failFn);

        var insertPromise4 = newLink();
        insertPromise3.then(function (item) {
            if (item.__createdAt != null && item.__updatedAt != null && item.__version == null) {
                table.systemProperties = props.UpdatedAt;
                table.insert({
                    name: 'a value'
                }).then(function (item) {
                    insertPromise4.resolve(item);
                }, failFn);
            }
            else {
                done(false);
                insertPromise4.reject();
            }
        }, failFn);

        insertPromise4.then(function (item) {
            if (item.__createdAt == null && item.__updatedAt != null && item.__version == null) {
                done(true);
            }
            else {
                done(false);
            }
        });
    }, [zumo.runtimeFeatureNames.NodeRuntime_Only]));
    return {
        name: 'MobileServiceTableGenericFunctional',
        tests: tests
    };
}
zumo.tests.tableGenericFunctional = defineTableGenericFunctionalTestsNamespace();

//assert

assert.areEqual = function (test, objectA, objectB) {
    var errors = [];
    if (!zumo.util.compare(objectA, objectB, errors)) {
        errors.forEach(function (error) {
            test.addLog(error);
        })
        return false;
    } else {
        return true;
    }
};

assert.areNotEqual = function (test, objectA, objectB) {
    var errors = [];
    if (zumo.util.compare(objectA, objectB, errors)) {
        errors.forEach(function (error) {
            test.addLog(error);
        })
        return false;
    } else {
        return true;
    }
};
function assert() {
}

testValidSystemPropertyQueryStrings = [
    "__systemProperties=*",
    "__systemProperties=__createdAt",
    "__systemProperties=__createdAt,__updatedAt",
    "__systemProperties=__createdAt,__version",
    "__systemProperties=__createdAt,__updatedAt,__version",
    "__systemProperties=__createdAt,__version,__updatedAt",
    "__systemProperties=__updatedAt",
    "__systemProperties=__updatedAt,__createdAt",
    "__systemProperties=__updatedAt,__createdAt,__version",
    "__systemProperties=__updatedAt,__version",
    "__systemProperties=__updatedAt,__version, __createdAt",
    "__systemProperties=__version",
    "__systemProperties=__version,__createdAt",
    "__systemProperties=__version,__createdAt,__updatedAt",
    "__systemProperties=__version,__updatedAt",
    "__systemProperties=__version,__updatedAt, __createdAt",

    // Trailing commas, extra commas
    "__systemProperties=__createdAt,",
    "__systemProperties=__createdAt,__updatedAt,",
    "__systemProperties=__createdAt,__updatedAt,__version,",
    "__systemProperties=,__createdAt",
    "__systemProperties=__createdAt,,__updatedAt",
    "__systemProperties=__createdAt, ,__updatedAt,__version",
    "__systemProperties=__createdAt,,",
    "__systemProperties=__createdAt, ,",

    // Trailing, leading whitespace
    "__systemProperties= *",
    "__systemProperties=\t*\t",
    "__systemProperties= __createdAt ",
    "__systemProperties=\t__createdAt,\t__updatedAt\t",
    "__systemProperties=\r__createdAt,\r__updatedAt,\t__version\r",
    "__systemProperties=\n__createdAt\n",
    "__systemProperties=__createdAt,\n__updatedAt",
    "__systemProperties=__createdAt, __updatedAt, __version",

    // Different casing
    "__SystemProperties=*",
    "__SystemProperties=__createdAt",
    "__SYSTEMPROPERTIES=__createdAt,__updatedAt",
    "__systemproperties=__createdAt,__updatedAt,__version",
    "__SystemProperties=__CreatedAt",
    "__SYSTEMPROPERTIES=__createdAt,__UPDATEDAT",
    "__systemproperties=__createdat,__UPDATEDAT,__veRsion",

    // Sans __ prefix
    "__systemProperties=createdAt",
    "__systemProperties=updatedAt,createdAt",
    "__systemProperties=UPDATEDAT,createdat",
    "__systemProperties=updatedAt,version,createdAt",

    // Combinations of above
    "__SYSTEMPROPERTIES=__createdAt, updatedat",
    "__systemProperties=__CreatedAt,,\t__VERSION",
    "__systemProperties= updatedat ,,"
];

var validStringIds = myfunction();
function myfunction() {
    // Constants
    var validStringIds = [
             "id",
             "true",
             "false",
             "00000000-0000-0000-0000-000000000000",
             "aa4da0b5-308c-4877-a5d2-03f274632636",
             "69C8BE62-A09F-4638-9A9C-6B448E9ED4E7",
             "{EC26F57E-1E65-4A90-B949-0661159D0546}",
             "87D5B05C93614F8EBFADF7BC10F7AE8C",
             "someone@someplace.com",
             "id with spaces",
             " .",
             "'id' with single quotes",
             "id with Japanese 私の車はどこですか？",
             "id with Arabic أين هو سيارتي؟",
             "id with Russian Где моя машина",
             "id with some URL significant characters % # &"
    ];
    return validStringIds;
}

emptyStringIds = [""];

testInvalidSystemPropertyQueryStrings = [
    // Unknown system Properties
    "__invalidSystemProperties=__createdAt,__version",
    "__systemProperties=__created",
    "__systemProperties=updated At",
    "__systemProperties=notASystemProperty",
    "__systemProperties=_version",

// System properties not comma separated
    "__systemProperties=__createdAt __updatedAt",
    "__systemProperties=__createdAt\t__version",
    "__systemProperties=createdAt updatedAt version",
    "__systemProperties=__createdAt__version",

// All and individual system properties requested
"__systemProperties=*,__updatedAt"
];

testSystemProperties = [
WindowsAzure.MobileServiceTable.SystemProperties.None,
WindowsAzure.MobileServiceTable.SystemProperties.All,
WindowsAzure.MobileServiceTable.SystemProperties.CreatedAt | WindowsAzure.MobileServiceTable.SystemProperties.UpdatedAt | WindowsAzure.MobileServiceTable.SystemProperties.Version,
WindowsAzure.MobileServiceTable.SystemProperties.CreatedAt | WindowsAzure.MobileServiceTable.SystemProperties.UpdatedAt,
WindowsAzure.MobileServiceTable.SystemProperties.CreatedAt | WindowsAzure.MobileServiceTable.SystemProperties.Version,
WindowsAzure.MobileServiceTable.SystemProperties.CreatedAt,
WindowsAzure.MobileServiceTable.SystemProperties.UpdatedAt | WindowsAzure.MobileServiceTable.SystemProperties.Version,
WindowsAzure.MobileServiceTable.SystemProperties.UpdatedAt,
WindowsAzure.MobileServiceTable.SystemProperties.Version
];

invalidStringIds = [
".",
"..",
"id with 256 characters " + new Array(257 - 23).join('A'),
"\r",
"\n",
"\t",
"id\twith\ttabs",
"id\rwith\rreturns",
"id\nwith\n\newline",
"id with backslash \\",
"id with forwardslash \/",
"1/8/2010 8:00:00 AM",
"\"idWithQuotes\"",
"?",
"\\",
"\/",
"`",
"+",
" ",
"control character between 0 and 31 " + String.fromCharCode(16),
"control character between 127 and 159" + String.fromCharCode(130)
];

function defineBlogTestsNamespace() {
    var tests = [];
    tests.push(new zumo.Test('UseBlog', function (test, done) {
        test.addLog('Create and manipulate posts/comments');
        var client = zumo.getClient();
        var postTable = client.getTable('blog_posts');
        var commentTable = client.getTable('blog_comments');
        var context = {};
        test.addLog('Add a few posts and a comment');
        postTable.insert({ title: "Windows 8" }).then(
            function (post) {
                context.post = post; context.newItems = 'id ge ' + '\'' + post.id + '\'';
            }, function (err) {
                test.addLog('Error' + JSON.stringify(err));
                done(false);
            }).then(function () {
                return postTable.insert({ title: "ZUMO" })
            }, function (err) {
                test.addLog('Error' + JSON.stringify(err));
                done(false);
            }).then(function (highlight) {
                context.highlight = highlight;
                return commentTable.insert({ postid: context.post.id, name: "Anonymous", commentText: "Beta runs great" })
            }, function (err) {
                test.addLog('Error' + JSON.stringify(err));
                done(false);
            }).then(function () {
                return commentTable.insert({ postid: context.highlight.id, name: "Anonymous", commentText: "Whooooo" })
            }, function (err) {
                test.addLog('Error' + JSON.stringify(err));
                done(false);
            }).then(function () {
                return postTable.where('id eq ' + '\'' + context.post.id + '\' or id eq ' + '\'' + context.highlight.id + '\'').read()
            }, function (err) {
                test.addLog('Error' + JSON.stringify(err));
                done(false);
            }).then(function (items) {
                if (!assert.areEqual(test, 2, items.length)) {
                    done(false);
                }
                else {
                    test.addLog('Add another comment to the first post');
                    return commentTable.insert({ postid: context.post.id, commentText: "Can't wait" })
                }
            }, function (err) {
                test.addLog('Error' + JSON.stringify(err));
                done(false);
            }).then(function (opinion) {
                assert.areNotEqual(test, 0, opinion.id);
                done(true);
            }, function (err) {
                test.addLog('Error' + JSON.stringify(err));
                done(false);
            })
    }))
    return {
        name: 'Blog',
        tests: tests
    };
}

zumo.tests.blog = defineBlogTestsNamespace();