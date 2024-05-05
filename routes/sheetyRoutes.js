const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport')
const Admin = mongoose.model('Admin');
const Student = mongoose.model('Student');
const Coach = mongoose.model("Coach");
const Team = mongoose.model('Team');
const PDFDocument = require('pdfkit');
const wrapAsync = require('../utils/wrapAsync');
const { isAdmin } = require('../middlewares');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const fetch = require('node-fetch');
const request = require("request");
const ExcelJS = require('exceljs');
const { uploader } = require('cloudinary').v2
const imageSize = require('image-size');
const sharp = require('sharp');
const qrcode = require('qrcode');
const axios = require('axios');
const router = express();


const url = "https://api.sheety.co/4520ba480c615801617a7a64d26fbb82/flightDeals/prices"
const playersUrl = "https://api.sheety.co/4520ba480c615801617a7a64d26fbb82/flightDeals/users"

const headers = {
    'Content-Type': 'application/json',
    "Authorization": `Basic dXphaXJhcnNsYW46VXphaXJhcnNsYW4xMjM=`
}

router.get('/sheety', wrapAsync(async (req, res) => {
    const response = await axios.get(url, { headers: headers });
    filteredPlayers = [];
    for (let player of response.data.prices) {
        const students = await Student.find({ username: player.username });
        if (!students.length) {
            filteredPlayers.push(player)
        }
    }
    res.send(filteredPlayers)
}));

router.get('/create/sheet', async (req, res) => {
    try {
        let body = {
            user: {
                username: "john_doe",
                fullname: "John Doe",
                jersey: "23",
                role: "forward",
                dop: "01/01/2000",
                dob: "12/05/1995",
                parent: "Jane Doe",
                phone: "1234567890",
                address: "123 Main Street"
            }
        };

        const got = await import('got');
        const response = await got.post(playersUrl, {
            headers: headers,
            json: body
        });

        console.log("Response:", response.body);
        res.send("Student added successfully");
    } catch (error) {
        if (error.response && error.response.body) {
            console.error("Error adding student:", error.response.body);
        } else {
            console.error("Error adding student:", error);
        }
        return res.status(500).send("Error adding student. See server logs for details.");
    }
});




module.exports = router;