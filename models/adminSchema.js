const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const adminSchema = new mongoose.Schema({
    username: String,
    fullname: String,
    role: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

adminSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('Admin', adminSchema)