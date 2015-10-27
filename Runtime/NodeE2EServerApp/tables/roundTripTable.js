var roundTrip = module.exports = require('azure-mobile-apps').table();

roundTrip.update(function (context) {
    return context.execute()
        .catch(function (error) {
            if(context.req.query.conflictPolicy === 'clientWins') {
                context.item.__version = error.item.__version;
                return context.execute();
            } else if (context.req.query.conflictPolicy === 'serverWins') {
                return error.item;
            } else {
                throw error;
            }
        });
});
roundTrip.columns = { name: 'string', date1: 'date', bool: 'boolean', integer: 'number', number: 'number' };
