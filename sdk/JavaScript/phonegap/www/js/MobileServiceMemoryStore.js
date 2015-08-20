// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

zumo.tests.MobileServiceMemoryStore = function () {
    /// <summary>
    /// Initializes a new instance of the MobileServiceMemoryStore class.
    /// </summary>

    var idProperty = "id";
    var tables = {};

    this.upsert = function (tableName, instance) {

        var deferred = $.Deferred();

        setTimeout(function () {

            var table = tables[tableName] = tables[tableName] || {};

            var instanceId = instance[idProperty];

            // Make a deep copy of the object before inserting it. 
            // We don't want future changes to the object to directly update our table data.
            var newObject = JSON.parse(JSON.stringify(instance));
            table[instanceId] = newObject;

            // notify completion
            deferred.resolve();
        }, 0);

        return deferred.promise();
    };

    this.lookup = function (tableName, id) {

        var deferred = $.Deferred();

        setTimeout(function () {
            var table = tables[tableName];

            if (table === undefined) {
                deferred.reject("Undefined table");
            }

            // notify completion
            deferred.resolve(table[id]);
        }, 0);

        return deferred.promise();
    };
};
