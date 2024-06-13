const express = require('express');
const mongoose = require('mongoose');
const Coach = mongoose.model('Coach');
const Team = mongoose.model('Team');
const Student = mongoose.model("Student");
const passport = require('passport')
const wrapAsync = require('../utils/wrapAsync');
const { isCoach } = require('../middlewares');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const { uploader } = require('cloudinary').v2
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

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Defining routes
router.get('/coach/register', wrapAsync(async (req, res) => {
    const teams = await Team.find({});
    res.render('./coach/coachSignup', { teams });
}));

router.post('/coach/register', wrapAsync(async (req, res) => {
    const { username, password, team } = req.body;
    const foundCoach = await Coach.find({ username });

    if (foundCoach.length) {
        req.flash('error', "The coach is already registered.")
        return res.redirect("/coach/register")
    }

    const coach = new Coach({ ...req.body, team: team });

    await Team.findByIdAndUpdate(team, {
        $addToSet: { coaches: coach._id }
    }, { new: true });

    await Coach.register(coach, password, (err, newCoach) => {
        if (err) {
            next(err)
        }
        req.logIn(newCoach, () => {
            client.send({
                from: sender,
                to: [{
                    email: coach.username
                }],
                template_uuid: "2f4dab3c-0677-484b-9d4f-b8e29607ef64",
                template_variables: {
                    "fullname": coach.fullname
                }
            });
            return res.render(`./coach/success`)
        });
    });
}));

router.get('/coach/login', wrapAsync(async (req, res) => {
    res.render('./coach/coachLogin');
}));

router.post('/coach/login', (req, res, next) => {
    passport.authenticate('coach', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('error', 'Invalid Email or Password');
            return res.redirect('/coach/login');
        }
        req.logIn(user, async (err) => {
            if (err) {
                return next(err);
            }
            if (user instanceof Coach && user.status === "approved") {
                const coach = await Coach.findById(req.user._id).populate("students");
                const payment_pending = coach.students.filter(student => student.registrationMode === "bulk" && student.paymentStatus === "unpaid");
                if (payment_pending.length) {
                    return res.redirect('/team/admin/invoice');
                } else {
                    req.flash('success', `Welcome back ${user.fullname}!`);
                    return res.redirect(`/coach/${user._id}`);
                }
            } else {
                req.flash("error", `${user.fullname} your application is not yet approved. Please wait until it's verified.`)
                return res.redirect(`/coach/login`);
            }
        });
    })(req, res, next);
});

router.get('/coach/:id', isCoach, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const dop = ['7U', '8U', '9U', '10U', '11U', '12U', '13U'];
    const coach = await Coach.findById(id).populate('students').populate('team');

    res.render('./coach/coachDash', {
        coach,
        dop
    });
}));

router.get('/coach/:id/:dopNum', isCoach, wrapAsync(async (req, res) => {
    const { id, dopNum } = req.params;
    const dop = ['7U', '8U', '9U', '10U', '11U', '12U', '13U']
    const coach = await Coach.findById(id).populate('team').populate({
        path: 'students',
        match: { dop: dopNum }
    });;
    const team = await Team.findOne({ coaches: { $in: [id] } })
        .populate('students')
        .populate('coaches');
    const footballers = team.students.filter(student => student.role === 'football' && student.dop === dopNum);
    const cheerleaders = team.students.filter(student => student.role === "cheer" && student.dop === dopNum);
    const approved_students = team.students.filter(student => student.status === "approved" && student.dop === dopNum);
    const pending_students = team.students.filter(student => student.status === "pending" && student.dop === dopNum);
    const disqualified_students = team.students.filter(student => student.status === "disqualified" && student.dop === dopNum);
    const totalDivisonStudents = footballers.length + cheerleaders.length;
    res.render('./coach/devision', {
        coach,
        dop,
        cheerleaders,
        footballers,
        dopNum,
        approved_students,
        pending_students,
        disqualified_students,
        totalDivisonStudents
    });
}));


// Check for the jersey Number
router.get('/team/:teamId/division/:division/jersey/:jerseyNumber/check', wrapAsync(async (req, res) => {
    const { teamId, division, jerseyNumber } = req.params;
    const student = await Student.findOne({ team: teamId, dop: division, jersey: jerseyNumber.toUpperCase() });

    if (student) {
        return res.json({ available: false, message: 'Jersey number is already taken.' });
    } else {
        return res.json({ available: true, message: 'Jersey number is available.' });
    }
}));

// Router to assign the jersey number
router.post('/assign-jerseys', wrapAsync(async (req, res) => {
    const { division, data } = req.body;

    for (let studentId in data) {
        const jerseyNumber = data[studentId];
        const student = await Student.findById(studentId);
        if (student && student !== jerseyNumber) {
            student.jersey = jerseyNumber.toUpperCase();
            await student.save();
        }
    }

    res.json({ success: true });
}));

// Router to handle the invoice for BULK registered students
router.get('/team/admin/invoice', isCoach, wrapAsync(async (req, res, next) => {
    const { user } = req;
    const coach = await Coach.findById(user._id).populate('students').populate('team');
    const bulk_students = coach.students.filter(student => student.registrationMode === "bulk" && student.paymentStatus === "unpaid");
    if (bulk_students.length) {
        return res.render('./coach/invoice', {
            coach,
            bulk_students,
            no_students: bulk_students.length,
            subtotal: bulk_students.length * 25
        });
    } else {
        return res.redirect(`/coach/${coach._id}`)
    }

}));

// Router to handle bulk student Registration
router.post('/team/:teamId/admin/register', isCoach, upload.any(), wrapAsync(async (req, res) => {
    const { user } = req;
    const { teamId } = req.params;
    const team = await Team.findById(teamId);

    const playerFiles = {};
    req.files.forEach(file => {
        const match = file.fieldname.match(/(\w+)\[(\d+)\]/);
        if (match) {
            const type = match[1];
            const playerIndex = match[2];

            if (!playerFiles[playerIndex]) {
                playerFiles[playerIndex] = {
                    images: [],
                    documents: []
                };
            }

            if (type === 'image') {
                playerFiles[playerIndex].images.push(file);
            } else if (type === 'document') {
                const documentIndex = playerFiles[playerIndex].documents.length;
                const documentName = Array.isArray(req.body.documentType[playerIndex]) ? req.body.documentType[playerIndex][documentIndex] : req.body.documentType[playerIndex];
                playerFiles[playerIndex].documents.push({ ...file, documentName });
            }
        }
    });

    for (const playerIndex in playerFiles) {
        const { images, documents } = playerFiles[playerIndex];
        const dobYear = req.body.dobYear[playerIndex]
        const dobMonth = req.body.dobMonth[playerIndex]
        const dobDate = req.body.dobDate[playerIndex]
        dob = `${dobMonth}-${dobDate}-${dobYear}`;
        const dateOfBirth = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - dateOfBirth.getFullYear();
        const m = today.getMonth() - dateOfBirth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
            age--;
        }
        // Create a new Student object
        const student = new Student({
            coach: user._id,
            team: teamId,
            role: req.body.role[playerIndex],
            username: user.username,
            association: team.name,
            dop: req.body.dop[playerIndex],
            fullname: req.body.fullname[playerIndex],
            age: age,
            dob: dob,
            parent: req.body.parent[playerIndex],
            phone: req.body.phone[playerIndex],
            address: req.body.address[playerIndex],
            image: images.length > 0 ? { filename: images[0].filename, path: images[0].path } : null,
            documents: documents.map(doc => ({ filename: doc.filename, path: doc.path, documentName: doc.documentName })),
            registrationMode: "bulk"
        });
        await Coach.findByIdAndUpdate(user._id, {
            $addToSet: { students: student._id }
        }, { new: true });

        await Team.findByIdAndUpdate(teamId, {
            $addToSet: { students: student._id }
        }, { new: true });

        await student.save();
    }
    res.redirect('/team/admin/invoice');
}));

//Router to handle the payment for bulk students
router.post('/bulk-payment', isCoach, wrapAsync(async (req, res, next) => {
    const { user } = req;
    const coach = await Coach.findById(user._id).populate('students');
    const pending_payment = coach.students.filter(student => student.paymentStatus === 'unpaid' && student.registrationMode === "bulk");

    const totalAmount = 2500 * pending_payment.length;

    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: "Student Registration",
                    },
                    unit_amount: totalAmount,
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: `${process.env.DOMAIN}/bulk/success?coach_id=${user._id}`,
        cancel_url: `${process.env.DOMAIN}/bulk/cancel?coach_id=${user._id}`
    });

    res.redirect(session.url);
}));

// router to delete the student from the invoice page
router.delete('/team/admin/:studentId', wrapAsync(async (req, res) => {
    const { user } = req;
    const { studentId } = req.params;

    await Coach.findByIdAndUpdate(
        user._id,
        { $pull: { students: studentId } },
        { new: true }
    );

    // Find the student document
    const student = await Student.findById(studentId);
    if (student.image && student.image.path) {
        await uploader.destroy(student.image.filename);
    }
    for (const document of student.documents) {
        if (document.path) {
            await uploader.destroy(document.filename);
        }
    }

    await Team.findByIdAndUpdate(
        student.team,
        { $pull: { students: studentId } },
        { new: true }
    );

    await Student.findByIdAndDelete(studentId);
    res.redirect('/team/admin/invoice');
}));

module.exports = router;