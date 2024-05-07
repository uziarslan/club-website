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
    const team = await Team.findById(teamId).populate({
        path: 'coaches',
        match: { status: 'approved' }
    });
    res.render('./student/register', { team, dop });
}));

router.post('/student/register/:teamId', upload.fields(
    [
        { name: "image", maxCount: 1 },
        { name: "captureImage", maxCount: 1 },
        { name: "document", maxCount: 6 },
    ]
), wrapAsync(async (req, res, next) => {
    const { username, password, dop, jersey, coach, dobYear, dobMonth, dobDate, documents, role, fullname, parent, phone, address } = req.body;
    dob = `${dobYear}-${dobMonth}-${dobDate}`;
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    const foundStudent = await Student.find({ username });
    const foundJersey = await Student.find({
        team: teamId,
        dop,
        jersey
    });

    const dateOfBirth = new Date(dob);

    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const m = today.getMonth() - dateOfBirth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
        age--;
    }


    if (coach === "none") {
        req.flash('error', 'You can not register without the coach.');
        await uploader.destroy(req.file.filename);
        return res.redirect(`/student/register/${teamId}`);
    }

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

    const student = new Student({
        coach: req.body.coach,
        team: teamId,
        role,
        association: team.name,
        username,
        dop,
        fullname,
        jersey,
        age,
        dob,
        parent,
        phone,
        address
    });

    if (req.files["image"]) {
        const { filename, path } = req.files["image"][0];
        student.image.filename = filename;
        student.image.path = path;
    }

    if (req.files["captureImage"]) {
        const { filename, path } = req.files["captureImage"][0];
        student.image.filename = filename;
        student.image.path = path;
    }

    if (req.files["document"]) {
        const docs = req.files["document"];
        docs.forEach((document, i) => {
            const { filename, path } = document;
            student.documents.push({ filename, path, documentName: documents[i] });
        });
    }


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
            res.redirect(`/invoice/${newStudent._id}`);
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
}));

router.get('/invoice/:id', wrapAsync(async (req, res) => {
    const { id } = req.params;
    const student = await Student.findById(id).populate('team').populate('coach');
    res.render('./student/invoice', { student });
}));

router.get('/s/:id/edit', wrapAsync(async (req, res) => {
    const { id } = req.params;
    const dop = ['7U', '8U', '9U', '10U', '11U', '12U', '13U']
    const student = await Student.findById(id).populate('coach');
    const team = await Team.findById(student.team).populate({
        path: 'coaches',
        match: { status: 'approved' }
    });
    res.render('./student/editinfo', { student, team, dop });
}));

router.put('/student/register/:teamId/:studentId', upload.single('image'), wrapAsync(async (req, res) => {
    const { role, association, username, dop, fullname, jersey, age, dob, parent, phone, address, coach } = req.body;
    const { teamId, studentId } = req.params;

    const student = await Student.findById(studentId);

    if (!student) {
        req.flash('error', 'Student not found.');
        return res.redirect(`/s/${studentId}/edit`);
    }

    await Team.findByIdAndUpdate(student.team, {
        $pull: { students: studentId }
    });

    await Coach.findByIdAndUpdate(student.coach, {
        $pull: { students: studentId }
    });

    if (coach === "none") {
        req.flash('error', 'You cannot register without selecting a coach.');
        await uploader.destroy(req.file.filename);
        return res.redirect(`/s/${studentId}/edit`);
    }

    const foundJersey = await Student.findOne({
        team: teamId,
        dop,
        jersey
    });

    if (foundJersey && foundJersey._id.toString() !== studentId) {
        req.flash('error', 'This jersey number is already assigned to another student in the team. Please choose a different one.');
        if (req.file) {
            await uploader.destroy(req.file.filename);
        }
        return res.redirect(`/s/${studentId}/edit`);
    }

    if (req.file) {
        await uploader.destroy(student.image.filename);
        const { filename, path } = req.file;
        student.image.filename = filename;
        student.image.path = path;
    }

    student.username = username;
    student.dop = dop;
    student.jersey = jersey;
    student.team = teamId;
    student.coach = coach;
    student.role = role
    student.association = association
    student.fullname = fullname
    student.age = age
    student.dob = dob
    student.parent = parent
    student.phone = phone
    student.address = address
    student.coach = coach
    await student.save();


    await Team.findByIdAndUpdate(teamId, {
        $addToSet: { students: studentId }
    });

    await Coach.findByIdAndUpdate(coach, {
        $addToSet: { students: studentId }
    });

    req.flash('success', 'Your information has been updated!')
    res.redirect(`/invoice/${studentId}`);
}));







module.exports = router;