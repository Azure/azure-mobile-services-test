Steps to run:
  1) Create your app config json file based on nodeApp_template.json or dotNetApp.json

  2) Install dependencies (only necessary the first time):
     npm install

  3) Run the automated setup:
     > node e2esetup.js <optional parameters> <config_file>

     For usage info, simply run:
     > node e2esetup.js
     
     You can specify as many optional parameters as you want. Example:
     > node e2esetup.js myNodeApp.json --name MY_APP_NAME --sql:db MY_SQL_DB --appKey MY_APP_KEY
     
     
Tested with:
    node v0.8.28
    npm 1.2.30
