exports.get = function(request, response) {
	response.send(statusCodes.OK, {
		runtime: { type: 'node.js', version: process.version },
		features: {
			intIdTables: true,
			stringIdTables: true,
			nhPushEnabled: !!(request.service.push.send),
			queryExpandSupport: false,
			userEnabled: /\"users\"/i.test(process.env.MS_PreviewFeatures),
			liveSDKLogin: true,
			azureActiveDirectoryLogin: true,
			singleSignOnLogin: true,
			stringReplace: true,
            nodeRuntimeOnly: true,
            dotNetRuntimeOnly: false
		}
	});
};