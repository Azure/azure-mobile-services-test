var argv      = require('optimist').argv,
    archiver  = require('archiver'),
    async     = require('async'),
    colors    = require('colors'),
    fse       = require('fs-extra'),
    git       = require('gift'),
    nconf     = require('nconf'),
    request   = require('request'),
    scripty   = require('azure-scripty'),
    tmpDirs   = require('tmp'),
    validator = require('validator');

var state = {};
var NumRetries = 3;
var defaultPingDelay = 8500;
// Notification hub takes a very long time to activate, Hence a long delay
var defaultPushSetUpDelay = 180000;

function run(callback) {
  async.series([
    read_config,
    read_existing_apps,
    make_app
  ], callback);
}

function usage() {
  console.log('Usage: node e2esetup [options] jsonOptions');
  console.log("   options:");
  console.log("      --name               app name");
  console.log("      --useExistingApp     Whether to re-use an existing app instead of recreating it each time: 'true' or 'false' (default is 'false' if not specified)");
  console.log("      --platform           app platform (DotNet / Node)");
  console.log("      --location           app location (e.g. West US)");
  console.log("      --sql:server         SQL server name");
  console.log("      --sql:db             database name");
  console.log("      --sql:user           database username");
  console.log("      --sql:password       database password");
  console.log("      --appKey             application key");
  console.log("      --corsWhitelist      CORS whitelist (e.g. 'ms-appx-web://10805zumoTestUser.zumotestblu2' or '10805zumoTestUser.zumotestblu2')");
  console.log("      --srcFiles           Optional path to the runtime user source files (these are pushed through Git)");
  console.log("      --binFiles           Optional path to the runtime user binary files (these are uploaded through Kudu at /site/wwwroot)");
  console.log("      --configFile:        JSON file with additional configs for a Node app. See the provided templates.");
  console.log("      --tier:              The tier level for the app i.e Free, basic or standard");
  console.log("      --pingEndpoint:      Endpoint to ping (GET) after app is created (e.g. 'status' or 'tables/movies')");
  console.log("      --pingDelay:         Time (in milliseconds) to wait before pinging the pingEndpoint (default: " + defaultPingDelay + ")");
  console.log("      --pushSetupDelay:    Time (in milliseconds) to wait before configuring push settings(default: " + defaultPushSetUpDelay + ")");
  console.log("      --siteExtensionPath  ");
  console.log();
  console.log("   jsonOptions:");
  console.log("      JSON file with configuration settings as specified above. See the supplied templates.");
  console.log("      Values specified in the command line take precedence.");
  console.log();
}

function read_config(callback) {
  if (argv._.length != 1) {
    // Should have only one free argument, which is the config file name
    usage();
    return callback('Invalid input.');
  }
  var configFile = argv._[0];
  process.stdout.write('Reading config...');
  nconf.argv().file({
    file: configFile
  });

  console.log(' OK'.green.bold);
  callback();
}

function read_existing_apps(callback) {
  process.stdout.write('Reading existing apps...');
  scripty.invoke('mobile list', function (err, results) {
    if (!err) {
      state.existingApps = results;
      process.stdout.write(' OK'.green.bold + '\n');
      process.stdout.write('   Found ' + state.existingApps.length + ' apps:\n');
      state.existingApps.forEach(function (a) {
        process.stdout.write('      ' + a.name + '\n');
      });
      process.stdout.write('\n');
    }
    callback(err);
  });
}

function make_app(callback) {
  console.log('');
  console.log('======== Processing app: '.white.bold + nconf.get('name') + ' ========');

  async.series(
    [
      function (done) {
        var existingApp = null;
        var appName = nconf.get('name');
        state.existingApps.forEach(function (i) {
          if (i.name.toLowerCase() == appName.toLowerCase()) {
            existingApp = i;
          }
        });
        if (existingApp) {
          var useExistingApp = (nconf.get('useExistingApp') || 'false').toLowerCase();
          if (useExistingApp == 'false') {
            console.log('   App already exists. Deleting and recreating it...');
            async.series([
              delete_app,
              create_app
            ], done);
          } else if (useExistingApp == 'true') {
            console.log('   App already exists and will be re-used...');
            done();
          } else {
            done('Configuration value "useExistingApp" must be "true" or "false" (default).');
          }
        } else {
          console.log('   App does not currently exist and will be created');
          create_app(done);
        }
      },
      scale_app,
      setup_app
    ], callback);
}

function delete_app(callback) {
  process.stdout.write('   Deleting existing app...');
  scripty.invoke('mobile delete --deleteData --deleteNotificationHubNamespace --quiet ' + nconf.get('name'), function (err, results) {
    if (!err) {
      process.stdout.write(' OK'.green.bold + '\n');
    }
    callback(err);
  });
}

function create_app(callback) {
  process.stdout.write('   Creating new app...');

  var cmd = {
    command: 'mobile create -p nh',
    sqlServer: nconf.get('sql:server'),
    sqlDb: nconf.get('sql:db'),
    location: '"' + nconf.get('location') + '"',
    backend: nconf.get('platform'),
    positional: [nconf.get('name'), nconf.get('sql:user'), nconf.get('sql:password')]
  };
  scripty.invoke(cmd, function (err, results) {
    if (!err) {
      console.log(' OK'.green.bold);
    }
    callback(err);
  });
}


function scale_app(callback) {
  var tier = (nconf.get('tier') || 'free').toLowerCase();
  if (tier == 'free') {
    return callback();
  }
  process.stdout.write('   Scaling the app to \'' + tier + '\' tier...');
  scripty.invoke('mobile scale change --tier ' + nconf.get('tier') + ' ' + nconf.get('name'), function (err, results) {
    if (!err) {
      console.log(' OK'.green.bold);
    }
    callback(err);
  });
}

function setup_app(callback) {
  async.series([
    // Common setup
    setup_app_keys,
    setup_cors,
    setup_auth_AllProviders,

    // Platform-specific setup
    function (done) {
      var lower = nconf.get('platform').toLowerCase();
      if (lower == 'node') {
        setup_node_app(done);
      } else if (lower == 'dotnet') {
        setup_dotnet_app(done);
      } else {
        done('Invalid app platform in config file: ' + lower + '\n');
      }
    },

	// Wait some time before configuring push settings	
    function (done) {
      var pushSetUpDelay = nconf.get('pushSetUpDelay') || defaultPushSetUpDelay;
      process.stdout.write('   Waiting ' + pushSetUpDelay + ' ms configuring push settings...');
      setTimeout(function () {
        console.log(' OK'.green.bold);
        done();
      }, pushSetUpDelay);
    },	
    setup_push,

    // Wait some time before pinging the site
    function (done) {
      var pingDelay = nconf.get('pingDelay') || defaultPingDelay;
      process.stdout.write('   Waiting ' + pingDelay + ' ms before pinging the app...');
      setTimeout(function () {
        console.log(' OK'.green.bold);
        done();
      }, pingDelay);
    },

    // Ping the app
    function (done) {
      process.stdout.write('   Pinging ' + state.appPingUri + '...');
      request.get({
          uri: state.appPingUri,
          timeout: 60 * 1000,
          headers: {
            'x-zumo-application': nconf.get('appKey') || ''
          }
        },
        function (err, resp, body) {
          if (!err) {
            if (resp.statusCode == 200) {
              console.log(' OK'.green.bold);
            } else {
              console.log(' Err: '.red.bold + resp.statusCode + '\n' + body);
              err = 'endpoint returned ' + resp.statusCode;
            }
          }
          done(err);
        });
    },

    // Done
    function (done) {
      console.log('   Done!'.green.bold);
      done();
    }
  ], callback);
}

function setup_app_keys(callback) {
  var appKey = nconf.get('appKey');
  if (!appKey) {
    return callback();
  }
  process.stdout.write('   Setting AppKey...');
  scripty.invoke('mobile key set ' + nconf.get('name') + ' application ' + appKey, function (err, results) {
    if (!err) {
      console.log(' OK'.green.bold);
    }
    callback(err);
  });
}

function setup_cors(callback) {
  var corsWhitelist = nconf.get('corsWhitelist');
  if (!corsWhitelist) {
    return callback();
  }
  process.stdout.write('   Setting up CORS (' + corsWhitelist + ')...');
  scripty.invoke('mobile config set ' + nconf.get('name') + ' crossDomainWhitelist ' + corsWhitelist, function (err, results) {
    if (!err) {
      console.log(' OK'.green.bold);
    }
    callback(err);
  });
}

function setup_push(callback) {
  var indent = '   ';
  process.stdout.write(indent + 'Configuring Push...');
  async.series([
    function (done) {
      var gcmApiKey = nconf.get('push:gcm:apiKey');
      if (gcmApiKey && gcmApiKey != "") {
        invoke_scripty(indent, 'mobile push gcm set ' + nconf.get('name') + ' ' + gcmApiKey, done);
      } else {
        done();
      }
    },

    function (done) {
      var apnsMode = nconf.get('push:apns:mode');
      var apnsCertPath = nconf.get('push:apns:certPath');
      var apnsCertPassword = nconf.get('push:apns:certPassword') || '';

      if (apnsMode && apnsMode != "" && apnsCertPath && apnsCertPath != "" && apnsCertPassword && apnsCertPassword != "") {
        var cmd = 'mobile push apns set ' + nconf.get('name') + ' ' + apnsMode + ' ' + apnsCertPath;
        if (apnsCertPassword) {
          cmd = cmd + ' -p ' + apnsCertPassword;
        }

        invoke_scripty(indent, cmd, done);
      } else {
        done();
      }
    },

    function (done) {
      var mpnsCertPath = nconf.get('push:mpns:certPath');
      var mpnsCertPassword = nconf.get('push:mpns:certPassword') || '';
      if (mpnsCertPath && mpnsCertPath != "") {
        invoke_scripty(indent, 'mobile push mpns set ' + nconf.get('name') + ' ' + mpnsCertPath + ' ' + mpnsCertPassword, done);
      } else {
        done();
      }
    },

    function (done) {
      var wnsClientSecret = nconf.get('push:wns:clientSecret');
      var wnsPackageSid = nconf.get('push:wns:packageSid');
      if (wnsClientSecret && wnsClientSecret != "" && wnsPackageSid && wnsPackageSid != "") {
        invoke_scripty(indent, 'mobile push wns set ' + nconf.get('name') + ' ' + wnsClientSecret + ' ' + wnsPackageSid, done);
      } else {
        done();
      }
    }
  ], callback);
}

function setup_auth_AllProviders(callback) {
  async.series([
    function (done) {
      var clientId = nconf.get('googleClientId');
      var clientSecret = nconf.get('googleClientSecret');
      setup_auth('google', clientId, clientSecret, done);
    },

    function (done) {
      var clientId = nconf.get('msClientId');
      var clientSecret = nconf.get('msClientSecret');
      setup_auth('microsoftaccount', clientId, clientSecret, done);
    },

    function (done) {
      var clientId = nconf.get('fbClientId');
      var clientSecret = nconf.get('fbClientSecret');
      setup_auth('facebook', clientId, clientSecret, done);
    },

    function (done) {
      var clientId = nconf.get('twitterApiKey');
      var clientSecret = nconf.get('twitterApiSecret');
      setup_auth('twitter', clientId, clientSecret, done);
    },

    function (done) {
      var clientId = nconf.get('aadClientId');
      var tenant = nconf.get('aadTenant');
      setup_aad(clientId, tenant, done);
    }
  ], callback);
}

function setup_auth(authprovider, clientId, clientSecret, callback) {
  if (!clientId || !clientSecret) {
    return callback();
  }
  var indent = '   ';
  process.stdout.write(indent + 'Setting up ' + authprovider + ' auth. clientId (' + clientId + ') clientsecret (' + clientSecret + ')...');
  if (authprovider == 'microsoftaccount') {
    var msPackageSID = nconf.get('msPackageSID');
    invoke_scripty(indent, 'mobile auth ' + authprovider + ' set --packageSid ' + msPackageSID + ' ' + nconf.get('name') + ' ' + clientId + ' ' + clientSecret, callback);
  } else {
    invoke_scripty(indent, 'mobile auth ' + authprovider + ' set ' + nconf.get('name') + ' ' + clientId + ' ' + clientSecret, callback);
  }
}

function setup_aad(clientId, tenant, callback) {
  if (!clientId || !tenant) {
    return callback();
  }
  if (!validator.isUUID(clientId)) {
    console.log('   Warn: supplied ClientId is not a GUID, skipping AAD Auth...'.yellow.bold);
    return callback();
  }
  if (!validator.isFQDN(tenant)) {
    console.log('   Warn: supplied Tenant is not a FQDN, skipping AAD Auth...'.yellow.bold);
    return callback();
  }
  var indent = '   ';
  process.stdout.write(indent + 'Setting up aad auth. clientId (' + clientId + ') tenant (' + tenant + ')...');
  async.series([
    function (done) {
      invoke_scripty(indent, 'mobile auth aad set ' + nconf.get('name') + ' ' + clientId, done);
    },
    function (done) {
      invoke_scripty(indent, 'mobile auth aad tenant add ' + nconf.get('name') + ' ' + tenant, done);
    }
  ], callback);
}

function setup_node_app(callback) {
  console.log('   Setting up Node app:');
  var appConfig = require(nconf.get('configFile'));
  var tables = appConfig.tables;
  async.series([
    function (done) {
      // Create tables
      create_node_tables(tables, done);
    },
    function (done) {
      // Upload user code and site extension
      upload_site_and_siteextension(done);
    }
  ], callback);
}

function create_node_tables(tables, callback) {
  if (!tables) {
    return callback();
  }
  async.eachSeries(tables, function (table, done) {
    async.series([
      function (_done) {
        // Create table
        async.retry(NumRetries, function (__done) {
          process.stdout.write('     Creating table ' + table.name + '...');
          scripty.invoke('mobile table create ' + (table.options || '') + ' ' + nconf.get('name') + ' ' + table.name, function (err, results) {
            if (!err) {
              console.log(' OK'.green.bold);
            } else if (resource_already_exists(err)) {
              console.log(' table already exists, OK'.yellow.bold);
              err = null;
            }
            __done(err);
          });
        }, _done);
      },
      function (_done) {
        // Add columns if specified
        if (!table.columns) {
          return _done();
        }
        var columns = table.columns.split(',');
        async.eachSeries(columns, function (column, __done) {
          process.stdout.write('        Creating column ' + column + '...');
          async.retry(NumRetries, function (___done) {
            scripty.invoke('mobile table update --addColumn ' + column + ' ' + nconf.get('name') + ' ' + table.name, function (err, results) {
              if (!err) {
                console.log(' OK'.green.bold);
              } else if (resource_already_exists(err)) {
                console.log(' column already exists, OK'.yellow.bold);
                err = null;
              }
              ___done(err);
            });
          }, __done);
        }, _done);
      }
    ], done);
  }, callback);
}

function resource_already_exists(err) {
  var stringErr = err.toString();
  return stringErr.indexOf('conflictError') > -1 && stringErr.indexOf('already exists') > -1;
}

function setup_dotnet_app(callback) {
  console.log('   Setting up DotNet app:');
  upload_site_and_siteextension(callback);
}

function upload_site_and_siteextension(callback) {
  var gitUri = {};
  var kuduUsername = {};
  var kuduPassword = {};
  var scmEndpoint = {};

  async.series([
    function (done) {
      // Get git uri
      process.stdout.write('     Reading Azure git uri and credentials...');
      scripty.invoke('mobile list', function (err, results) {
        if (!err) {
          var existingApp = null;
          results.forEach(function (i) {
            if (i.name.toLowerCase() == nconf.get('name').toLowerCase()) {
              existingApp = i;
            }
          });
          if (!existingApp) {
            return done('App does not exist in Azure, but it should have just been created!');
          }

          /* existingApp.deploymentTriggerUrl looks like:
           *   https://$mobile$APPNAME:PASSWORD@APPNAME.scm.azure-mobile.net/deploy
           * We need to transform it into:
           *   https://%24mobile%24APPNAME:PASSWORD@APPNAME.scm.azure-mobile.net/APPNAME.git
           * Note that we replace '$' with '%24' since otherwise a Mac / Linux computer would
           * look for an environment variable with that name, so it has to be escaped.
           */
          gitUri = existingApp.deploymentTriggerUrl.replace('/deploy', '/' + nconf.get('name') + '.git').replace(/\$/g, '%24');
          var regex = /^https:\/\/([^:]*):([^@]*)@/g;
          var matches = regex.exec(existingApp.deploymentTriggerUrl);
          kuduUsername = matches[1];
          kuduPassword = matches[2];

          // Add .scm in the middle of the uri
          regex = /^(http(?:s?):\/\/[^.]*)(\..*$)/g;
          matches = regex.exec(existingApp.applicationUrl);
          scmEndpoint = matches[1].replace('http:', 'https:') + '.scm' + matches[2];

          state.appPingUri = existingApp.applicationUrl.replace('https://', 'http://') + nconf.get('pingEndpoint');
          console.log(' OK'.green.bold + ': ' + gitUri);
        }
        done(err);
      });
    },
    function (done) {
      // Upload private site extension if specified
      var siteExtensionPath = nconf.get('siteExtensionPath');
      if (!siteExtensionPath) {
        return done();
      }
      upload_site_extension(scmEndpoint, kuduUsername, kuduPassword, siteExtensionPath.trim(), done);
    },
    function (done) {
      // Push source files through Git if specified
      var srcFilesPath = nconf.get('srcFiles');
      if (!srcFilesPath) {
        return done();
      }
      push_repo(gitUri, srcFilesPath.trim(), done);
    },
    function (done) {
      // Upload binary files through Kudu if specified
      var binFilesPath = nconf.get('binFiles');
      if (!binFilesPath) {
        return done();
      }
      upload_user_binaries(scmEndpoint, kuduUsername, kuduPassword, binFilesPath.trim(), done);
    },
    function (done) {
      // Restart the site
      process.stdout.write('     Restarting site...');
      call_kudu('delete', scmEndpoint + 'api/diagnostics/processes/0', null, kuduUsername, kuduPassword, 5,
        function (err, resp, body) {
          if (!err) {
            console.log(' OK'.green.bold + ': ' + resp.statusCode);
          } else
            console.log('Ignoring error (' + err + ')');
          return done();
        });
    }
  ], callback);
}

function upload_user_binaries(scmEndpoint, kuduUsername, kuduPassword, binFilesPath, callback) {
  var binContents = {};
  var tmpPath = {};
  var zipPath = {};

  console.log('   Uploading user binaries:');
  async.series([
    function (done) {
      process.stdout.write('     Creating temp folder...');
      tmpDirs.dir(function (err, _path) {
        if (!err) {
          tmpPath = _path;
          console.log(' OK'.green.bold + ': ' + tmpPath);
        }
        done(err);
      });
    },
    function (done) {
      process.stdout.write('     Zipping user site binaries...');
      zipPath = tmpPath + '/userSite.zip';
      zip_folder(binFilesPath, zipPath, 'site/wwwroot', done);
    },
    function (done) {
      process.stdout.write('     Reading zipped file...');
      fse.readFile(zipPath, function (err, results) {
        if (err) {
          return done(err);
        }
        binContents = results;
        console.log(' OK'.green.bold);
        done();
      });
    },
    function (done) {
      process.stdout.write('     Removing old user site binaries...');
      call_kudu('delete', scmEndpoint + 'api/vfs/Site/wwwroot/?recursive=true', null, kuduUsername, kuduPassword, 60,
        function (err, resp, body) {
          if (!err) {
            console.log(' OK'.green.bold + ': ' + resp.statusCode);
          }
          return done(err);
        });
    },
    function (done) {
      process.stdout.write('     Uploading user site binaries (' + (binContents.length / 1024).toFixed(1) + ' KB)...');
      call_kudu('put', scmEndpoint + 'api/zip', {
          body: binContents
        }, kuduUsername, kuduPassword, 150,
        function (err, resp, body) {
          if (!err) {
            if (resp.statusCode == 200) {
              console.log(' OK'.green.bold);
            } else {
              console.log(' Err: '.red.bold + resp.statusCode + '\n' + body);
              err = 'Kudu returned ' + resp.statusCode;
            }
          }
          done(err);
        });
    },
    function (done) {
      process.stdout.write('     Deleting temp folder...');
      fse.remove(tmpPath, function (err) {
        if (!err) {
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    }
  ], callback);
}

function zip_folder(srcPath, destPath, contentPrefix, callback) {
  var output = fse.createWriteStream(destPath);
  var zip = archiver('zip');

  output.on('close', function () {
    console.log(' OK'.green.bold);
    callback();
  });

  zip.on('error', function (err) {
    callback(err);
  });

  zip.pipe(output);
  zip.bulk([{
    expand: true,
    cwd: srcPath,
    src: ['**'],
    dest: contentPrefix
  }]);
  zip.finalize();
}

function push_repo(gitUri, srcFilesPath, callback) {
  var tmpPath = {};
  var repo = {};

  async.series([
    function (done) {
      process.stdout.write('     Creating temp folder...');
      tmpDirs.dir(function (err, _path) {
        if (!err) {
          tmpPath = _path;
          console.log(' OK'.green.bold + ': ' + tmpPath);
        }
        done(err);
      });
    },
    function (done) {
      process.stdout.write('     Copying source files to temp folder...');
      fse.copy(srcFilesPath, tmpPath, function (err) {
        if (!err) {
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    },
    function (done) {
      process.stdout.write('     Initializing local git repo...');
      git.init(tmpPath, function (err, _repo) {
        if (!err) {
          repo = _repo;
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    },
    function (done) {
      // git add *
      process.stdout.write('     Staging files in local repo...');
      repo.add('*', function (err) {
        if (!err) {
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    },
    function (done) {
      // git commit
      process.stdout.write('     Commiting files in local repo...');
      repo.commit('Created automatically by E2E testing infrastructure.', {
        all: true
      }, function (err) {
        if (!err) {
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    },
    function (done) {
      // git remote add origin <gitUri>
      process.stdout.write('     Adding Azure as a remote in the local repo...');
      repo.remote_add('origin', gitUri, function (err) {
        if (!err) {
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    },
    function (done) {
      // git push origin master --force
      process.stdout.write('     Pushing to Azure...');
      repo.remote_push('origin', 'master --force', function (err) {
        if (!err) {
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    },
    function (done) {
      process.stdout.write('     Deleting temp folder...');
      fse.remove(tmpPath, function (err) {
        if (!err) {
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    }
  ], callback);
}

function upload_site_extension(scmEndpoint, kuduUsername, kuduPassword, siteExtensionPath, callback) {
  var siteExtensionContents = {};

  console.log('   Uploading private site extension:');
  async.series([
    function (done) {
      process.stdout.write('     Reading private site extension file...');
      fse.readFile(siteExtensionPath, function (err, results) {
        if (err) {
          return done(err);
        }
        siteExtensionContents = results;
        console.log(' OK'.green.bold);
        done();
      });
    },
    function (done) {
      process.stdout.write('     Removing old private site extensions...');
      call_kudu('delete', scmEndpoint + 'api/vfs/SiteExtensions/?recursive=true', null, kuduUsername, kuduPassword, 60,
        function (err, resp, body) {
          if (!err) {
            console.log(' OK'.green.bold + ': ' + resp.statusCode);
          }
          return done(err);
        });
    },
    function (done) {
      process.stdout.write('     Uploading private site extension (' + (siteExtensionContents.length / 1024).toFixed(1) + ' KB)...');
      call_kudu('put', scmEndpoint + 'api/zip', {
          body: siteExtensionContents
        }, kuduUsername, kuduPassword, 150,
        function (err, resp, body) {
          if (!err) {
            if (resp.statusCode == 200) {
              console.log(' OK'.green.bold);
            } else {
              console.log(' Err: '.red.bold + resp.statusCode + '\n' + body);
              err = 'Kudu returned ' + resp.statusCode;
            }
          }
          done(err);
        });
    }
  ], callback);
}

function call_kudu(method, uri, content, username, password, timeout, callback) {
  var opt = {
    method: method,
    uri: uri,
    timeout: timeout * 1000,
    auth: {
      user: username,
      pass: password,
      sendImmediately: true
    }
  };

  if (content) {
    if (content.json) {
      opt.json = content.json;
    }
    if (content.body) {
      opt.body = content.body;
    }
  }

  request(opt, callback);
}

function invoke_scripty(currentIndent, scriptToInvoke, callback) {
  process.stdout.write('   ' + currentIndent + scriptToInvoke);
  scripty.invoke(scriptToInvoke, function (err, results) {
    if (!err) {
      console.log(' OK'.green.bold + '\n');
    }
    callback(err);
  });
}

run(function (err) {
  process.stdout.write('\n');
  if (err) {
    console.log('Err: '.red.bold + err + '\n');
    process.exit(1);
  } else {
    console.log('Success!'.green.bold + '\n');
    process.exit(0);
  }
});
