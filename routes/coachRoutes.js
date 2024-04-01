const express = require('express');
const mongoose = require('mongoose');
const Coach = mongoose.model('Coach');
const passport = require('passport')
const wrapAsync = require('../utils/wrapAsync');
const router = express();


// Defining routes
router.get('/coach/register', wrapAsync(async (req, res) => {
    res.render('./coach/coachSignup');
}));

router.post('/coach/register', wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    const foundCoach = await Coach.find({ username });

    if (foundCoach.length) {
        res.flash('error', "The coach is already registered.")
        return res.redirect("/coach/register")
    }

    const coach = new Coach({ ...req.body });
    const registeredCoach = await Coach.register(coach, password, (err, newCoach) => {
        if (err) {
            next(err)
        }
        req.logIn(newCoach, () => {
            res.send(`Coach is registered to the database successfully.`)
        });
    });
}));


router.get('/student', wrapAsync(async (req, res) => {
    const { id } = req.params;
    res.render("dashboard")
}))

module.exports = router;