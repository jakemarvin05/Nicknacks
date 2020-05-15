//load environment variables
require('dotenv').load();

// path related globals
global.__appsDir = __dirname + '/apps'

//load models the last because it has dependencies on the previous globals.
global.Promise = global.PROMISE = require('bluebird')
global.SGMAIL = require('@sendgrid/mail')
SGMAIL.setApiKey(process.env.SENDGRID_API_KEY)
global.DB = require('./models/index.js')
global.MOMENT = require('moment')
global.D = require('dottie')
global.ASANA = require('asana').Client.create().useAccessToken(process.env.ASANA_PA_TOKEN)

global.API_ERROR_HANDLER = require('./apps/apiErrorHandler')

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var cors = require('cors');

// /*passport, session and pg session */
const passport = global.PASSPORT = require('passport')
require('./apps/passport/passportConfig.js')(passport); //this has to be before routes
var pgSession = require('connect-pg-simple')(session);

// inventory report generator
if(process.env.NODE_ENV !== "development") {
    var inventoryReport = require('./apps/inventoryReportGenerator')
    var cron = require('cron').CronJob
    //constructor(cronTime, onTick, onComplete, start, timezone, context, runOnInit, utcOffset, unrefTimeout)
    var runInventoryReportOnEveryMonday = new cron('0 0 8 * * 1', inventoryReport, null, true, 'Asia/Singapore')
    runInventoryReportOnEveryMonday.start()
}

global.QBO = ''
global.QBOIsWorking = false

var OAuthClient = require('intuit-oauth')
global.oauthClient = new OAuthClient({
    clientId: process.env.qbo_consumerKey,
    clientSecret: process.env.qbo_consumerSecret,
    environment: process.env.qbo_environment,
    redirectUri: process.env.DOMAIN + '/qbo/callback'
})

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(favicon(path.join(__dirname, 'public/static/favicon.ico')))
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));

// enable cors
app.use(cors({
    credentials: true,
    origin: true,
    methods: ['GET, HEAD, PUT, PATCH, POST, DELETE'],
    maxAge: 31536000000000,
    preflightContinue: true
}));

// Authentication
app.use(session({
    store: new pgSession({
        conString: DB.databaseUrl,
        tableName: 'Session'
    }),
    secret: process.env.SESSION_SECRET,
    cookie: {maxAge: 31536000000000 /*10 years*/},
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

app.use('/', require('./routes/index'));
app.use('/qbo', require('./routes/qbo'));

// api V2
app.use('/api/v2', require('./routes/api/v2'));
app.use('/api/v2/shipment', require('./routes/api/v2/shipment'));
app.use('/api/v2/magento-webhooks', require('./routes/api/v2/magento-webhooks'));
app.use('/api/v2/sales-receipt', require('./routes/api/v2/sales-receipt'));
app.use('/api/v2/inventory', require('./routes/api/v2/inventory'));
    app.use('/api/v2/inventory/movement-record', require('./routes/api/v2/inventory/movement-record'));
app.use('/api/v2/shipment', require('./routes/api/v2/shipment'));
app.use('/api/v2/stripe-webhooks', require('./routes/api/v2/stripe-webhooks'));
app.use('/api/v2/storage-location', require('./routes/api/v2/storage-location'));
app.use('/api/v2/login', require('./routes/api/v2/login'));

//api renford V2
app.use('/api/renford/v2/inventory', require('./routes/api/renford/v2/inventory'));

/* SAFARI/IOS Bug */
app.all('*', function (req, res, next) {
  agent = req.headers['user-agent'];
  if (agent && agent.indexOf('Safari') > -1 && agent.indexOf('Chrome') === -1 && agent.indexOf('OPR') === -1) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', 0);
  }
  next();
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('404: Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use( (err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {}

    API_ERROR_HANDLER(err, req, res, next)

});

module.exports = app;
