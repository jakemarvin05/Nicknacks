'use strict'
const QuickBooks = require('node-quickbooks')
const debug = require('debug')('nn:apps:qbotoken')
const moment = require('moment')
const cron = require('cron').CronJob
const Retry = {
    retries: 5,
    tried: 0,
    timeout: 2000,
    processName: 'Retry',
    start(process, succeeded, fail, timeout) {
        if (process) this._process = process
        if (succeeded) this._succeeded = succeeded
        if (fail && fail !== 'default') this.fail = fail
        if (error) this._error = error
        if (timeout) this.timeout = timeout
        setTimeout(this.process.bind(this), this.timeout)
    },
    succeeded() {
        this.tried = 0
    },
    process() {
        if (this.tried === 0) {
            console.log(`Starting ${this.processName}...`)
        } else {
            console.log(`Retrying ${this.processName}...`)
        }
        if (this.tried === this.retries + 1) return this.fail() // is retries + 1 because the first try is not a "retry"
        if (this._process) {
            this.tried += 1
            this._process()
                .then(this._succeeded)
                .then(this.succeeded.bind(this))
                .catch(this.error.bind(this))
        }
    },
    fail() {
        throw new Error(`Failed after ${this.retries} retries for: ${this.processName}`)
    },
    error(error) {
        console.log(error)
        console.log(JSON.stringify(error))
        this.start()
        if (this._error) this._error()
    }
}

let refreshTokenEveryFiftyMinute = new cron(
    '* */50 * * * *',
    start,
    null,
    true,
    'Asia/Singapore'
)

function initialise() {
    console.log('Re-initialising QBO...')
    return DB.Token.findById(1).then(token => {
        global.QBO = instantiate(QuickBooks, token)
        return refresh() // always refresh.
    }).then(() => {
        // run a query to ensure it is working.
        return QBO.findAccountsAsync()
    }).then(data => {
        //console.log(JSON.stringify(data))
        console.log('Token is all good!')
        // set the token refresh sequence
        refreshTokenEveryFiftyMinute.start()
    })
}

function instantiate(QBO, token) {
    QBO = new QBO({
        consumerKey: process.env.qbo_consumerKey,
        consumerSecret: process.env.qbo_consumerSecret,
        token: token.data.access_token,
        refreshToken: token.data.refresh_token,
        realmId: process.env.qbo_realmID,
        oauthversion: '2.0',
        useSandbox: process.env.qbo_environment === 'production' ? false : true
    })
    QBO = PROMISE.promisifyAll(QBO)
    return QBO
}

function refresh() {
    console.log('running QBO token refresh.')
    if (QBO === null || typeof QBO !== 'object') throw new Error('QBO is not a object.')

    // get the token
    return QBO.refreshAccessTokenAsync().then(token => {
        debug('Tokens refreshed : ' + JSON.stringify(token))
        // update the token into DB
        return DB.Token.update({
            data: token
        }, {
            where: {
                TokenID: 1
            }
        })
    })
}

function error() {
    global.QBOIsWorking = false
    refreshTokenEveryFiftyMinute.stop()
}

function succeeded() {
    console.log('QBO is initialised')
    global.QBOIsWorking = true
}

const retry = Object.create(Retry)
retry.processName = 'QBO token refresh.'
function start() {
    retry.start(
        initialise,
        succeeded,
        'default',
        error,
        300000 // retry every 5 minutes
    )
}

module.exports = start

// function retrieveTokenAndRefresh() {
//     debug('running QBO token refresh.')
//     // get the token
//     QBO.refreshAccessTokenAsync().then(token => {
//         debug('Tokens refreshed : ' + JSON.stringify(token)
//         // update the token
//         return DB.Token.update({
//             data: token
//         }, {
//             where: {
//                 TokenID: 1
//             }
//         })
//
//     }).catch(function (err) {
//         global.QBOIsWorking = false
//         debug(err)
//         // log the error
//         API_ERROR_HANDLER(err)
//     })
//
//
//     DB.Token.findById(1).then(function (token) {
//
//         // check validity of token data.
//         if (!token || !token.data || !token.data.access_token || !token.data.refresh_token) {
//             throw new Error('CRITICAL: Obtaining token from database failed.')
//         }
//
//         let accessToken = token.data
//
//         // NOTE: OAuth2 Access token `access_token` will expire 1 hour from the point it is created.
//         //       The refresh token `refresh_token` will expire in 100 days if not used.
//         //       Before every hour (expiry limit of Access Token), the tokens are refreshed.
//         //       The new tokens are then stored and QBO is re-initialised with the new tokens.
//
//
//         // initialise QBO
//         // access_token may be outdated, it is not a problem.
//         global.QBO = new QuickBooks(
//             process.env.qbo_consumerKey,
//             process.env.qbo_consumerSecret,
//             accessToken.access_token, /* oAuth access token */
//             false, /* no token secret for oAuth 2.0 */
//             process.env.qbo_realmID,
//             (process.env.environment === 'production' ? false : true), /* use a sandbox account */
//             false, /* turn debugging on */
//             34, /* minor version */
//             '2.0', /* oauth version */
//             accessToken.refresh_token /* refresh token */
//         )
//
//         PROMISE.promisifyAll(global.QBO)
//
//         return refreshQBOToken(accessToken)
//
//     }).catch(function (err) {
//         global.QBOIsWorking = false
//         debug(err)
//         // log the error
//         API_ERROR_HANDLER(err)
//
//     });
//
//
//
//
//     // connect to quickbooks to refresh token. returns a promise
//     function refreshQBOToken(accessToken) {
//         debug(accessToken)
//         debug('running QBO token refresh.')
//
//         return global.oauthClient.refresh().then(function(authResponse) {
//             debug(authResponse)
//             debug('Tokens refreshed : ' + JSON.stringify(authResponse.getJson()));
//
//             var accessToken = authResponse.getJson();
//             var companyId = authResponse.token.realmId;
//
//             global.QBO = new QuickBooks(
//                 process.env.qbo_consumerKey,
//                 process.env.qbo_consumerSecret,
//                 accessToken.access_token, /* oAuth access token */
//                 false, /* no token secret for oAuth 2.0 */
//                 companyId,
//                 (process.env.qbo_environment === 'production' ? false : true), /* use a sandbox account */
//                 false, /* turn debugging on */
//                 34, /* minor version */
//                 '2.0', /* oauth version */
//                 accessToken.refresh_token /* refresh token */
//             )
//             PROMISE.promisifyAll(global.QBO)
//
//             global.QBOIsWorking = true
//
//              // update the token
//              return DB.Token.update({
//                  data: accessToken
//              }, {
//                  where: {
//                      TokenID: 1
//                  }
//              })
//
//          })
//     }
//
//
//     // attempt refresh every 50 min
//     setTimeout(retrieveTokenAndRefresh, 3e+6);
// }
// module.exports = retrieveTokenAndRefresh
