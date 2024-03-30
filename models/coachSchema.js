const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const coachSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
})

coachSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('Coach', coachSchema)