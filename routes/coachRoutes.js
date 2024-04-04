const express = require('express');
const mongoose = require('mongoose');
const Coach = mongoose.model('Coach');
const Team = mongoose.model('Team');
const passport = require('passport')
const wrapAsync = require('../utils/wrapAsync');
const { isCoach } = require('../middlewares');
const router = express();


// Defining routes
router.get('/coach/register', wrapAsync(async (req, res) => {
    const teams = await Team.find({});
    res.render('./coach/coachSignup', { teams });
}));

router.post('/coach/register', wrapAsync(async (req, res) => {
    const { username, password, team } = req.body;
    const foundCoach = await Coach.find({ username });

    if (foundCoach.length) {
        res.flash('error', "The coach is already registered.")
        return res.redirect("/coach/register")
    }

    const coach = new Coach({ ...req.body, team: team });

    await Team.findByIdAndUpdate(team, {
        $addToSet: { coaches: coach._id }
    }, { new: true });

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

router.get('/coach/:id', isCoach, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const dop = ['7U', '8U', '9U', '10U', '11U', '12U', '13U']
    const coach = await Coach.findById(id).populate('students').populate('team');

    const footballers = coach.students.filter(student => student.role === 'football');
    const cheerleaders = coach.students.filter(student => student.role === "cheer");
    const approved_students = coach.students.filter(student => student.status === "approved");
    const pending_students = coach.students.filter(student => student.status === "pending");
    const disqualified_students = coach.students.filter(student => student.status === "disqualified");

    res.render('./coach/coachDash', {
        coach,
        footballers,
        cheerleaders,
        dop,
        approved_students,
        pending_students,
        disqualified_students,
    });
}));

router.get('/coach/:id/:dopNum', isCoach, wrapAsync(async (req, res) => {
    const { id, dopNum } = req.params;
    const dop = ['7U', '8U', '9U', '10U', '11U', '12U', '13U']
    const coach = await Coach.findById(id).populate('team').populate({
        path: 'students',
        match: { dop: dopNum }
    });;

    const footballers = coach.students.filter(student => student.role === 'football');
    const cheerleaders = coach.students.filter(student => student.role === "cheer");
    const approved_students = coach.students.filter(student => student.status === "approved");
    const pending_students = coach.students.filter(student => student.status === "pending");
    const disqualified_students = coach.students.filter(student => student.status === "disqualified");

    res.render('./coach/devision', {
        coach,
        dop,
        cheerleaders,
        footballers,
        dopNum,
        approved_students,
        pending_students,
        disqualified_students,
    });
}));

module.exports = router;