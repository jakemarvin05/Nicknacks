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

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
const compression = require('compression')

// /*passport, session and pg session */
const passport = global.PASSPORT = require('passport')
require('./apps/passport/passportConfig.js')(passport); //this has to be before routes
const pgSession = require('connect-pg-simple')(session);

// inventory report generator
if(process.env.NODE_ENV !== "development") {
    const inventoryReport = require('./apps/inventoryReportGenerator')
    const cron = require('cron').CronJob
    //constructor(cronTime, onTick, onComplete, start, timezone, context, runOnInit, utcOffset, unrefTimeout)
    let runInventoryReportOnEveryMonday = new cron('0 0 8 * * 1', inventoryReport, null, true, 'Asia/Singapore')
    runInventoryReportOnEveryMonday.start()
}

global.QBO = ''
global.QBOIsWorking = false

var QuickBooks = require('node-quickbooks');
//QuickBooks.setOauthVersion('2.0', (process.env.qbo_environment === 'production' ? false : true));
//console.log(QuickBooks.oauthversion)
DB.Token.findById(1).then(token => {
    // let debug = require('debug')('QBOInit')
    // console.log(QBO.oauthversion)
    // console.log(!eval('token.data.tokenSecret') && QBO.oauthversion !== '2.0')
    // global.QBO = QBO(
    //     token.data,
    //     null,
    //     null, /* oAuth access token */
    //     null, /* no token secret for oAuth 2.0 */
    //     null,
    //     null, /* use a sandbox account */
    //     debug /* turn debugging on */
    // )

    global.QBO = new QuickBooks(Object.assign(token.data, {
        oauthversion: '2.0',
        //useSandbox: process.env.qbo_environment === 'production' ? false : true
        useSandbox: false
    }))

    global.QBO = PROMISE.promisifyAll(global.QBO)

    // run a query to ensure it is working.
    global.QBO.findAccountsAsync(accounts => {
        accounts.QueryResponse.Account.forEach(function (account) {
            console.log('QBO is initialised')
            global.QBOIsWorking = true
        })

        // run the looping refresh token function
        const QBOToken = require(path.join(__appsDir, 'QBO/QBOToken'))
        setTimeout(function() {
            QBOToken()
        }, 3e+6)

        //console.log(err)
    }).catch(err => { console.log(JSON.stringify(err)) })

})

const OAuthClient = require('intuit-oauth')
global.oauthClient = new OAuthClient({
    clientId: process.env.qbo_consumerKey,
    clientSecret: process.env.qbo_consumerSecret,
    environment: process.env.qbo_environment,
    redirectUri: process.env.DOMAIN + '/qbo/callback'
})

const app = express();

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

app.use(compression())

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

const magic = require('express-routemagic')
magic.use(app, __dirname, {
    logMapping: true,
    ignoreSuffix: '_bak'
})

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
    let err = new Error('404: Not Found');
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
