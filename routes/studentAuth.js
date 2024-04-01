const express = require('express');
const mongoose = require('mongoose');
const Student = mongoose.model('Student')
const Coach = mongoose.model('Coach')
const passport = require('passport')
const wrapAsync = require('../utils/wrapAsync');
const router = express();


// Defining routes
router.get('/student/register', wrapAsync(async (req, res) => {
    const coaches = await Coach.find({});
    // res.send(coaches)
    res.render('./student/register', { coaches });
}));

router.post('/student/register', wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    const foundStudent = await Student.find({ username });

    if (foundStudent.length) {
        res.flash('error', "The student is already registered.")
        return res.redirect("/student/register")
    }

    const student = new Student({ ...req.body });
    const registerStudent = await Student.register(student, password, (err, newStudent) => {
        if (err) {
            next(err)
        }
        req.logIn(newStudent, () => {
            res.redirect(`/student/${newStudent._id}`)
        });
    });
}));


router.get('/student/:id', wrapAsync(async (req, res) => {
    const { id } = req.params;
    const student = await Student.findById(id);
    res.render("./student/student", { student })
}))

module.exports = router;