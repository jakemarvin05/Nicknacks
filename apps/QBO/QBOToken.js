'use strict'

//modules
const QuickBooks = require('node-quickbooks')
const debug = DEBUG('nn:apps:qbotoken')
const moment = require('moment')
const cron = require('cron').CronJob

//properties
const retryDuration = 300000000000 // 5 minutes

//flags or variables
let qboRefreshIsRunning = false
let refreshTokenEveryFiftyMinute = false

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
        error.sendEmail = true
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

// let refreshTokenEveryFiftyMinute = new cron(
//     '* */30 * * * *', //using 30 minutes for now due cron bug: https://github.com/kelektiv/node-cron/issues/489#issuecomment-620843432
//     start,
//     null,
//     false,
//     'Asia/Singapore'
// )

function initialise() {
    debug('Re-initialising QBO...')
    if (qboRefreshIsRunning) throw new Error('Another instance of QBO refresh ongoing.')
    qboRefreshIsRunning = true
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
        debug(JSON.stringify(data.QueryResponse.Account[0]))
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
    debug('Running QBO token refresh.')
    if (QBO === null || typeof QBO !== 'object') throw new Error('QBO is not a object.')

    // get the token
    return QBO.refreshAccessTokenAsync().then(token => {
        if (token.error && token.error.indexOf('invalid') > -1) {
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
    qboRefreshIsRunning = false
    global.QBONextRetry = moment().add(retryDuration, 'ms')
    //refreshTokenEveryFiftyMinute.stop()
    clearTimeout(refreshTokenEveryFiftyMinute)
}

function succeeded() {
    debug('QBO is initialised')
    global.QBOIsWorking = true
    qboRefreshIsRunning = false
    // set the token refresh cron
    //if (process.env.NODE_ENV === 'production') return refreshTokenEveryFiftyMinute.start()
    // extremely lousy way of coding, referencing #start. fucking sucks..
    if (process.env.NODE_ENV === 'production') return refreshTokenEveryFiftyMinute = setTimeout(start, 50*60*1000) // 50 minutes.
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
