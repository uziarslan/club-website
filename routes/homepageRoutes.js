const express = require('express');
const mongoose = require('mongoose');
const Student = mongoose.model('Student');
const Coach = mongoose.model("Coach");
const fs = require('fs');
const path = require('path');
const Team = mongoose.model('Team');
const qrcode = require('qrcode');
const wrapAsync = require('../utils/wrapAsync');
const router = express();


router.get('/', wrapAsync(async (req, res) => {
    const teams = await Team.find({}).populate({
        path: 'coaches',
        match: { status: "approved" }
    });
    res.render('./homepage/homepage', { teams });
}));

router.get('/:teamId/player/show', wrapAsync(async (req, res) => {
    const dop = ['7U', '8U', '9U', '10U', '11U', '12U', '13U']
    const { teamId } = req.params;
    const team = await Team.findById(teamId).populate('coaches').populate('students');
    const approved_students = team.students.filter(student => student.status === "approved");

    let filters = [];
    for (let division of dop) {
        let new_filter = {
            division: division,
            cheerleaders: approved_students.filter(student => student.dop === division && student.role === "cheer"),
            footballers: approved_students.filter(student => student.dop === division && student.role === "football")
        }
        filters.push(new_filter)
    }

    const approved_coaches = team.coaches.filter(coach => coach.status === "approved");

    res.render('./homepage/players', {
        students: approved_students,
        coaches: approved_coaches,
        team,
        filters
    });
}));


router.post('/download/qr/:teamId', wrapAsync(async (req, res) => {
    const { teamId } = req.params;
    if (teamId) {

        const team = await Team.findById(teamId);
        if (!team || !team.qrCode) {
            return res.status(404).send('QR code not found');
        }
        const base64Data = team.qrCode.split(';base64,').pop();
        const imgBuffer = Buffer.from(base64Data, 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="${team.name}.png"`
        });
        return res.end(imgBuffer);

    } else if (teamId === "homepage") {
        const filePath = path.join(__dirname, '..', 'public', 'images', 'homepageqr.png');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                return res.status(500).send('Error reading the file');
            }
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Disposition': 'attachment; filename="BigTriState.png"'
            });
            return res.end(data);
        });
    } else {
        const filePath = path.join(__dirname, '..', 'public', 'images', 'adminqr.png');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                return res.status(500).send('Error reading the file');
            }
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Disposition': 'attachment; filename="Admin.png"'
            });
            return res.end(data);
        });
    }
}))


// Change the domain name before going live

// router.get('/seed', wrapAsync(async (req, res) => {
//     const teams = await Team.find({});
//     for (let team of teams) {
//         qrcode.toDataURL(`https://bigtristate.com/${team._id}/player/show`, async function (err, url) {
//             team.qrCode = url
//             await team.save()
//         });
//     }
//     res.send("Qr Code added to the Teams");
// }));


module.exports = router;