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
    ]
})

module.exports = mongoose.model('Team', teamSchema)