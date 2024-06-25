if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
require('./models/adminSchema');
require('./models/coachSchema');
require('./models/studentSchema');
require('./models/teamSchema');
const express = require('express');
const app = express();
const ejsMate = require('ejs-mate');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const Coach = mongoose.model('Coach');
const Student = mongoose.model('Student');
const Admin = mongoose.model('Admin');
const MongoDBStore = require('connect-mongo');
const passport = require('passport');
const localStrategy = require('passport-local');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const studentRoutes = require('./routes/studentAuth');
const coachRoutes = require('./routes/coachRoutes');
const adminRoutes = require('./routes/adminRoutes');
const homepageRoutes = require('./routes/homepageRoutes');
const stripeRoute = require('./routes/stripeRoute');
const ExpressError = require('./utils/ExpressError');
const wrapAsync = require('./utils/wrapAsync');
const crypto = require('crypto');
const { MailtrapClient } = require("mailtrap");

const TOKEN = process.env.MAIL_TRAP_TOKEN;
const ENDPOINT = "https://send.api.mailtrap.io/";
const client = new MailtrapClient({ endpoint: ENDPOINT, token: TOKEN });
const sender = {
    email: "info@bigtristate.com",
    name: "Big Tri State",
}


const PORT = process.env.PORT || 3000;
const mongoURi = process.env.MONGO_URI || 'mongodb://localhost:27017/club-website';


const secret = 'thisisnotagoodsecret';
const store = new MongoDBStore({
    mongoUrl: mongoURi,
    secret,
    touchAfter: 24 * 60 * 60
});
const sessionConfig = {
    store,
    secret,
    name: "session",
    resave: false,
    saveUninitialized: false
};


// Setting up the app
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set(path.join(__dirname, 'views'));

// Using the app
app.use(express.static(__dirname + '/public'));
app.use('/scripts', express.static(path.join(__dirname, 'node_modules')));
app.use(methodOverride('_method'));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});



// inititalizing Passport
passport.use('admin', new localStrategy(Admin.authenticate()));
passport.use('student', new localStrategy(Student.authenticate()));
passport.use('coach', new localStrategy(Coach.authenticate()));
passport.serializeUser((user, done) => {
    if (user instanceof Admin) {
        done(null, { type: 'admin', id: user.id });
    } else if (user instanceof Coach) {
        done(null, { type: 'coach', id: user.id });
    } else if (user instanceof Student) {
        done(null, { type: 'student', id: user.id });
    }
});
passport.deserializeUser(async (data, done) => {
    try {
        let user;
        if (data.type === 'admin') {
            user = await Admin.findById(data.id);
        } else if (data.type === 'coach') {
            user = await Coach.findById(data.id);
        } else if (data.type === 'student') {
            user = await Student.findById(data.id);
        }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});


// Route hanlder
app.use(studentRoutes)
app.use(coachRoutes)
app.use(adminRoutes)
app.use(homepageRoutes)
app.use(stripeRoute)


// Reset Password logic

app.get('/forgot/:role', wrapAsync(async (req, res, next) => {
    const { role } = req.params;
    res.render('forgot', { role });
}));

app.post('/forgot', wrapAsync(async (req, res) => {
    const { username } = req.body;
    const { role } = req.query;
    let user;
    switch (role) {
        case 'admin':
            user = await Admin.findOne({ username });
            break;
        case 'coach':
            user = await Coach.findOne({ username });
            break;
        case 'student':
            user = await Student.findOne({ username });
            break
        default:
            req.flash('error', 'Invalid Option');
            return res.redirect(`/forgot/${role}`);
    }

    if (!user) {
        req.flash('error', 'No account with that username exists.');
        return res.redirect(`/forgot/${role}`);
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    client.send({
        from: sender,
        to: [{ email: user.username }],
        template_uuid: "41149d2b-9036-46c7-bcf4-f72f4d7f0eb0",
        template_variables: {
            "user_email": user.username,
            "pass_reset_link": `${process.env.DOMAIN}/reset/${token}?role=${role}`
        }
    })

    // end
    req.flash('success', `An email has been sent to ${user.username} with further instructions.`);
    res.redirect(`/forgot/${role}`);
}));


app.get('/reset/:token', wrapAsync(async (req, res) => {
    const { role } = req.query;

    let user;
    switch (role) {
        case 'admin':
            user = await Admin.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt: Date.now() }
            });
            break;
        case 'coach':
            user = await Coach.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt: Date.now() }
            });
            break;
        case 'student':
            user = await Student.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt: Date.now() }
            });
            break
        default:
            req.flash('error', 'Invalid Option');
            return res.redirect(`/forgot/${role}`)
    }

    if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect(`/forgot/${role}`);
    }

    res.render('reset', { token: req.params.token, role });
}));


app.post('/reset/:token', wrapAsync(async (req, res) => {
    const { role } = req.query;

    let user;
    switch (role) {
        case 'admin':
            user = await Admin.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt: Date.now() }
            });
            break;
        case 'coach':
            user = await Coach.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt: Date.now() }
            });
            break;
        case 'student':
            user = await Student.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt: Date.now() }
            });
            break
        default:
            req.flash('error', 'Invalid Option');
            return res.redirect(`/forgot/${role}`)
    }

    if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect(`/forgot/${role}`);
    }

    if (req.body.password === req.body.confirmPassword) {
        user.setPassword(req.body.password, async (err) => {
            if (err) {
                req.flash('error', 'Error resetting password.');
                return res.redirect(`/forgot/${role}`);
            }
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            await user.save();
            req.flash('success', 'Success! Your password has been changed.');
            res.redirect(`/${role}/login`);
        });
    } else {
        req.flash('error', 'Passwords do not match.');
        return res.redirect('back');
    }
}));



// Logout route for every user
app.get('/logout', wrapAsync(async (req, res) => {
    req.logout(() => {
        res.redirect('/')
    });
}));


// initializing Mongoose
mongoose.connect(mongoURi, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('Mongoose is connected')
}).catch((e) => {
    console.log(e)
});


// handling the error message
app.all("*", (req, res, next) => {
    next(new ExpressError('Page not found', 404));
});
app.use((err, req, res, next) => {
    const { status = 500 } = err;
    if (!err.message) err.message = "Oh No, Something Went Wrong!";
    res.status(status).render('error', { err });
});

// Listen for the port Number
app.listen(PORT, () => {
    console.log(`App is listening on http://localhost:${PORT}`);
});