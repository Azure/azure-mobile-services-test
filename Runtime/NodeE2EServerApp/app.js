// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------
var path = require('path'),
    app = require('express')(),
    mobileApps = require('azure-mobile-apps'),
    configuration = require('azure-mobile-apps/src/configuration'),
    log = require('azure-mobile-apps/src/logger'),
    config = configuration.fromEnvironment(configuration.fromFile(path.join(__dirname, 'config.js'))),
    mobileApp;

config.pageSize = 1000;
config.logging = { level: 'silly' };
config.auth = { secret: 'secret' };
config.notifications = { hubName: 'daend2end-hub', connectionString: 'Endpoint=sb://daend2end-namespace.servicebus.windows.net/;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=739+sRJUNuMj/5l3vt/Fir0tHvaV1K0N+n+TtDgRy/Y=' };

mobileApp = mobileApps(config);

// tables
mobileApp.tables.add('authenticated', { authorize: true });
mobileApp.tables.add('blog_comments', { columns: { postId: 'string', commentText: 'string', name: 'string', test: 'number' } });
mobileApp.tables.add('blog_posts', { columns: { title: 'string', commentCount: 'number', showComments: 'boolean', data: 'string' } });
mobileApp.tables.add('dates', { columns: { date: 'date', dateOffset: 'date' } });
mobileApp.tables.add('intIdRoundTripTable', { autoIncrement: true, columns: { name: 'string', date1: 'date', bool: 'boolean', integer: 'number', number: 'number' } });
mobileApp.tables.add('offlineReady');
mobileApp.tables.add('offlineReadyNoVersionAuthenticated', { authorize: true });
mobileApp.tables.import('tables');

app.use(mobileApp);

// custom APIs
app.get('/api/jwtTokenGenerator', require('./api/jwtTokenGenerator')(config));
app.get('/api/runtimeInfo', require('./api/runtimeInfo'));
require('./api/applicationPermission').register(app);
require('./api/movieFinder').register(app);
require('./api/push').register(app);

return mobileApp.tables.initialize().then(function () {
    var port = process.env.PORT || 3000;
    app.listen(port);
    log.info('Listening on ' + port)
});
