const express = require('express');
const mongoose = require('mongoose');
const Admin = mongoose.model('Admin');
const Student = mongoose.model('Student');
const Coach = mongoose.model("Coach");
const Team = mongoose.model('Team')
const wrapAsync = require('../utils/wrapAsync');
const { isAdmin } = require('../middlewares');
const router = express();


router.get('/', wrapAsync(async (req, res) => {
    const teams = await Team.find({});
    res.render('./homepage/homepage', { teams });
}));



module.exports = router;