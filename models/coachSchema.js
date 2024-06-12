const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const coachSchema = new mongoose.Schema({
    fullname: String,
    username: String,
    phone: String,
    status: {
        type: String,
        enum: ["approved", "pending", "disqualified"],
        default: "pending"
    },
    students: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student'
        }
    ],
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    }
});

coachSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('Coach', coachSchema)