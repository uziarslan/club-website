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


function convertDateFormat(date) {
    const [month, day, year] = date.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

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

            const dob = row.dob;
            const formattedDate = convertDateFormat(dob);

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
                dob: formattedDate,
                parent: row.parent,
                phone: row.phone,
                address: row.address,
                image: {
                    filename: "Manual added file",
                    path: row.image
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