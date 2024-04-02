const express = require('express');
const mongoose = require('mongoose');
const Student = mongoose.model('Student')
const Coach = mongoose.model('Coach')
const Team = mongoose.model('Team')
const passport = require('passport')
const wrapAsync = require('../utils/wrapAsync');
const router = express();


// Defining routes
router.get('/student/register/:teamId', wrapAsync(async (req, res) => {
    const { teamId } = req.params;
    const coaches = await Coach.find({ status: 'approved' });
    const team = await Team.findById(teamId);

    res.render('./student/register', { coaches, team });
}));

router.post('/student/register/:teamId', wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    const { teamId } = req.params;
    const foundStudent = await Student.find({ username });

    if (foundStudent.length) {
        req.flash('error', "The student is already registered.")
        return res.redirect(`/student/register/${teamId}`)
    }

    const student = new Student({ ...req.body, team: teamId, coach: req.body.coach });

    await Team.findByIdAndUpdate(teamId, {
        $addToSet: { students: student._id }
    }, { new: true });

    await Student.register(student, password, (err, newStudent) => {
        if (err) {
            next(err)
        }
        req.logIn(newStudent, () => {
            res.redirect(`/student/${newStudent._id}/${teamId}`);
        });
    });
}));

router.get('/student/login', wrapAsync(async (req, res) => {
    res.render('./student/login');
}));

router.post('/student/login', (req, res, next) => {
    passport.authenticate('student', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('error', 'Invalid Email or Password');
            return res.redirect('/student/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            if (user instanceof Student) {
                req.flash('success', `Welcome back ${user.fullname}!`);
                return res.redirect(`/student/${user._id}/${user.team._id}`);
            }
        });
    })(req, res, next);
});

router.get('/student/:id/:teamId', wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { teamId } = req.params;
    const team = await Team.findById(teamId).populate('students');
    const student = await Student.findById(id).populate('coach');
    // res.send(student)
    res.render("./student/student", { student, team })
}))

module.exports = router;