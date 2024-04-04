const express = require('express');
const mongoose = require('mongoose');
const Student = mongoose.model('Student')
const Coach = mongoose.model('Coach')
const Team = mongoose.model('Team')
const passport = require('passport')
const wrapAsync = require('../utils/wrapAsync');
const multer = require('multer');
const { storage } = require('../cloudinary');
const { isStudent } = require('../middlewares');
const upload = multer({ storage });
const { uploader } = require('cloudinary').v2
const router = express();


// Defining routes
router.get('/student/register/:teamId', wrapAsync(async (req, res) => {
    const dop = ['7U', '8U', '9U', '10U', '11U', '12U', '13U']

    const { teamId } = req.params;
    const team = await Team.findById(teamId).populate('coaches');
    res.render('./student/register', { team, dop });
}));

router.post('/student/register/:teamId', upload.single('image'), wrapAsync(async (req, res) => {
    const { username, password, dop, jersey } = req.body;
    const { teamId } = req.params;
    const foundStudent = await Student.find({ username });
    const foundJersey = await Student.find({
        team: teamId,
        dop,
        jersey
    });

    if (foundJersey.length) {
        req.flash('error', 'Looks like that jersey number is already on the team. Please choose a different one.');
        await uploader.destroy(req.file.filename);
        return res.redirect(`/student/register/${teamId}`);
    }

    if (foundStudent.length) {
        req.flash('error', "It looks like a student with this email is already registered.");
        await uploader.destroy(req.file.filename)
        return res.redirect(`/student/register/${teamId}`);
    }

    const { filename, path } = req.file;

    const student = new Student({
        ...req.body,
        team: teamId,
        coach: req.body.coach,
    });


    student.image.filename = filename;
    student.image.path = path;

    await Team.findByIdAndUpdate(teamId, {
        $addToSet: { students: student._id }
    }, { new: true });

    await Coach.findByIdAndUpdate(req.body.coach, {
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

router.get('/student/:id/:teamId', isStudent, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { teamId } = req.params;
    const team = await Team.findById(teamId).populate('students');
    const student = await Student.findById(id).populate('coach');
    res.render("./student/student", { student, team })
}))

module.exports = router;