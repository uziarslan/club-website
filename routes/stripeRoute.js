const express = require('express');
const mongoose = require('mongoose');
const Student = mongoose.model('Student');
const Coach = mongoose.model('Coach');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync');
const { MailtrapClient } = require("mailtrap");

// Mailtrap Integration
const TOKEN = process.env.MAIL_TRAP_TOKEN;
const ENDPOINT = "https://send.api.mailtrap.io/";
const client = new MailtrapClient({ endpoint: ENDPOINT, token: TOKEN });
const sender = {
  email: "info@bigtristate.com",
  name: "Big Tri State",
};
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


router.get('/payment', wrapAsync(async (req, res) => {
  res.render('./student/payment');
}));

router.post('/create-checkout-session/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: "Player Registration",
          },
          unit_amount: 2500,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.DOMAIN}/success?student_id=${studentId}`,
    cancel_url: `${process.env.DOMAIN}/cancel?student_id=${studentId}`,
  });
  res.redirect(303, session.url);

})

router.get('/success', wrapAsync(async (req, res) => {
  const { student_id } = req.query;
  const student = await Student.findById(student_id).populate("coach");
  client.send({
    from: sender,
    to: [{
      email: student.username
    }],
    template_uuid: "4be92171-f9c2-421d-8d4e-4dd83eae6bef",
    template_variables: {
      "fullname": student.fullname
    }
  });

  client
    .send({
      from: sender,
      to: [{
        email: student.username
      }],
      template_uuid: "73b84996-7995-4ebf-8a60-6c9baf144f8d",
      template_variables: {
        "student": student,
        "coach": student.coach
      }
    });
  await Student.findByIdAndUpdate(student_id, { paymentStatus: "paid" });
  res.redirect(`/student/${student._id}/${student.team}`)

}));

router.get('/cancel', wrapAsync(async (req, res) => {
  const { student_id } = req.query;
  const student = await Student.findById(student_id);
  client.send({
    from: sender,
    to: [{
      email: student.username
    }],
    template_uuid: "73620afa-bcc7-424c-9de0-dff5305d8cb1",
    template_variables: {
      "fullname": student.fullname
    }
  });
}))

router.get('/bulk/success', wrapAsync(async (req, res) => {
  const { coach_id } = req.query;
  const coach = await Coach.findById(coach_id).populate("students");
  const bulkRegisteredStudents = coach.students.filter(student => student.registrationMode === "bulk" && student.paymentStatus === "unpaid")
  bulkRegisteredStudents.forEach(async student => {
    student.paymentStatus = "paid";
    await student.save();
  });
  req.flash("success", "Players has been registered successfully.")
  res.redirect(`/coach/${coach._id}`)
}));

module.exports = router;