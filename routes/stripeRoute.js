const express = require('express');
const mongoose = require('mongoose');
const Student = mongoose.model('Student');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync');

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
            name: "Laptop",
          },
          unit_amount: 2500,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `http://localhost:3000/success?student_id=${studentId}`,
    cancel_url: 'http://localhost:3000/cancel',
  });
  res.redirect(303, session.url);

})

router.get('/success', async (req, res) => {
  const { student_id } = req.query;
  const student = await Student.findById(student_id);
  res.redirect(`/student/${student._id}/${student.team}`)

})

router.get('/cancel', (req, res) => {
  res.send('cancelled');
})

module.exports = router;