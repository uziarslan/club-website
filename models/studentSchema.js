const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const studentSchema = new mongoose.Schema({
    coach: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coach'
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    role: String,
    association: String,
    username: String,
    dop: String,
    fullname: String,
    jersey: String,
    age: String,
    dob: String,
    parent: String,
    phone: String,
    address: String,
    status: {
        type: String,
        enum: ['approved', 'pending', 'disqualified'],
        default: 'pending'
    }
});

studentSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('Student', studentSchema)