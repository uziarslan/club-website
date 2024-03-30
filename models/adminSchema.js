const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const adminSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
})

adminSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('Admin', adminSchema)