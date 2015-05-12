var MICROSOFT = 'microsoft';
var FACEBOOK = 'facebook';
var TWITTER = 'twitter';
var GOOGLE = 'google';
var AAD = 'aad';

var userNames = {};
userNames[MICROSOFT] = 'zumotestuser@hotmail.com';
userNames[FACEBOOK] = 'zumotestuser@hotmail.com';
userNames[TWITTER] = 'zumotestuser';
userNames[GOOGLE] = 'zumotestuser@hotmail.com';
userNames[AAD] = 'zumotestuser@zumoe2e.onmicrosoft.com';

var password = '--AUTH_PASSWORD--';

var mobileServiceName = '--APPLICATION_URL--';
var mobileServiceKey = '--APPLICATION_KEY--';
var clientId = '--CLIENT_ID--';
var clientSecret = '--CLIENT_SECRET--';
var runId = '--RUN_ID--';

var target = UIATarget.localTarget();
var app = target.frontMostApp();
var window = app.mainWindow();

var done = false;

UIATarget.onAlert = function(alert) {
	var title = alert.name();	
	UIALogger.logDebug("Alert with title: '" + title + "'");

	done = true;
	if (title == 'Tests Complete') {
		UIALogger.logPass('All tests');
	} else {
		UIALogger.logFail('All tests');
	}

	return false;
}

setMobileService(app, window, mobileServiceName, mobileServiceKey);

startTests();

while (!done) {
	try {
		var provider = isLoginPage();
		if (provider) {
			UIALogger.logMessage('Performing log in for \'' + provider + '\'');
			var userName = userNames[provider];
			doLogin(target, app, userName, password, provider);
		}
	
		UIALogger.logMessage('Waiting for login or done');
		target.delay(3);
	} catch (ex) {
		UIALogger.logMessage('Error: ' + ex);
		UIATarget.localTarget().logElementTree();
		throw ex;
	}
}

backToStart();

function setMobileService(app, window, appUrl, appKey) {
	var values = {
		MobileServiceURL: appUrl,
		MobileServiceKey: appKey,
		ClientId: clientId,
		ClientSecret: clientSecret,
		RunId: runId
	};

	for (var key in values) {
		if (values.hasOwnProperty(key)) {
			var textField = window.textFields()[key];
			if (textField.isValid()) {
				textField.setValue(values[key]);
			}
			app.keyboard().typeString("\n");	
		}	
	}
	
	// Start testing the application
	window.buttons()["BeginTesting"].tap();
}

function startTests() {
	UIATarget.localTarget().pushTimeout(300);

	var testGroups = window.tableViews()[0].cells();
	var lastTestGroup = testGroups.length - 1;
	testGroups[lastTestGroup].tap();

	UIATarget.localTarget().popTimeout();
	UIALogger.logStart('All tests');
}

function backToStart() {
	app.navigationBar().leftButton().tap();
}

function getWebView() {
	return window.scrollViews()[0].webViews()[0];
}

function isLoginPage() {
	var webView = getWebView();
	if (!webView.isValid()) {
		return null;
	}
	
	var alltags = webView.staticTexts();

	if (alltags.withPredicate('name contains "Facebook"').length > 0) {
		return FACEBOOK;
	}
	
	if (alltags.withPredicate('name contains "work"').length > 0) {
		return AAD;
	}

	if (alltags.withPredicate('name contains "Microsoft"').length > 0) {
		return MICROSOFT;
	}

	if (alltags.withPredicate('name contains "Twitter"').length > 0) {
		return TWITTER;
	}

	if (alltags.withPredicate('name contains "Google"').length > 0) {
			return GOOGLE;
	}
	
	return null;
}

function doLogin(target, app, userName, password, provider) {
	var webView = getWebView();
	var userTextField = webView.textFields()[0];
	userTextField.tap();
	target.delay(1);
	if (!userTextField.hasKeyboardFocus()) {
		userTextField.tap();
		target.delay(1);
	}
	app.keyboard().typeString(userName);
	target.delay(3);
	
	var passwordTextField = webView.secureTextFields()[0];
	passwordTextField.tap();
	target.delay(1);
	if (!passwordTextField.hasKeyboardFocus()) {
		passwordTextField.tap();
		target.delay(1);
	}
	app.keyboard().typeString(password);

	target.delay(3);
	var btnLogin = webView.buttons()[0];
	btnLogin.tap();
	target.delay(1);
}
