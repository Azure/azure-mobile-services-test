function createStorageNamespace() {

    // intialize configuration
    var config = parseQuery(window.location.search.substr(1));
    var platform = "HTML-Javascript";
    var containerName = "javascript";

    function setConfig(str) {
        config = parseQuery(str);
        storage.config = config;
        platform = "WinStore-WinJS";
        containerName = "winjs";
    }

    function parseRunResult(testGroup, testGroupMap) {
        var result = [];
        for (var i = 0; i < testGroup.tests.length; i++) {
            var testObj = testGroup.tests[i];
            var test = {
                full_name: testObj.name,
                source: testGroupMap[testObj.name] === undefined ? "Setup" : testGroupMap[testObj.name].replace(/\s/g, '_'),
                outcome: statusToOutcome(testObj.status),
                start_time: getFileTime(Date.parse(testObj.startTime)),
                end_time: getFileTime(Date.parse(testObj.endTime)),
                reference_url: testObj.filename
            }
            result.push(test);
        }
        return result;
    }

    function createMasterRunResult(testGrp, runId, fileName) {
        var testResult = getStatusCount(testGrp);
        var test = {
            full_name: config.runtime + "-" + platform,
            outcome: testGrp.failedTestCount == 0 ? statusToOutcome(0) : statusToOutcome(1),
            start_time: getFileTime(Date.parse(testGrp.startTime)),
            end_time: getFileTime(Date.parse(testGrp.endTime)),
            reference_url: fileName,
            passed: testResult.passedCount.toString(),
            failed: testResult.failedCount.toString(),
            skipped: testResult.skippedCount.toString(),
            total_count: (testGrp.tests.length).toString(),
        }
        return test;
    }


    function getStatusCount(testGroup) {
        var passed = 0;
        var failed = 0;
        var skipped = 0;
        for (var i = 0; i < testGroup.tests.length; i++) {
            var testObj = testGroup.tests[i];
            switch (testObj.status) {
                case 0:
                    passed++;
                    break;
                case 1:
                    failed++;
                    break;
                default:
                    skipped++;
            }
        }
        return { passedCount: passed, failedCount: failed, skippedCount: skipped };
    }

    function uploadBlob(containerUrl, tests) {
        var uploadPromises = [];
        for (var i = 0; i < tests.length; i++) {
            var blobName = getGuid() + ".txt";

            var requestUrl = containerUrl + containerName + "/" + blobName + "?" + config.accessToken;
            tests[i].filename = containerName + "/" + blobName;
            var promise = putBlob(requestUrl, tests[i].logs);
            uploadPromises.push(promise);
        }
        $.when.apply($, uploadPromises);
    }

    function putBlob(requestUrl, log) {
        var deferred = $.Deferred();
        var xhr = new XMLHttpRequest();
        xhr.open('PUT', requestUrl);
        xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
        xhr.addEventListener('load', function () {
            if (xhr.status === 200) {
                deferred.resolve(xhr.response);
            } else {
                deferred.reject("HTTP error: " + xhr.status);
            }
        }, false)
        xhr.send(log);
        return deferred.promise();
    }

    function postResult(blobUrl, testResultArray) {
        var def;
        def = $.Deferred();
        var xhr = new XMLHttpRequest();
        var requestUrl = blobUrl + "?" + config.accessToken;
        xhr.open('PUT', requestUrl);
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

    function ReportResults(testResultsGroup, index) {
        var testGrp = testResultsGroup[index];
        var testCount = testGrp.tests.length;
        var startTime = Date.parse(testGrp.startTime);        
        var testGroupMap = groupTestMapping(testResultsGroup);
        var rootContainerUrl = config.containerUrl;

        // upload individual log files
        uploadBlob(config.containerUrl, testGrp.tests);

        var masterResultBlobUrl = rootContainerUrl + platform + "-master.json?" + config.accessToken;

        //Post result for master test run                

        detailFileName = platform + "-detail.json"
        var masterRunResult = createMasterRunResult(testGrp, config.masterRunId, detailFileName);
        var masterJsonStr = JSON.stringify(masterRunResult);
        var allPromises = []

        var masterResultPromise = putBlob(masterResultBlobUrl, masterJsonStr);
        allPromises.push(masterResultPromise);

        ////post test results
        var result = parseRunResult(testResultsGroup[index], testGroupMap);

        var masterResultBlobUrl = rootContainerUrl + detailFileName + "?" + config.accessToken;
        suiteJsonStr = JSON.stringify(result);
        var suiteResultPormise = putBlob(masterResultBlobUrl, suiteJsonStr)
        allPromises.push(suiteResultPormise);
        $.when.apply($, allPromises);

        setTimeout(closeBrowserWindow, 5000);
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
        var query = {};
        var keyPair = qstr.split('&');
        for (var i in keyPair) {
            var qParam = keyPair[i].split('=');
            if (qParam[0] == "accessToken") {
                qParam[1] = atob(qParam[1])
            }
            query[qParam[0]] = qParam[1];
        }
        return query;
    }
    function getGuid() {
        var pad4 = function (str) { return "0000".substring(str.length) + str; };
        var hex4 = function () { return pad4(Math.floor(Math.random() * 0x10000 /* 65536 */).toString(16)); };

        return (hex4() + hex4() + "-" + hex4() + "-" + hex4() + "-" + hex4() + "-" + hex4() + hex4() + hex4());
    }
    return {
        ReportResults: ReportResults,
        config: config,
        setConfig: setConfig
    };
}

storage = createStorageNamespace();