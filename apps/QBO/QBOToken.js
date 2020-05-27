'use strict'
const QuickBooks = require('node-quickbooks')
const debug = require('debug')('nn:apps:qbotoken')
const moment = require('moment')
const cron = require('cron').CronJob

const retryDuration = 300000 // retry every 5 minutes

const Retry = {
    retries: 5,
    tried: 0,
    timeout: 2000,
    processName: 'Retry',
    errorHeap: [],
    start(process, succeeded, fail, error, timeout) {
        if (process) this._process = process
        if (succeeded) this._succeeded = succeeded
        if (fail && fail !== 'default') this.fail = fail
        if (error) this._error = error
        if (timeout) this.timeout = timeout

        this.preProcess()
    },
    postSucceeded() {
        this.tried = 0
        this.errorHeap = []
    },
    preProcess() {
        if (this.tried === 0) {
            debug(`Starting ${this.processName}...`)
        } else {
            debug(`Retrying ${this.processName}...`)
        }
        if (this._process) {
            this.tried += 1
            this._process()
                .then(this._succeeded)
                .then(this.postSucceeded.bind(this))
                .catch(this.preError.bind(this))
        }
    },
    fail(error) {
        error.message += ` -- Failed after ${this.retries} retries for: ${this.processName}`
        throw error
    },
    preError(error) {

        // if this is the last try
        if (this.tried === this.retries) {
            error.heap = this.errorHeap
            return this.fail(error)
        }

        // if not last try, push to heap, print out in log, set the next retry.
        this.errorHeap.unshift(error)
        debug(error)
        debug(JSON.stringify(error))
        this.timeoutFn = setTimeout(this.start.bind(this), this.timeout)
        if (this._error) this._error(error)
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
    debug('Re-initialising QBO...')
    return DB.Token.findById(1).then(token => {
        if (token.data.error && token.data.error.indexOf('invalid') > -1) {
            let error = new Error('Token stored in DB is invalid.')
            error.debug = { token: token.data }
            throw error
        }
        global.QBO = instantiate(QuickBooks, token)
        if (process.env.NODE_ENV === 'production') return refresh() // always refresh.
        return null
    }).then(() => {
        // run a query to ensure it is working.
        return QBO.findAccountsAsync()
    }).then(data => {
        //debug(JSON.stringify(data))
        return null
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
    debug('running QBO token refresh.')
    if (QBO === null || typeof QBO !== 'object') throw new Error('QBO is not a object.')

    // get the token
    return QBO.refreshAccessTokenAsync().then(token => {
        if (token.data.error && token.data.error.indexOf('invalid') > -1) {
            let error = new Error('Token retrieved is invalid.')
            error.debug = { token }
            throw error
        }
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
    global.QBONextRetry = moment().add(retryDuration, 'ms')
    refreshTokenEveryFiftyMinute.stop()
}

function succeeded() {
    debug('QBO is initialised')
    global.QBOIsWorking = true
    // set the token refresh cron
    if (process.env.NODE_ENV === 'production') return refreshTokenEveryFiftyMinute.start()
}

function fail(error) {
    error.message += ` -- Failed after ${this.retries} retries for: ${this.processName}`
    error.status = 500
    error.level = 'high'
    global.QBONextRetry = false
    API_ERROR_HANDLER(error)
}

const retry = Object.create(Retry)
retry.processName = 'QBO token refresh.'

function start() {
    retry.start(
        initialise,
        succeeded,
        fail,
        error,
        retryDuration
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
