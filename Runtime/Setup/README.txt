Steps to run:
  1) Create your app config json file based on nodeApp_template.json or dotNetApp.json

  2) Install dependencies (only necessary the first time):
     npm install

     --- Note ---
      If installation fails, you may be using an older version of Node.
      Install the latest version of Node from http://nodejs.org.  
      You may also need to install Python 2.7 https://www.python.org/downloads/

  3) Using azure CLI, log in to the account and subscription that 
     [is hosting/will host] the test app.

     azure login
     azure account list
     azure account set [subscription name]
 
  3) Run the automated setup:
     > node e2esetup.js <optional parameters> <config_file>

     For usage info, simply run:
     > node e2esetup.js
     
     You can specify as many optional parameters as you want. Example:
     > node e2esetup.js myNodeApp.json --name MY_APP_NAME --sql:db MY_SQL_DB --appKey MY_APP_KEY
     
     
Tested with:
    node v0.12.3
    npm 2.9.1

