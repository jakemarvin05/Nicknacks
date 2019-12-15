const express = require('express');
const router = express.Router();
const path = require('path');

/* GET home page. */
router.get('/', (req, res) => {
    res.status(404).send()
});

/* GET home page. */
router.get('/admin_' + process.env.ADMIN_URL_SUFFIX + '*', (req, res) => {
    if(!global.QBOIsWorking) {
        res.send('QBO is not working. Please initialise QBO token.')
    } else {
        res.render('admin')
    }
})

module.exports = router;
