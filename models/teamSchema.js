const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: String,
    image: {
        filename: String,
        path: String
    }
})

module.exports = mongoose.model('Team', teamSchema)