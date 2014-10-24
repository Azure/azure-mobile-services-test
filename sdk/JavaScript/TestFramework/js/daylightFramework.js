function createDayLightNamespace() {

    // intialize configuration
    var dayLightConfig = parseQuery(window.location.search.substr(1));
    var platform = "HTML-Javascript|sdk v1.2.5|";

    function setConfig(str) {
        dayLightConfig = parseQuery(str);
        dayLight.dayLightConfig = dayLightConfig;
        platform = "Win8 Store-WinJS|sdk v1.2.5|";
    }
    // Request Functions
    function getAuthHeader() {
        var results, def;
        def = $.Deferred();
        var daylightUrl = dayLightConfig.daylightUrl;
        var xhr = new XMLHttpRequest();
        xhr.open('POST', daylightUrl + "/oauth2/token");
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status === 200) {
                results = JSON.parse(xhr.responseText);
                def.resolve(results);
            } else if (xhr.readyState == 4) {
                def.reject();
            }
        }
        xhr.onerror = function (e) {
            def.reject();
        };
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.send('grant_type=client_credentials&client_id=' + dayLightConfig.clientId + '&client_secret=' + dayLightConfig.clientSecret);
        return def.promise();
    }

    function createRun(authResponse, testRun) {
        var results, def;
        def = $.Deferred();
        var daylightUrl = dayLightConfig.daylightUrl;
        var jtoken = authResponse.access_token;
        var jsonStr = JSON.stringify(testRun);
        var xhr = new XMLHttpRequest();
        var requestUrl = daylightUrl + "/api/zumo2/runs?access_token=" + jtoken;
        xhr.open('POST', requestUrl);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status === 201) {
                results = JSON.parse(xhr.responseText);
                results.access_token = jtoken;
                def.resolve(results);
            } else if (xhr.readyState == 4) {
                def.reject();
            }
        };
        xhr.onerror = function (e) {
            def.reject();
        };
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.send(jsonStr);
        return def.promise();
    }

    function parseRunResult(runId, testGroup, testGroupMap) {
        var result = [];
        for (var i = 0; i < testGroup.tests.length; i++) {
            var testObj = testGroup.tests[i];
            var attach = {
                "logs.txt": testObj.filename
            };
            var test = {
                adapter: "zumotestsconverter",
                name: testObj.name,
                full_name: testObj.name,
                source: testGroupMap[testObj.name] === undefined ? "Setup" : testGroupMap[testObj.name].replace(/\s/g, '_'),
                run_id: runId,
                outcome: statusToOutcome(testObj.status),
                start_time: getFileTime(Date.parse(testObj.startTime)),
                end_time: getFileTime(Date.parse(testObj.endTime)),
                tags: [platform],
                attachments: attach
            }
            result.push(test);
        }
        return result;
    }

    function createMasterRunResult(testGrp, runId, fileName) {
        var result = [];
        var attach = {
            "logs.txt": fileName
        };
        var test = {
            adapter: "zumotestsconverter",
            name: platform + dayLightConfig.runtime,
            full_name: platform + dayLightConfig.runtime,
            source: "Javascript",
            run_id: runId,
            outcome: testGrp.failedTestCount == 0 ? statusToOutcome(0) : statusToOutcome(1),
            start_time: getFileTime(Date.parse(testGrp.startTime)),
            end_time: getFileTime(Date.parse(testGrp.endTime)),
            tags: [platform],
            attachments: attach,
        }
        result.push(test);
        return result;
    }

    function requestBlobAccess(runResponse) {
        var results, def;
        def = $.Deferred();
        var body = 'grant_type=urn%3Adaylight%3Aoauth2%3Ashared-access-signature&permissions=rwdl&scope=attachments';
        var xhr = new XMLHttpRequest();
        var requestUrl = dayLightConfig.daylightUrl + "/api/zumo2/storageaccounts/token?access_token=" + runResponse.access_token;
        xhr.open('POST', requestUrl);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status === 201) {
                results = JSON.parse(xhr.responseText);
                results.token = runResponse.access_token;
                results.runId = runResponse.run_id;
                def.resolve(results);
            } else if (xhr.readyState == 4) {
                def.reject();
            }
        };
        xhr.onerror = function (e) {
            def.reject();
        };
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send(body);
        return def.promise();
    }

    function uploadBlob(tests, blobAccessToken) {
        var urlBlob = "https://daylight.blob.core.windows.net/attachments";
        var jtoken = blobAccessToken.access_token;
        var xhr = new XMLHttpRequest();
        for (var i = 0; i < tests.length; i++) {
            var blobName = getGuid();
            var requestUrl = urlBlob + "/" + blobName + "?" + jtoken;
            tests[i].filename = blobName;
            xhr.open('PUT', requestUrl);
            xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
            xhr.send(tests[i].logs);
        }
        return;
    }

    function createMasterTestLog(testGrp, runId) {
        var testLogs = [];
        testLogs.push("TestRun:" + dayLightConfig.daylightUrl + "/" + dayLightConfig.dayLightProject + "/runs/" + runId);
        testLogs.push("Passed:" + (testGrp.tests.length - (testGrp.failedTestCount + testGrp.skippedCount)).toString());
        testLogs.push("Failed:" + testGrp.failedTestCount.toString());
        testLogs.push("Skipped:" + testGrp.skippedCount.toString());
        testLogs.push("TestCount:" + (testGrp.tests.length).toString());
        var test = {
            logs: testLogs
        };
        return [test];
    }

    function postResult(jtoken, testResultArray) {
        var def;
        def = $.Deferred();
        var jsonStr = JSON.stringify(testResultArray);
        var xhr = new XMLHttpRequest();
        var requestUrl = dayLightConfig.daylightUrl + "/api/zumo2/results?access_token=" + jtoken;
        xhr.open('POST', requestUrl);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status === 200) {
                def.resolve();
            } else if (xhr.readyState == 4) {
                def.reject();
            }
        };
        xhr.onerror = function (e) {
            def.reject();
        };
        xhr.send(jsonStr);
        return def.promise();
    }

    function closeBrowserWindow() {
        window.open('', '_parent', '');
        window.close();
    }

    function reportResults(testResultsGroup, index) {
        var testGrp = testResultsGroup[index];
        var testCount = testGrp.tests.length;
        var startTime = Date.parse(testGrp.startTime);
        var testRun = initializeRun(testCount, startTime);
        var testGroupMap = groupTestMapping(testResultsGroup);
        getAuthHeader().then(
            function (authResponse) {
                return createRun(authResponse, testRun);
            }, closeBrowserWindow).then(
            function (runResponse) {
                return requestBlobAccess(runResponse);
            }, closeBrowserWindow).then(
            function (blobAccessToken) {
                uploadBlob(testGrp.tests, blobAccessToken);

                // Upload master test log
                var mastertests = createMasterTestLog(testGrp, blobAccessToken.runId);
                uploadBlob(mastertests, blobAccessToken);

                //Post result for master test run                
                var masterRunResult = createMasterRunResult(testGrp, dayLightConfig.masterRunId, mastertests[0].filename);
                postResult(blobAccessToken.token, masterRunResult);

                ////post test results
                var result = parseRunResult(blobAccessToken.runId, testResultsGroup[index], testGroupMap);
                return postResult(blobAccessToken.token, result);
            }, closeBrowserWindow).then(
            function () {
                setTimeout(closeBrowserWindow, 5000);                
            });
    }

    //helper Functions
    function dateToString(date) {
        /// <param name="date" type="Date">The date to convert to string</param>

        function padLeft0(number, size) {
            number = number.toString();
            while (number.length < size) number = '0' + number;
            return number;
        }

        date = date || new Date(Date.UTC(1900, 0, 1, 0, 0, 0, 0));

        var result =
            padLeft0(date.getUTCFullYear(), 4) + '-' +
            padLeft0(date.getUTCMonth() + 1, 2) + '-' +
            padLeft0(date.getUTCDate(), 2) + ' ' +
            padLeft0(date.getUTCHours(), 2) + ':' +
            padLeft0(date.getUTCMinutes(), 2) + ':' +
            padLeft0(date.getUTCSeconds(), 2) + '.' +
            padLeft0(date.getUTCMilliseconds(), 3);

        return result;
    }
    function getFileTime(timeInMilliseconds) {
        // Time in interval of 100 nano seconds from 1-1-1601 A.D to 1-1-1970 A.D
        var baseDate = 116444736000000000;
        return baseDate + (timeInMilliseconds * 10000);
    }
    function initializeRun(testCount, startTime) {
        var versionSpec = {
            project_name: dayLightConfig.dayLightProject,
            branch_name: dayLightConfig.runtime,
            revision: "20140729-002505"
        };
        return {
            name: platform + dayLightConfig.runtime,
            start_time: getFileTime(startTime),
            version_spec: versionSpec,
            tags: platform,
            test_count: testCount
        };
    }
    function groupTestMapping(testGroups) {
        var testGrpMap = {};
        for (var i = 0; i < testGroups.length; i++) {
            for (var j = 0; j < testGroups[i].tests.length; j++) {
                if (testGroups[i].name.indexOf("All tests") < 0)
                    testGrpMap[testGroups[i].tests[j].name] = testGroups[i].name;
            }
        }
        return testGrpMap;
    }
    function statusToOutcome(status) {
        switch (status) {
            case 0:
                return "Passed";
            case 1:
                return 'Failed';
            default:
                return 'Skipped';
        }
    }

    function parseQuery(qstr) {
        if (qstr == "")
            return;
        qstr = decodeURIComponent(qstr);
        var query = {};
        var keyPair = qstr.split('&');
        for (var i in keyPair) {
            var qParam = keyPair[i].split('=');
            query[decodeURIComponent(qParam[0])] = decodeURIComponent(qParam[1]);
        }
        return query;
    }
    function getGuid() {
        var pad4 = function (str) { return "0000".substring(str.length) + str; };
        var hex4 = function () { return pad4(Math.floor(Math.random() * 0x10000 /* 65536 */).toString(16)); };

        return (hex4() + hex4() + "-" + hex4() + "-" + hex4() + "-" + hex4() + "-" + hex4() + hex4() + hex4());
    }
    return {
        ReportResultsToDaylight: reportResults,
        dayLightConfig: dayLightConfig,
        setConfig: setConfig
    };
}

dayLight = createDayLightNamespace();