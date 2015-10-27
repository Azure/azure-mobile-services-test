var parameterTest = module.exports = require('azure-mobile-apps').table();

parameterTest.autoIncrement = true;
parameterTest.read(function (context) {
    // read operations expect to return an array... this could be improved
    return [mapParameters(context)];
});
parameterTest.insert(mapParameters);
parameterTest.update(mapParameters);
parameterTest.delete(mapParameters);

function mapParameters(context) {
    var id = parseInt(context.id || context.req.query.id || '1');
    return {
        id: id,
        parameters: JSON.stringify(context.req.query)
    };
}
