var mobileServiceUrl = '--APPLICATION_URL--';
var mobileServiceKey = '--APPLICATION_KEY--';
var tagExpression    = '--TAG_EXPRESSION--';
var daylightUrl      = '--DAYLIGHT_URL--';
var daylightProject  = '--DAYLIGHT_PROJECT--';
var clientId         = '--CLIENT_ID--';
var clientSecret     = '--CLIENT_SECRET--';
var runId            = '--RUN_ID--';
var runtimeVersion   = '--RUNTIME_VERSION--';

var target = UIATarget.localTarget();
var app = target.frontMostApp();
var window = app.mainWindow();
var tableView = window.tableViews()[0];

var done = false;

function setMobileService() {
  var values = {
    MobileServiceUri: mobileServiceUrl,
    MobileServiceKey: mobileServiceKey,
    Tags: tagExpression,
    DaylightUri: daylightUrl,
    DaylightProject: daylightProject,
    ClientId: clientId,
    ClientSecret: clientSecret,
    RunId: runId,
    RuntimeVersion: runtimeVersion
  };

  for (var key in values) {
    if (values.hasOwnProperty(key)) {
      var cell = tableView.cells()[key];
      var textField = cell.textFields()[key];

      textField.setValue(values[key]);
    }
  }
}

function startTests() {
  UIALogger.logStart('Unattended tests');
  
  var button = tableView.cells()['RunTests'];
  button.tap();
};

function waitForDone() {
  var pollInterval = 5;
  var counter = 0;
  while (done !== true && counter < 900) {
    UIALogger.logMessage('Waiting for tests to complete (' + counter + ')...');
    target.delay(pollInterval);
    counter += pollInterval;
  }
}

UIATarget.onAlert = function(alert) {
  var title = alert.name();	
  UIALogger.logDebug("Alert with title: '" + title + "'");

  done = true;
  if (title == 'Tests Complete') {
    UIALogger.logPass('Unattended tests');
  } else {
    UIALogger.logFail('Unattended tests');
  }

  return false;
}

setMobileService();

startTests();

waitForDone();
