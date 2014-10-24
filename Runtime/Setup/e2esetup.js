var argv    = require('optimist').argv,
    async   = require('async'),
    colors  = require('colors'),
    fse     = require('fs-extra'),
    git     = require('gift'),
    nconf   = require('nconf'),
    request = require('request'),
    scripty = require('azure-scripty'),
    tmpDirs = require('tmp');

var state = {};
var NumRetries = 3;
var defaultPingDelay = 7500;

function run(callback) {
  async.series([
    read_config,
    read_existing_apps,
    make_app
  ], callback);
}

function usage() {
  console.log('Usage: node e2esetup [options] configFile');
  console.log("   options:");
  console.log("      --name               app name");
  console.log("      --platform           app platform (DotNet / Node)");
  console.log("      --location           app location (e.g. West US)");
  console.log("      --sql:server         SQL server name");
  console.log("      --sql:db             database name");
  console.log("      --sql:user           database username");
  console.log("      --sql:password       database password");
  console.log("      --appKey             application key");
  console.log("      --corsWhitelist      CORS whitelist (e.g. 'ms-appx-web://10805zumoTestUser.zumotestblu2' or '10805zumoTestUser.zumotestblu2'");
  console.log("      --srcFiles           Path to the runtime user files");
  console.log("      --configFile:        JSON file with configs for the app. See the provided templates.");
  console.log("      --tier:              The tier level for the app i.e Free, basic or standard");
  console.log("      --pingEndpoint:      Endpoint to ping (GET) after app is created (e.g. 'status' or 'tables/movies')");
  console.log("      --pingDelay:         Time (in milliseconds) to wait before pinging the pingEndpoint (default: " + defaultPingDelay + ")");
  console.log("      --siteExtensionPath  ");
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
  nconf.argv().file({ file: configFile });

  console.log(' OK'.green.bold);
  callback();
}

function read_existing_apps(callback) {
  process.stdout.write('Reading existing apps...');
  scripty.invoke('mobile list', function(err, results) {
    if (!err) {
      state.existingApps = results;
      process.stdout.write(' OK'.green.bold + '\n');
      process.stdout.write('   Found ' + state.existingApps.length + ' apps:\n');
      state.existingApps.forEach(function(a) {
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
      delete_app_if_exists,
      create_app,
      scale_app,
      setup_app
    ], callback);
}

function delete_app_if_exists(callback) {
  var existingApp = null;
  var appName = nconf.get('name');
  state.existingApps.forEach(function(i) {
    if (i.name.toLowerCase() == appName.toLowerCase()) {
      existingApp = i;
    }
  });
  
  if (existingApp) {
    process.stdout.write('   Deleting existing app...');
    scripty.invoke('mobile delete --deleteData --quiet ' + appName, function(err, results) {
      if (!err) {
        process.stdout.write(' OK'.green.bold + '\n');
      }
      callback(err);
    });
  } else {
    process.stdout.write('   App does not currently exist.\n');
    callback();
  }
}

function create_app(callback) {
  process.stdout.write('   Creating new app...');

  var cmd = {
    command: 'mobile create',
    sqlServer: nconf.get('sql:server'),
    sqlDb: nconf.get('sql:db'),
    location: '"' + nconf.get('location') + '"',
    backend: nconf.get('platform'),
    positional: [nconf.get('name'), nconf.get('sql:user'), nconf.get('sql:password')]
  };
  scripty.invoke(cmd, function(err, results) {
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
  scripty.invoke('mobile scale change --tier '+ nconf.get('tier') + ' ' + nconf.get('name'), function(err, results) {
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
    
    // Platform-specific setup
    function(done) {
      var lower = nconf.get('platform').toLowerCase();
      if (lower == 'node') {
        setup_node_app(done);
      }
      else if (lower == 'dotnet') {
        setup_dotnet_app(done);
      } else {
        done('Invalid app platform in config file: ' + lower + '\n');
      }
    },
    
    // Wait some time before pinging the site
    function(done) {
      var pingDelay = nconf.get('pingDelay') || 7500;
      process.stdout.write('   Waiting ' + pingDelay + ' ms before pinging the app...');
      setTimeout(function() {
        console.log(' OK'.green.bold);
        done();
      }, pingDelay);
    },
    
    // Ping the app
    function(done) {
      process.stdout.write('   Pinging ' + state.appPingUri + '...');
      request.get({
                    uri: state.appPingUri,
                    timeout: 60 * 1000,
                    headers: {
                      'x-zumo-application': nconf.get('appKey') || ''
                    }
                  },
                  function(err, resp, body) {
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
    function(done) {
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
  scripty.invoke('mobile key set ' + nconf.get('name') + ' application ' + appKey, function(err, results) {
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
  scripty.invoke('mobile config set ' + nconf.get('name') + ' crossDomainWhitelist ' + corsWhitelist, function(err, results) {
    if (!err) {
      console.log(' OK'.green.bold);
    }
    callback(err);
  });
}

function setup_node_app(callback) {
  console.log('   Setting up Node app:');
  var appConfig = require(nconf.get('configFile'));
  var tables = appConfig.tables;
  async.series([
    function(done) {
      // Create tables
      create_node_tables(tables, done);
    },
    function(done) {
      // Push repo
      push_repo_and_siteextension(done);
    }
  ], callback);
}

function create_node_tables(tables, callback) {
  if (!tables) {
    return callback();
  }
  
  async.eachSeries(tables, function(table, done) {
    async.series([
      function(_done) {
        // Create table
        async.retry(NumRetries, function(__done) {
          process.stdout.write('     Creating table ' + table.name + '...');
          scripty.invoke('mobile table create ' + (table.options || '') + ' ' + nconf.get('name') + ' ' + table.name, function(err, results) {
            if (!err) {
              console.log(' OK'.green.bold);
            }
            __done(err);
          });
        }, _done);
      },
      function(_done) {
        // Add columns if specified
        if (!table.columns) {
          return _done();
        }
        var columns = table.columns.split(',');
        async.eachSeries(columns, function(column, __done) {
          process.stdout.write('        Creating column ' + column + '...');
          async.retry(NumRetries, function(___done) {
            scripty.invoke('mobile table update --addColumn ' + column + ' ' + nconf.get('name') + ' ' + table.name, function(err, results) {
              if (!err) {
                console.log(' OK'.green.bold);
              }
              ___done(err);
            });
          }, __done);
        }, _done);
      }
    ], done);
  }, callback);
}

function setup_dotnet_app(callback) {
  console.log('   Setting up DotNet app:');
  async.series([
    function(done) {
      push_repo_and_siteextension(done);
    }
  ], callback);
}

function push_repo_and_siteextension(callback) {
  var tmpPath = {};
  var repo = {};
  var gitUri = {};
  var kuduUsername = {};
  var kuduPassword = {};
  var scmEndpoint = {};
  
  async.series([
    function(done) {
      // Get git uri
      process.stdout.write('     Reading Azure git uri and credentials...');
      scripty.invoke('mobile list', function(err, results) {
        if (!err) {
          var existingApp = null;
          results.forEach(function(i) {
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
          scmEndpoint = matches[1].replace('http:','https:') + '.scm' + matches[2];
          
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
      upload_site_extension(scmEndpoint, kuduUsername, kuduPassword, siteExtensionPath, done);
    },
    function(done) {
      process.stdout.write('     Creating temp folder...');
      tmpDirs.dir(function(err, _path) {
        if (!err) {
          tmpPath = _path;
          console.log(' OK'.green.bold + ': ' + tmpPath);
        }
        done(err);
      });
    },
    function(done) {
      process.stdout.write('     Copying source files to temp folder...');
      fse.copy(nconf.get('srcFiles'), tmpPath, function(err) {
        if (!err) {
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    },
    function(done) {
      process.stdout.write('     Initializing local git repo...');
      git.init(tmpPath, function(err, _repo) {
        if (!err) {
          repo = _repo;
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    },
    function(done) {
      // git add *
      process.stdout.write('     Staging files in local repo...');
      repo.add('*', function(err) {
        if (!err) {
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    },
    function(done) {
      // git commit
      process.stdout.write('     Commiting files in local repo...');
      repo.commit('Created automatically by E2E testing infrastructure.', {all:true}, function(err) {
        if (!err) {
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    },
    function(done) {
      // git remote add origin <gitUri>
      process.stdout.write('     Adding Azure as a remote in the local repo...');
      repo.remote_add('origin', gitUri, function(err) {
        if (!err) {
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    },
    function(done) {
      // git push origin master --force
      process.stdout.write('     Pushing to Azure...');
      repo.remote_push('origin', 'master --force', function(err) {
        if (!err) {
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    },
    function(done) {
      process.stdout.write('     Deleting temp folder...');
      fse.remove(tmpPath, function(err) {
        if (!err) {
          console.log(' OK'.green.bold);
        }
        done(err);
      });
    },
  ], callback);
}

function upload_site_extension(scmEndpoint, kuduUsername, kuduPassword, siteExtensionPath, callback) {
  var siteExtensionContents = {};
  async.series([
    function(done) {
      process.stdout.write('     Reading private site extension file...');
      fse.readFile(siteExtensionPath, function(err, results) {
        if (err) {
          return done(err);
        }
        siteExtensionContents = results;
        console.log(' OK'.green.bold);
        done();
      });
    },
    function(done) {
      process.stdout.write('     Removing old private site extension...');
      request( { method:'delete',
                 uri: scmEndpoint + 'api/vfs/SiteExtensions/?recursive=true',
                 timeout: 60 * 1000,
                 auth: {
                   user: kuduUsername,
                   pass: kuduPassword,
                   sendImmediately: true
                 }
               }, function(err, resp, body) {
        if (!err) {
          console.log(' OK'.green.bold + ': ' + resp.statusCode);
        }
        return done(err);
      });
    },
    function(done) {
      process.stdout.write('     Uploading private site extension (' + (siteExtensionContents.length / 1024).toFixed(1) + ' KB)...');
      request( { method:'put',
                 uri: scmEndpoint + 'api/zip',
                 timeout: 150 * 1000,
                 auth: {
                   user: kuduUsername,
                   pass: kuduPassword,
                   sendImmediately: true
                 },
                 body: siteExtensionContents
               }, function(err, resp, body) {
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

run(function(err) {
  process.stdout.write('\n');
  if (err) {
    console.log('Err: '.red.bold + err + '\n');
    process.exit(1);
  } else {
    console.log('Success!'.green.bold + '\n');
    process.exit(0);
  }
});