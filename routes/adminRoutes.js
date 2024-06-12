const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport')
const Admin = mongoose.model('Admin');
const Student = mongoose.model('Student');
const Coach = mongoose.model("Coach");
const Team = mongoose.model('Team');
const wrapAsync = require('../utils/wrapAsync');
const { isAdmin } = require('../middlewares');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const { uploader } = require('cloudinary').v2
const qrcode = require('qrcode');
const router = express();

const { MailtrapClient } = require("mailtrap");

// Mailtrap Integration
const TOKEN = process.env.MAIL_TRAP_TOKEN;
const ENDPOINT = "https://send.api.mailtrap.io/";
const client = new MailtrapClient({ endpoint: ENDPOINT, token: TOKEN });
const sender = {
    email: "info@bigtristate.com",
    name: "Big Tri State",
}


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
    const pending_students = await Student.find({ status: 'pending' }).populate('coach').populate('team');
    const approved_students = await Student.find({ status: 'approved' }).populate('coach').populate('team');
    const disqualified_students = await Student.find({ status: 'disqualified' }).populate('coach').populate('team');
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

// router.get('/admin/student/approve/:id', isAdmin, wrapAsync(async (req, res) => {
//     const { id } = req.params;
//     const student = await Student.findByIdAndUpdate(id, { status: 'approved' }).populate("team").populate("coach");
//     client.send({
//         from: sender,
//         to: [{
//             email: student.username
//         }],
//         template_uuid: "b990abcd-d599-417c-9ff6-01f66c0e9bd2",
//         template_variables: {
//             "student": student,
//             "team": student.team,
//             "coach": student.coach
//         }
//     })
//     res.redirect('/admin/students')
// }));

// router.get('/admin/student/pending/:id', isAdmin, wrapAsync(async (req, res) => {
//     const { id } = req.params;
//     await Student.findByIdAndUpdate(id, { status: 'pending' });
//     res.redirect('/admin/students')
// }));

// router.get('/admin/student/disqualify/:id', isAdmin, wrapAsync(async (req, res) => {
//     const { id } = req.params;
//     await Student.findByIdAndUpdate(id, { status: 'disqualified' });
//     res.redirect('/admin/students')
// }));

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

// router.get('/admin/coach/approve/:id', isAdmin, wrapAsync(async (req, res) => {
//     const { id } = req.params;
//     const coach = await Coach.findByIdAndUpdate(id, { status: 'approved' }).populate('team');
//     client.send({
//         from: sender,
//         to: [{
//             email: coach.username
//         }],
//         template_uuid: "5f30205a-700d-49de-a51c-84adf71e3a68",
//         template_variables: {
//             "coach": coach,
//             "team": coach.team
//         }
//     });
//     res.redirect('/admin/coaches');
// }));

// router.get('/admin/coach/pending/:id', isAdmin, wrapAsync(async (req, res) => {
//     const { id } = req.params;
//     await Coach.findByIdAndUpdate(id, { status: 'pending' });
//     res.redirect('/admin/coaches')
// }));

// router.get('/admin/coach/disqualify/:id', isAdmin, wrapAsync(async (req, res) => {
//     const { id } = req.params;
//     await Coach.findByIdAndUpdate(id, { status: 'disqualified' });
//     res.redirect('/admin/coaches')
// }));

// Managing teams

router.get('/admin/teams', isAdmin, wrapAsync(async (req, res) => {
    const { user } = req;
    const teams = await Team.find({});
    res.render('./admin/adminTeams', { admin: user, teams });
}));

router.post('/admin/teams', isAdmin, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }, { name: 'teamImage', maxCount: 1 }]), wrapAsync(async (req, res) => {
    const foundTeam = await Team.find({ name: req.body.name });
    if (foundTeam.length) {
        req.flash('error', 'Team is already registered.');
        return res.redirect('/admin/teams');
    }

    const team = new Team({ ...req.body });

    if (req.files['image']) {
        const { filename, path } = req.files['image'][0];
        team.image = { filename, path };
    }

    if (req.files['teamImage']) {
        const { filename, path } = req.files['teamImage'][0];
        team.teamImage = { filename, path };
    }

    if (req.files['audio']) {
        const { filename, path, mimetype } = req.files['audio'][0];
        team.audio = { filename, path, contentType: mimetype };
    }

    qrcode.toDataURL(`http://localhost:3000/${team._id}/player/show`, async function (err, url) {
        team.qrCode = url
        await team.save();
    });

    req.flash('success', 'Team has been published');
    res.redirect('/admin/teams');
}));

router.get('/admin/team/:teamId/edit', isAdmin, wrapAsync(async (req, res) => {
    const { user } = req;
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    res.render('./admin/adminEditTeam', { admin: user, team });
}));

router.patch('/admin/team/:teamId', isAdmin, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'teamImage', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
]), wrapAsync(async (req, res) => {
    const { teamId } = req.params;
    const { name } = req.body;

    let updateData = { name: name };

    if (req.files['image']) {
        const { filename, path } = req.files['image'][0];
        updateData['image'] = { filename, path };
    }

    if (req.files['teamImage']) {
        const { filename, path } = req.files['teamImage'][0];
        updateData['teamImage'] = { filename, path };
    }

    if (req.files['audio']) {
        const { filename, path, mimetype } = req.files['audio'][0];
        updateData['audio'] = { filename, path, contentType: mimetype };
    }


    const team = await Team.findById(teamId);

    // Ensure filenames are present before attempting to delete
    if (team.image && updateData.image && team.image.filename) {
        await uploader.destroy(team.image.filename.split('.')[0]);
    }
    if (team.teamImage && updateData.teamImage && team.teamImage.filename) {
        await uploader.destroy(team.teamImage.filename.split('.')[0]);
    }
    if (team.audio && updateData.audio && team.audio.filename) {
        await uploader.destroy(team.audio.filename.split('.')[0]);
    }


    await Team.findByIdAndUpdate(teamId, updateData, { new: true });

    req.flash('success', 'Team changes have been applied!');
    res.redirect('/admin/teams');
}));

router.delete('/admin/team/:teamId/delete', wrapAsync(async (req, res) => {
    const { teamId } = req.params;
    const team = await Team.findByIdAndDelete(teamId);
    if (team.image.filename) {
        await uploader.destroy(team.image.filename);
    }
    if (team.audio.filename) {
        await uploader.destroy(team.audio.filename);
    }
    if (team.teamImage.filename) {
        await uploader.destroy(team.teamImage.filename);
    }
    req.flash('success', `Team has been removed from the database!`);
    res.redirect(`/admin/teams`);
}))

// Generating a PDF
// router.post('/generate/document', isAdmin, wrapAsync(async (req, res) => {
//     const { team, division, coach } = req.body;
//     const t = await Team.findById(team).lean();
//     const c = await Coach.findById(coach).lean();
//     const filteredStudents = await Student.find({
//         team: team,
//         dop: division,
//     }).populate('team').populate('coach').lean();

//     if (!filteredStudents.length) {
//         req.flash('error', "Sorry, no data was found matching your selected filters. Please adjust your filters and try again.");
//         return res.redirect('/admin/dashboard');
//     }

//     const doc = new PDFDocument();
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename="${t.name}-${division}.pdf"`);

//     doc.pipe(res);

//     const response = await fetch(t.image.path);
//     const logoBuffer = await response.buffer();
//     doc.image(logoBuffer, 50, 40, { width: 50 })
//         .fontSize(20)
//         .text(`${t.name} - ${c.fullname}`, 110, 50);

//     let currentYPosition = 100;

//     for (const student of filteredStudents) {
//         const studentResponse = await fetch(student.image.path);
//         const imageBuffer = await studentResponse.buffer();

//         if (currentYPosition > doc.page.height - 100) {
//             doc.addPage();
//             currentYPosition = 50;
//         }

//         doc.image(imageBuffer, 50, currentYPosition, { width: 100 });
//         doc.fontSize(10)
//             .text(`Name: ${student.fullname}`, 160, currentYPosition)
//             .text(`DOB: ${student.dob}`, 160, currentYPosition + 20)
//             .text(`Jersey #: ${student.jersey}`, 160, currentYPosition + 40)
//             .text(`Role: ${student.role}`, 160, currentYPosition + 60);

//         currentYPosition += 100;
//     }

//     doc.end();
// }));


// async function fetchImageAsBuffer(url) {
//     const response = await fetch(url);
//     if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
//     return response.buffer();
// }


// Generating Excel File
// router.post('/generate/excel', isAdmin, wrapAsync(async (req, res) => {
//     const { team, division } = req.body;
//     const t = await Team.findById(team).lean();

//     const filteredStudents = await Student.find({
//         team: team,
//         dop: division,
//     }).lean();

//     if (!filteredStudents.length) {
//         req.flash('error', "Sorry, no data was found matching your selected filters. Please adjust your filters and try again.");
//         return res.redirect('/admin/dashboard');
//     }

//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Students');

//     const approxColumnWidth = 14; // This is an approximation; you might need to adjust this
//     const approxRowHeight = 75; // Height in points; adjust based on your images

//     worksheet.getColumn('A').width = approxColumnWidth; // Adjust the column for images
//     worksheet.getRow(1).height = approxRowHeight;

//     if (t.image && t.image.path) {
//         const logoBuffer = await fetchImageAsBuffer(t.image.path);
//         const logoId = workbook.addImage({
//             buffer: logoBuffer,
//             extension: 'jpeg', // Adjust based on your image's actual format
//         });
//         worksheet.addImage(logoId, {
//             tl: { col: 0, row: 0 }, // Top-left corner of the image at the beginning of row 1, column A
//             ext: { width: 100, height: 50 } // Example size, adjust as needed
//         });
//     }

//     worksheet.columns = [
//         { header: 'Name', key: 'fullname', width: 30 },
//         { header: 'DOB', key: 'dob', width: 10 },
//         { header: 'Jersey #', key: 'jersey', width: 10 },
//         { header: 'Role', key: 'role', width: 15 },
//         { header: 'Image', key: 'role', width: 15 },
//         // Add a column for images if you're inserting them next to each entry
//     ];

//     for (const student of filteredStudents) {
//         const rowValues = {
//             fullname: student.fullname,
//             dob: student.dob,
//             jersey: student.jersey,
//             role: student.role,
//         };

//         if (student.image && student.image.path) {
//             const imageBuffer = await fetchImageAsBuffer(student.image.path);
//             const studentImageId = workbook.addImage({
//                 buffer: imageBuffer,
//                 extension: 'jpeg', // Adjust based on your image's actual format
//             });

//             const rowIndex = worksheet.addRow(rowValues).number;
//             // Adjust cell reference for image as needed
//             worksheet.addImage(studentImageId, {
//                 tl: { col: 4.5, row: rowIndex - 1 },
//                 ext: { width: 50, height: 50 }
//             });
//         } else {
//             worksheet.addRow(rowValues);
//         }
//     }

//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename="${t.name}-${division}.xlsx"`);

//     await workbook.xlsx.write(res);
//     res.end();

// }));

router.get('/generate/report', isAdmin, wrapAsync(async (req, res) => {
    const { team, division } = req.query;
    const t = await Team.findById(team).populate({
        path: "students",
        match: { dop: division, status: "approved" }
    });
    const students = t.students.map(student => ({
        ...student.toObject(),
        teamImage: t.image.path
    }));

    if (!students.length) {
        req.flash("error", "Sorry, no data was found matching your selected filters. Please adjust your filters and try again.")
        return res.redirect('/admin/dashboard')
    }
    res.render('./admin/print', { students, teamName: t.name, teamLogo: t.image.path })
}));

router.get('/generate/complete/report', isAdmin, wrapAsync(async (req, res) => {
    const { team, division } = req.query;
    const t = await Team.findById(team).populate({
        path: "students",
        match: { dop: division, status: "approved" }
    }).populate("coaches");
    const students = t.students.map(student => ({
        ...student.toObject(),
        teamImage: t.image.path
    }));

    const coaches = t.coaches.filter(coach => coach.status === "approved")

    if (!students.length) {
        req.flash("error", "Sorry, no data was found matching your selected filters. Please adjust your filters and try again.")
        return res.redirect('/admin/dashboard')
    }
    res.render('./admin/print2', {
        students,
        teamName: t.name,
        teamLogo: t.image.path,
        division,
        coaches
    });
}));

router.get('/team/store/:teamId', wrapAsync(async (req, res) => {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    res.render("./admin/createstore", { team, admin: req.user });
}));

router.post('/team/teamId', wrapAsync(async (req, res) => {
    const { teamId } = req.params;
    const team = Team.findById(teamId);
    res.send("Hitting the store post route")
}));

// Router to handle the multiple approve or disapprove request
router.post('/admin/student/action', async (req, res) => {
    const selectdeStudentIds = req.body.selectedStudentIds.split(',');
    const actionType = req.body.actionType;

    selectdeStudentIds.forEach(async (id) => {
        const update = { status: actionType };
        const student = await Student.findByIdAndUpdate(id, update).populate('team').populate('coach');
        if (actionType === "approved") {
            client.send({
                from: sender,
                to: [{
                    email: student.username
                }],
                template_uuid: "b990abcd-d599-417c-9ff6-01f66c0e9bd2",
                template_variables: {
                    "student": student,
                    "team": student.team,
                    "coach": student.coach
                }
            });
        }
    });
    res.sendStatus(200);
});
router.post('/admin/coach/action', async (req, res) => {
    const selectedCoachIds = req.body.selectedCoachIds.split(',');
    const actionType = req.body.actionType;

    selectedCoachIds.forEach(async (id) => {
        const update = { status: actionType };
        const coach = await Coach.findByIdAndUpdate(id, update).populate('team');
        if (actionType === "approved") {
            client.send({
                from: sender,
                to: [{
                    email: coach.username
                }],
                template_uuid: "5f30205a-700d-49de-a51c-84adf71e3a68",
                template_variables: {
                    "coach": coach,
                    "team": coach.team
                }
            });
        }
    });
    res.sendStatus(200);
});


module.exports = router;