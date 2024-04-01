const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const coachSchema = new mongoose.Schema({
    fullname: String,
    username: String,
    phone: String,
    status: {
        type: String,
        enum: ["approved", "pending", "deleted"],
        default: "pending"
    }
})

coachSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('Coach', coachSchema)