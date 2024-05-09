const express = require('express');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const wrapAsync = require('../utils/wrapAsync');
const Student = mongoose.model('Student');
const Team = mongoose.model('Team');
const path = require('path')

const upload = multer({ dest: 'public/uploads' });
const router = express.Router();


router.get('/download-demo', (req, res) => {
    const filePath = path.join(__dirname, "..", 'public', 'uploads', 'demo.csv');

    fs.stat(filePath, (err, stats) => {
        if (err) {
            return res.status(404).send('File not found');
        }

        res.setHeader('Content-Disposition', 'attachment; filename=demo.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Length', stats.size);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    });
});


router.post('/upload-csv', upload.single('csvFile'), wrapAsync(async (req, res) => {
    const { teamId, coachId } = req.body;
    const { user } = req;
    let hasErrors = false;
    let processedRows = 0;
    let totalRows = 0;
    let errors = []
    const stream = fs.createReadStream(req.file.path)
        .pipe(csv({ mapHeaders: ({ header, index }) => header.toLowerCase().replace(/\W/g, '_').replace(/^_+/, '') })) // Map headers to keys and remove leading underscores
        .on('data', async (row) => {
            console.log("inside data")
            if (hasErrors) return;

            totalRows++;

            const team = await Team.findById(teamId);
            const foundStudent = await Student.findOne({ username: row.username });
            const foundJersey = await Student.findOne({
                team: teamId,
                dop: row.dop,
                jersey: row.jersey
            });

            if (foundStudent) {
                errors.push(`Email duplication error user ${row.username} already registered!`)
                // req.flash("error", `Email duplication error user ${row.username} already registered!`);
                // hasErrors = true;
                return;
            }

            if (foundJersey) {
                errors.push(`Jersey duplication error user ${row.username} contains jersey# ${row.jersey} is already taken!`)
                // req.flash("error", `Jersey duplication error user ${row.username} contains jersey# ${row.jersey} is already taken!`);
                // hasErrors = true;
                return;
            }

            const dateOfBirth = new Date(row.dob);
            const today = new Date();
            let age = today.getFullYear() - dateOfBirth.getFullYear();
            const m = today.getMonth() - dateOfBirth.getMonth();

            if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
                age--;
            }

            const student = new Student({
                ...row,
                team: teamId,
                coach: coachId,
                age,
                association: team.name
            });

            await Student.register(student, row.password);

            processedRows++;
            if (processedRows === totalRows && !hasErrors) {
                // All rows processed without errors
                req.flash("success", "Players created successfully.");
                return res.redirect(`/coach/${user._id}`);
            } else {
                req.flash("error", "Players created successfully.");
                return res.redirect(`/coach/${user._id}`);
            }
        });

    // Perform cleanup after the stream has been processed
    stream.on('close', () => {
        fs.unlinkSync(req.file.path);
        console.log(errors)
        if (errors.length) {
            req.flash('error', errors[0])
        } else {
            req.flash('success', 'Players created successfully.')
        }
        console.log("inside close")
        return res.redirect(`/coach/${user._id}`);
    });
}));



router.post('/upload-csv', upload.single('csvFile'), wrapAsync(async (req, res) => {
    const { teamId, coachId } = req.body;
    const { user } = req;

    fs.createReadStream(req.file.path)
        .pipe(csv({ mapHeaders: ({ header, index }) => header.toLowerCase().replace(/\W/g, '_').replace(/^_+/, '') })) // Map headers to keys and remove leading underscores
        .on('data', async (row) => {

            const team = await Team.findById(teamId);
            const foundStudent = await Student.findOne({ username: row.username });
            const foundJersey = await Student.findOne({
                team: teamId,
                dop: row.dop,
                jersey: row.jersey
            });

            if (foundStudent) {
                req.flash("error", `Email duplication error user ${row.username} already registered!`);
                return
            }

            if (foundJersey) {
                req.flash("error", `Jersey duplication error user ${row.username} contains jersey# ${row.jersey} is already taken!`);
                return
            }

            const dateOfBirth = new Date(row.dob);
            const today = new Date();
            let age = today.getFullYear() - dateOfBirth.getFullYear();
            const m = today.getMonth() - dateOfBirth.getMonth();

            if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
                age--;
            }

            const student = new Student({
                team: teamId,
                coach: coachId,
                age,
                association: team.name,
                role: row.role,
                username: row.username,
                dop: row.dop,
                fullname: row.fullname,
                jersey: row.jersey,
                dob: row.dob,
                parent: row.parent,
                phone: row.phone,
                address: row.address,
                image: {
                    filename: "Manual added file",
                    path: row.path
                },
            });

            await Student.register(student, row.password);
        })
        .on('end', () => {
            fs.unlinkSync(req.file.path);
            return res.redirect(`/coach/${user._id}`);
        });
}));


module.exports = router;
