const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport')
const Admin = mongoose.model('Admin');
const Student = mongoose.model('Student');
const Coach = mongoose.model("Coach");
const Team = mongoose.model('Team');
const PDFDocument = require('pdfkit');
const wrapAsync = require('../utils/wrapAsync');
const { isAdmin } = require('../middlewares');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const fetch = require('node-fetch')
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
    const dop = ['7U', '8U', '9U', '10U', '11U', '12U', '13U']
    const { user } = req;
    const teams = await Team.find({});
    const coaches = await Coach.find({ status: 'approved' });
    all_coaches = (await Coach.find({})).length;
    res.render('./admin/adminDashboard', {
        admin: user,
        all_coaches,
        coaches,
        teams,
        dop
    });
}));

// Managing students
router.get('/admin/students', isAdmin, wrapAsync(async (req, res) => {
    const { user } = req;
    const pending_students = await Student.find({ status: 'pending' }).populate('coach');
    const approved_students = await Student.find({ status: 'approved' }).populate('coach');
    const disqualified_students = await Student.find({ status: 'disqualified' }).populate('coach');
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
        admin: user,
        all_students
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
    const pending_coaches = await Coach.find({ status: 'pending' }).populate('team');
    const approved_coaches = await Coach.find({ status: 'approved' }).populate('team');
    const disqualified_coaches = await Coach.find({ status: 'disqualified' }).populate('team');
    const all_coaches = (await Coach.find({})).length;

    approved_progress = (approved_coaches.length / all_coaches) * 100;
    pending_progress = (pending_coaches.length / all_coaches) * 100;
    disqualified_progress = (disqualified_coaches.length / all_coaches) * 100;

    res.render('./admin/adminCoaches', {
        all_coaches,
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
    const teams = await Team.find({});
    res.render('./admin/adminTeams', { admin: user, teams });
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

router.get('/admin/team/:teamId/edit', isAdmin, wrapAsync(async (req, res) => {
    const { user } = req;
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    res.render('./admin/adminEditTeam', { admin: user, team });
}));

// Generating a PDF
router.post('/generate/document', async (req, res) => {
    const { team, division, coach } = req.body;
    const t = await Team.findById(team).lean();
    const c = await Coach.findById(coach).lean();
    const filteredStudents = await Student.find({
        team: team,
        dop: division,
        coach: coach
    }).populate('team').populate('coach').lean();

    if (!filteredStudents.length) {
        req.flash('error', "Sorry, no data was found matching your selected filters. Please adjust your filters and try again.");
        return res.redirect('/admin/dashboard');
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${t.name}-${division}.pdf"`);

    doc.pipe(res);

    const response = await fetch(t.image.path);
    const logoBuffer = await response.buffer();
    doc.image(logoBuffer, 50, 40, { width: 50 })
        .fontSize(20)
        .text(`${t.name} - ${c.fullname}`, 110, 50);

    let currentYPosition = 100;

    for (const student of filteredStudents) {
        const studentResponse = await fetch(student.image.path);
        const imageBuffer = await studentResponse.buffer();

        if (currentYPosition > doc.page.height - 100) {
            doc.addPage();
            currentYPosition = 50;
        }

        doc.image(imageBuffer, 50, currentYPosition, { width: 100 });
        doc.fontSize(10)
            .text(`Name: ${student.fullname}`, 160, currentYPosition)
            .text(`DOB: ${student.dob}`, 160, currentYPosition + 20)
            .text(`Jersey #: ${student.jersey}`, 160, currentYPosition + 40)
            .text(`Role: ${student.role}`, 160, currentYPosition + 60);

        currentYPosition += 100;
    }

    doc.end();
});



module.exports = router;