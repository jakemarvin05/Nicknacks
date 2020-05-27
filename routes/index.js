const express = require('express');
const router = express.Router();
const path = require('path');

/* GET home page. */
router.get('/', (req, res) => {
    res.send()
});

/* GET home page. */
router.get('/admin_' + process.env.ADMIN_URL_SUFFIX + '*', (req, res) => {
    if(!global.QBOIsWorking && process.env.NODE_ENV !== "development") {
        let msg = 'QBO is not working. '
        if (global.QBONextRetry) {
            msg += `Next retry at ${global.QBONextRetry.format('MMMM Do YYYY, h:mm a')}.`
        } else {
            msg += 'Please contact administrator to reset QBO token.'
        }
        res.send(msg)
    } else {
        res.render('admin')
    }
})

router.get('/admin*', (req, res) => {
    res.render('admin')
})


router.get('/renford*', (req, res) => {
    res.render('admin')
})

module.exports = router;
