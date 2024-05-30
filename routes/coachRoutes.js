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
            return res.redirect(`/coach/${newCoach._id}`)
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
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            if (user instanceof Coach) {
                req.flash('success', `Welcome back ${user.fullname}!`);
                return res.redirect(`/coach/${user._id}`);
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

    const footballers = coach.students.filter(student => student.role === 'football');
    const cheerleaders = coach.students.filter(student => student.role === "cheer");
    const approved_students = coach.students.filter(student => student.status === "approved");
    const pending_students = coach.students.filter(student => student.status === "pending");
    const disqualified_students = coach.students.filter(student => student.status === "disqualified");

    res.render('./coach/devision', {
        coach,
        dop,
        cheerleaders,
        footballers,
        dopNum,
        approved_students,
        pending_students,
        disqualified_students,
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
        if (student && student.jersey.toLowerCase() !== jerseyNumber.toLowerCase()) {
            student.jersey = jerseyNumber.toUpperCase();
            await student.save();
        }
    }

    res.json({ success: true });
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
    const totalAmount = 2500 * Object.keys(playerFiles).length;

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

module.exports = router;