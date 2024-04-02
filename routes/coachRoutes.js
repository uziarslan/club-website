const express = require('express');
const mongoose = require('mongoose');
const Coach = mongoose.model('Coach');
const Teams = mongoose.model('Team');
const passport = require('passport')
const wrapAsync = require('../utils/wrapAsync');
const router = express();


// Defining routes
router.get('/coach/register', wrapAsync(async (req, res) => {
    const teams = await Teams.find({});
    res.render('./coach/coachSignup', { teams });
}));

router.post('/coach/register', wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    const foundCoach = await Coach.find({ username });

    if (foundCoach.length) {
        res.flash('error', "The coach is already registered.")
        return res.redirect("/coach/register")
    }

    const coach = new Coach({ ...req.body });
    await Coach.register(coach, password, (err, newCoach) => {
        if (err) {
            next(err)
        }
        req.logIn(newCoach, () => {
            res.send(`Coach is registered to the database successfully.`)
        });
    });
}));

router.get('/coach/login', wrapAsync(async (req, res) => {
    res.render('./coach/coachLogin');
}));

router.post('/coach/login', (req, res, next) => {
    passport.authenticate('coach', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('error', 'Invalid Email or Password');
            return res.redirect('/coach/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            if (user instanceof Coach) {
                req.flash('success', `Welcome back ${user.fullname}!`);
                return res.redirect(`/coach/${user._id}`);
            }
        });
    })(req, res, next);
});

router.get('/coach/:id', wrapAsync(async (req, res) => {
    const { id } = req.params;
    const coach = await Coach.findById(id);
    res.render('./coach/coachDash', { coach });
}));

module.exports = router;