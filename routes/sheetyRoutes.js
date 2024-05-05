const express = require('express');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const wrapAsync = require('../utils/wrapAsync');
const Student = mongoose.model('Student');
const Team = mongoose.model('Team');

const upload = multer({ dest: 'public/uploads' });
const router = express.Router();


router.post('/upload-csv', upload.single('csvFile'), wrapAsync(async (req, res) => {
    const { teamId, coachId } = req.body;
    fs.createReadStream(req.file.path)
        .pipe(csv({ mapHeaders: ({ header, index }) => header.toLowerCase().replace(/\W/g, '_').replace(/^_+/, '') })) // Map headers to keys and remove leading underscores
        .on('data', async (row) => {

            // Check for the students in database if not found then look for the jersey number in that same team
            const team = await Team.findById(teamId);
            const foundStudent = await Student.findOne({ username: row.username });
            const foundJersey = await Student.findOne({
                team: teamId,
                dop: row.dop,
                jersey: row.jersey
            });

            if (!foundStudent && !foundJersey) {
                // Calculate the age from the dob
                const dateOfBirth = new Date(row.dob);
                const today = new Date();
                let age = today.getFullYear() - dateOfBirth.getFullYear();
                const m = today.getMonth() - dateOfBirth.getMonth();

                if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
                    age--;
                }
                // register the student to save their password
                const student = new Student({
                    ...row,
                    team: teamId,
                    coach: coachId,
                    age,
                    association: team.name
                });

                await Student.register(student, row.password);
            }
        })
        .on('end', () => {
            // Delete the uploaded CSV file
            fs.unlinkSync(req.file.path);
            req.flash("success", "Players created successfully.")
            return res.redirect("/admin/dashboard")
        });
}));

module.exports = router;
