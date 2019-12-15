const QuickBooks = require('node-quickbooks')
const rp = require('request-promise')
const parseString = require('xml2js').parseString
const debug = require('debug')('nn:apps:qbotoken')

function retrieveTokenAndRefresh() {
    // get the token
    DB.Token.findById(1).then(function (token) {

        // check validity of token data.
        if (!token || !token.data || !token.data.access_token || !token.data.refresh_token) {
            throw new Error('CRITICAL: Obtaining token from database failed.')
        }

        let accessToken = token.data

        // NOTE: OAuth2 Access token `access_token` will expire 1 hour from the point it is created.
        //       The refresh token `refresh_token` will expire in 100 days if not used.
        //       Before every hour (expiry limit of Access Token), the tokens are refreshed.
        //       The new tokens are then stored and QBO is re-initialised with the new tokens.


        // initialise QBO
        // access_token may be outdated, it is not a problem.
        global.QBO = new QuickBooks(
            process.env.qbo_consumerKey,
            process.env.qbo_consumerSecret,
            accessToken.access_token, /* oAuth access token */
            false, /* no token secret for oAuth 2.0 */
            process.env.qbo_realmID,
            (process.env.environment === 'production' ? false : true), /* use a sandbox account */
            false, /* turn debugging on */
            34, /* minor version */
            '2.0', /* oauth version */
            accessToken.refresh_token /* refresh token */
        )

        global.QBO = PROMISE.promisifyAll(global.QBO)

        return refreshQBOToken(accessToken)

    }).catch(function (err) {
        console.log(err)
        // log the error
        API_ERROR_HANDLER(err)

    });




    // connect to quickbooks to refresh token. returns a promise
    function refreshQBOToken(accessToken) {
        console.log(accessToken)
        console.log('running QBO token refresh.')

        // somehow the node-quickbooks literature is not updated, or promisify changed the
        // behaviour of #refreshAccessTokenAsync, by allowing only a single argument in callback.
        // hence this response is checked for errors.

        // return global.QBO.refreshAccessTokenAsync().then(function(response) {
        //     if(D.get(response, 'error')) {
        //         let error = new Error('Error in request for refreshing QBO token.')
        //         error.debug = response
        //         error.status = 500
        //         error.level = 'high'
        //         error.noLogging = false
        //
        //         throw error
        //     }
        //     if(!response || !response.refresh_token || !response.access_token) {
        //         let error = new Error('Unexpected response in refreshing token.')
        //         error.debug = response
        //         error.status = 500
        //         error.level = 'high'
        //         error.noLogging = false
        //         throw error
        //     }
        //     console.log(response)
        //
        //     accessToken = authResponse.getJson();
        //     var companyId = authResponse.token.realmId;
        //
        //     // re-initialise QBO
        //     QBO = new QuickBooks(
        //         process.env.qbo_consumerKey,
        //         process.env.qbo_consumerSecret,
        //         accessToken.access_token, /* oAuth access token */
        //         false, /* no token secret for oAuth 2.0 */
        //         process.env.qbo_realmID,
        //         (process.env.qbo_environment === 'production' ? false : true), /* use a sandbox account */
        //         false, /* turn debugging on */
        //         34, /* minor version */
        //         '2.0', /* oauth version */
        //         accessToken.refresh_token /* refresh token */
        //     )
        //
        //
        //     console.log(11111)
        //     console.log(QBO.refreshToken)
        //     console.log(QBO.token)
        //     console.log(2222)
        //
        //     //update the token
        //     return DB.Token.update({
        //         data: response
        //     }, {
        //         where: {
        //             TokenID: 1
        //         }
        //     })
        //
        // }).then(function() {
        //     console.log('QBO token successfully updated.')
        // })

        return global.oauthClient.refresh().then(function(authResponse) {
            console.log(authResponse)
            console.log('Tokens refreshed : ' + JSON.stringify(authResponse.getJson()));

            var accessToken = authResponse.getJson();
            var companyId = authResponse.token.realmId;

            QBO = new QuickBooks(
                process.env.qbo_consumerKey,
                process.env.qbo_consumerSecret,
                accessToken.access_token, /* oAuth access token */
                false, /* no token secret for oAuth 2.0 */
                companyId,
                (process.env.qbo_environment === 'production' ? false : true), /* use a sandbox account */
                false, /* turn debugging on */
                34, /* minor version */
                '2.0', /* oauth version */
                accessToken.refresh_token /* refresh token */
            )

             // update the token
             return DB.Token.update({
                 data: accessToken
             }, {
                 where: {
                     TokenID: 1
                 }
             })

         })
    }


    // attempt refresh every 50 min
    setInterval(retrieveTokenAndRefresh, 100);
    //setInterval(retrieveTokenAndRefresh, 3e+6);
}
module.exports = retrieveTokenAndRefresh
