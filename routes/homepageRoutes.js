const express = require('express');
const mongoose = require('mongoose');
const Student = mongoose.model('Student');
const Coach = mongoose.model("Coach");
const Team = mongoose.model('Team')
const wrapAsync = require('../utils/wrapAsync');
const router = express();


router.get('/', wrapAsync(async (req, res) => {
    const teams = await Team.find({}).populate('coaches');
    res.render('./homepage/homepage', { teams });
}));

router.get('/:teamId/player/show', wrapAsync(async (req, res) => {
    const dop = ['7U', '8U', '9U', '10U', '11U', '12U', '13U']
    const { teamId } = req.params;
    const team = await Team.findById(teamId).populate('coaches').populate('students');
    const approved_students = team.students.filter(student => student.status === "approved");
    const approved_coaches = team.coaches.filter(coach => coach.status === "approved");

    res.render('./homepage/players', {
        students: approved_students,
        coaches: approved_coaches,
        team,
        dop
    });
}));


router.get('/coaches/show', wrapAsync(async (req, res) => {
    const coachs = await Coach.find({});
    res.render('./homepage/coaches', { coachs });
}));
module.exports = router;