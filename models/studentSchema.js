const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const studentSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
})

studentSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('Student', studentSchema)