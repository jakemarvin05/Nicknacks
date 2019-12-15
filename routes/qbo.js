var express = require('express');
var router = express.Router();
var request = require('request');
var rp = require('request-promise');
var QuickBooks = require('node-quickbooks');
QuickBooks.setOauthVersion('2.0');
var qs = require('querystring');
var Tokens = require('csrf');
var csrf = new Tokens();

var OAuthClient = require('intuit-oauth');

var config = {
    clientId: process.env.qbo_consumerKey,
    clientSecret: process.env.qbo_consumerSecret,
    environment: process.env.qbo_environment,
    redirectUri: process.env.DOMAIN + '/qbo/callback'
}

var oauthClient, companyId


router.all('*', function(req, res, next) {
    if (process.env.QBO_ALLOW_LOCKED_ROUTES !== 'true') return res.status(403).send();
    next();
});


router.get('/requestToken', function (req, res) {

    if(process.env.QBO_ALLOW_LOCKED_ROUTES !== 'true') return res.status(400).send();

    oauthClient = new OAuthClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      environment: config.environment,
      redirectUri: config.redirectUri
    });

    var authUri = oauthClient.authorizeUri({scope:[OAuthClient.scopes.Accounting,OAuthClient.scopes.OpenId],state:'nicknacks'});

    res.redirect(authUri);

})

// deprecated OAuth 1.0
// router.get('/requestToken', function(req, res) {
//
//     if (process.env.QBO_ALLOW_LOCKED_ROUTES !== 'true') return res.status(403).send();
//
//     rp({
//         method: 'POST',
//         uri: QuickBooks.REQUEST_TOKEN_URL,
//         body: {},
//         oauth: {
//             callback: process.env.DOMAIN + '/qbo/callback',
//             consumer_key: process.env.qbo_consumerKey,
//             consumer_secret: process.env.qbo_consumerSecret
//         },
//         json: true
//     }).then(function (response) {
//
//         var requestToken = qs.parse(response);
//
//         if (!requestToken.oauth_token || !requestToken.oauth_token_secret) return res.status(400).send('Unable to get 2nd leg token from QBO API.');
//
//         // attach session with secret
//         req.session.oauth_token_secret = requestToken.oauth_token_secret;
//
//         // redirect to QBO authorisation
//         res.redirect(QuickBooks.APP_CENTER_URL + requestToken.oauth_token);
//
//     }).catch(function (err) {
//
//         if (err.statusCode) {
//             res.status(err.statusCode)
//         } else {
//             res.status(500);
//         }
//
//         res.send(err);
//
//     });
//
// });

// router.get('/callback', function(req, res) {
//
//     if(process.env.QBO_ALLOW_LOCKED_ROUTES !== 'true') return res.status(400).send();
//
//     if(req.query.realmId !== process.env.qbo_realmID) return res.status(400).send('The server is not value for the company you have selected.');
//
//     var _ACCESS_TOKEN;
//     rp({
//         method: 'POST',
//         uri: QuickBooks.ACCESS_TOKEN_URL,
//         body: {},
//         oauth: {
//             consumer_key:    process.env.qbo_consumerKey,
//             consumer_secret: process.env.qbo_consumerSecret,
//             token:           req.query.oauth_token,
//             token_secret:    req.session.oauth_token_secret,
//             verifier:        req.query.oauth_verifier,
//             realmId:         process.env.qbo_realmID
//         },
//         json: true
//     }).then(function (response) {
//
//         _ACCESS_TOKEN = qs.parse(response);
//
//         global.QBO_ACCESS_TOKEN = _ACCESS_TOKEN.oauth_token;
//         global.QBO_ACCESS_TOKEN_SECRET = _ACCESS_TOKEN.oauth_token_secret;
//
//         // save the token
//         return DB.Token.findOrCreate({
//
//             where: { TokenID: 1 },
//
//             defaults: { data: _ACCESS_TOKEN }
//
//         });
//
//     }).spread(function(token, created) {
//
//         // if not created, update the current token
//         if (!created) {
//
//             return token.update({ data: _ACCESS_TOKEN });
//
//         } else { return false; }
//
//     }).then(function() {
//
//         //save the access token somewhere on behalf of the logged in user
//         global.QBO = new QuickBooks(
//             process.env.qbo_consumerKey,
//             process.env.qbo_consumerSecret,
//             _ACCESS_TOKEN.oauth_token,
//             _ACCESS_TOKEN.oauth_token_secret,
//             process.env.qbo_realmID,
//             false, // use the Sandbox
//             true
//         ); // turn debugging on
//
//         global.QBO = PROMISE.promisifyAll(global.QBO);
//
//         // test out account access
//         return QBO.findAccountsAsync(function(_, accounts) {
//           accounts.QueryResponse.Account.forEach(function(account) {
//             console.log(account.Name)
//           })
//         });
//
//         res.send('success');
//
//     }).catch(function (err) {
//
//         if (err.statusCode) {
//             res.status(err.statusCode)
//         } else {
//             res.status(500);
//         }
//
//         res.send(err);
//
//     });
//
// });

router.get('/callback', function (req, res) {

    if(process.env.QBO_ALLOW_LOCKED_ROUTES !== 'true') return res.status(400).send();


    var accessToken;

    oauthClient.createToken(req.url).then(function(authResponse) {
        accessToken = authResponse.getJson();
        companyId = authResponse.token.realmId;

        // update the token
        return DB.Token.update({
            data: accessToken
        }, {
            where: {
                TokenID: 1
            }
        })
    }).then(function(){

            // initialise QBO
            QBO = new QuickBooks(
                oauthClient.clientId,
                oauthClient.clientSecret,
                accessToken.access_token, /* oAuth access token */
                false, /* no token secret for oAuth 2.0 */
                companyId,
                (config.environment === 'production' ? false : true), /* use a sandbox account */
                false, /* turn debugging on */
                34, /* minor version */
                '2.0', /* oauth version */
                accessToken.refresh_token /* refresh token */
            )

            // run a query to ensure it is working.
            QBO.findAccounts(function (_, accounts) {
                accounts.QueryResponse.Account.forEach(function (account) {
                    console.log(account.Name);
                });
            });

            res.send('Successfully obtained token!')

        }).catch(function(e) {
            console.error(e);
            res.send(e)
        })

});

router.get('/accounts', function(req, res, next) {

    if(process.env.QBO_ALLOW_LOCKED_ROUTES !== 'true') return res.status(400).send();


    QBO.findAccounts(function (err, accounts) {
        if (err) {

            let error = new Error('Error in testing QBO.')
            error.debug = JSON.stringify(err)
            API_ERROR_HANDLER(error)

        } else {
            accounts.QueryResponse.Account.forEach(function (account) {
                console.log(account.Name);
            });

            res.send('success!')
        }

    });

});

module.exports = router;
