const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: String,
    image: {
        filename: String,
        path: String
    },
    students: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student'
        }
    ],
    coaches: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach'
        }
    ],
    audio: {
        filename: String,
        path: String,
        contentType: String
    },
    teamImage: {
        filename: String,
        path: String
    },
    qrCode: {
        type: String
    }
})

module.exports = mongoose.model('Team', teamSchema)