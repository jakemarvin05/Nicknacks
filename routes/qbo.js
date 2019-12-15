var express = require('express');
var router = express.Router();
var request = require('request');
var rp = require('request-promise');
var QuickBooks = require('node-quickbooks');
QuickBooks.setOauthVersion('2.0');
var qs = require('querystring');
var Tokens = require('csrf');
var csrf = new Tokens();

var consumerKey = process.env.qbo_consumerKey
var consumerSecret = process.env.qbo_consumerSecret


router.all('*', function(req, res, next) {
    if (process.env.QBO_ALLOW_LOCKED_ROUTES !== 'true') return res.status(403).send();
    next();
});

// OAUTH 2 makes use of redirect requests
function generateAntiForgery (session) {
    session.secret = csrf.secretSync()
    return csrf.create(session.secret)
}

router.get('/requestToken', function (req, res) {

    if(process.env.QBO_ALLOW_LOCKED_ROUTES !== 'true') return res.status(400).send();

    var redirecturl = QuickBooks.AUTHORIZATION_URL +
        '?client_id=' + consumerKey +
        '&redirect_uri=' + encodeURIComponent(process.env.DOMAIN + '/qbo/callback/') +  //Make sure this path matches entry in application dashboard
        '&scope=com.intuit.quickbooks.accounting' +
        '&response_type=code' +
        '&state=' + generateAntiForgery(req.session);

    res.redirect(redirecturl);
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


    var auth = (new Buffer(consumerKey + ':' + consumerSecret).toString('base64'));

    var postBody = {
        url: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + auth,
        },
        form: {
        grant_type: 'authorization_code',
        code: req.query.code,
        redirect_uri: process.env.DOMAIN + '/qbo/callback/'  //Make sure this path matches entry in application dashboard
        }
    }


    rp.post(postBody, function (e, r, data) {

        var accessToken = JSON.parse(r.body);

        // save the access token somewhere on behalf of the logged in user
        QBO = new QuickBooks(
            consumerKey,
            consumerSecret,
            accessToken.access_token, /* oAuth access token */
            false, /* no token secret for oAuth 2.0 */
            req.query.realmId,
            false, /* use a sandbox account */
            true, /* turn debugging on */
            4, /* minor version */
            '2.0', /* oauth version */
            accessToken.refresh_token /* refresh token */
        )

        QBO.findAccounts(function (_, accounts) {
            accounts.QueryResponse.Account.forEach(function (account) {
                console.log(account.Name);
            })
        })

    }).then(function (response) {

        //_ACCESS_TOKEN = qs.parse(response);

        _ACCESS_TOKEN = accessToken.access_token

        console.log(accessToken)
        //
        // global.QBO_ACCESS_TOKEN = _ACCESS_TOKEN.oauth_token;
        // global.QBO_ACCESS_TOKEN_SECRET = _ACCESS_TOKEN.oauth_token_secret;
        //
        // // save the token
        // return DB.Token.findOrCreate({
        //
        //     where: { TokenID: 1 },
        //
        //     defaults: { data: _ACCESS_TOKEN }
        //
        // });

    }).spread(function(token, created) {

        // // if not created, update the current token
        // if (!created) {
        //
        //     return token.update({ data: _ACCESS_TOKEN });
        //
        // } else { return false; }

    })

    res.send('<!DOCTYPE html><html lang="en"><head></head><body><script>window.opener.location.reload(); window.close();</script></body></html>');
});

router.get('/accounts', function(req, res, next) {

    QBO.findAccounts(function(_, accounts) {
      accounts.QueryResponse.Account.forEach(function(account) {
        console.log(account.Name)
      })
    });

    res.send();
});

module.exports = router;
