const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport')
const Admin = mongoose.model('Admin');
const Student = mongoose.model('Student');
const Coach = mongoose.model("Coach");
const Team = mongoose.model('Team')
const wrapAsync = require('../utils/wrapAsync');
const { isAdmin } = require('../middlewares');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const { uploader } = require('cloudinary').v2
const router = express();


// Managing admin
router.get('/admin/register', wrapAsync(async (req, res) => {
    res.render('./admin/adminSignup');
}));

router.post('/admin', wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    const foundAdmin = await Admin.find({ username });

    if (foundAdmin.length) {
        res.flash('error', "The admin is already registered.")
        return res.redirect("/admin/register")
    }

    const admin = new Admin({ ...req.body, role: 'admin' });
    await Admin.register(admin, password, (err, newAdmin) => {
        if (err) {
            next(err)
        }
        req.logIn(newAdmin, () => {
            res.redirect(`/admin/dashboard`)
        });
    });
}));

router.get('/admin/login', wrapAsync(async (req, res) => {
    res.render('./admin/adminLogin')
}));

router.post('/admin/login', (req, res, next) => {
    passport.authenticate('admin', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('error', 'Invalid Email or Password');
            return res.redirect('/admin/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            if (user instanceof Admin) {
                req.flash('success', `Welcome back ${user.fullname}!`);
                return res.redirect(`/admin/dashboard`);
            }
        });
    })(req, res, next);
});

router.get('/admin/dashboard', isAdmin, wrapAsync(async (req, res) => {
    const { user } = req;
    const all_students = (await Student.find({})).length;
    const all_coaches = (await Coach.find({})).length;
    res.render('./admin/adminDashboard', {
        admin: user,
        all_students,
        all_coaches
    });
}));

// Managing students
router.get('/admin/students', isAdmin, wrapAsync(async (req, res) => {
    const { user } = req;
    const pending_students = await Student.find({ status: 'pending' });
    const approved_students = await Student.find({ status: 'approved' });
    const disqualified_students = await Student.find({ status: 'disqualified' });
    const all_students = (await Student.find({})).length;

    approved_progress = (approved_students.length / all_students) * 100;
    pending_progress = (pending_students.length / all_students) * 100;
    disqualified_progress = (disqualified_students.length / all_students) * 100;

    res.render('./admin/adminStudents', {
        pending_students,
        approved_students,
        disqualified_students,
        approved_progress,
        pending_progress,
        disqualified_progress,
        admin: user
    });
}));

router.get('/admin/student/approve/:id', isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Student.findByIdAndUpdate(id, { status: 'approved' });
    res.redirect('/admin/students')
}));

router.get('/admin/student/pending/:id', isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Student.findByIdAndUpdate(id, { status: 'pending' });
    res.redirect('/admin/students')
}));

router.get('/admin/student/disqualify/:id', isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Student.findByIdAndUpdate(id, { status: 'disqualified' });
    res.redirect('/admin/students')
}));


// Managing coaches
router.get('/admin/coaches', isAdmin, wrapAsync(async (req, res) => {
    const { user } = req;
    const pending_coaches = await Coach.find({ status: 'pending' });
    const approved_coaches = await Coach.find({ status: 'approved' });
    const disqualified_coaches = await Coach.find({ status: 'disqualified' });
    const all_coaches = (await Coach.find({})).length;

    approved_progress = (approved_coaches.length / all_coaches) * 100;
    pending_progress = (pending_coaches.length / all_coaches) * 100;
    disqualified_progress = (disqualified_coaches.length / all_coaches) * 100;

    res.render('./admin/adminCoaches', {
        pending_coaches,
        approved_coaches,
        disqualified_coaches,
        approved_progress,
        pending_progress,
        disqualified_progress,
        admin: user
    });
}));

router.get('/admin/coach/approve/:id', isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Coach.findByIdAndUpdate(id, { status: 'approved' });
    res.redirect('/admin/coaches')
}));

router.get('/admin/coach/pending/:id', isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Coach.findByIdAndUpdate(id, { status: 'pending' });
    res.redirect('/admin/coaches')
}));

router.get('/admin/coach/disqualify/:id', isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Coach.findByIdAndUpdate(id, { status: 'disqualified' });
    res.redirect('/admin/coaches')
}));

// Managing teams
router.get('/admin/teams', isAdmin, wrapAsync(async (req, res) => {
    const { user } = req;
    res.render('./admin/adminTeams', { admin: user });
}));

router.post('/admin/teams', isAdmin, upload.single('image'), wrapAsync(async (req, res) => {
    const foundTeam = await Team.find({ name: req.body.name });
    if (foundTeam.length) {
        req.flash('error', 'Team is already registered.');
        return res.redirect('/admin/teams');
    }
    const { filename, path } = req.file;
    const team = new Team({ ...req.body });
    team.image.filename = filename;
    team.image.path = path;
    team.save()
    req.flash('success', 'Team has been published');
    res.redirect('/admin/teams');
}));






module.exports = router;