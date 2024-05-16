const mongoose = require('mongoose');
const Coach = mongoose.model('Coach');
const Student = mongoose.model('Student');
const Admin = mongoose.model('Admin');

// module.exports.isLoggedIn = (req, res, next) => {
//     if (req.isAuthenticated()) {
//         return next();
//     }
//     res.redirect('/login');
// }

// module.exports.isTeacher = (req, res, next) => {
//     if (req.user instanceof Teacher) {
//         return next();
//     }
//     res.redirect('/login');
// }

// module.exports.isStudent = (req, res, next) => {
//     if (req.user instanceof Student) {
//         return next();
//     }
//     res.redirect('/login');
// }

module.exports.isAdmin = (req, res, next) => {
    if (req.user instanceof Admin && req.user.role === "admin") {
        return next();
    }
    res.redirect('/');
}

module.exports.isCoach = (req, res, next) => {
    if (req.user instanceof Coach) {
        return next();
    }
    res.redirect('/');
}

module.exports.isStudent = (req, res, next) => {
    if (req.user instanceof Student && req.params.id === req.user._id.toString()) {
        return next();
    }
    res.redirect('/');
}

