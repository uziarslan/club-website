const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


router.get('/payment', wrapAsync(async (req, res) => {
  res.render('./student/payment');
}));

router.post('/create-checkout-session' , async (req, res) => {
    
    const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: "Laptop",
              },
              unit_amount: 112124,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `http://localhost:3000/success`,
        cancel_url: 'http://localhost:3000/cancel',
      });
      res.redirect(303, session.url);

})

router.get('/success', (req, res) => {
    res.send('success');

    })

router.get('/cancel', (req, res) => {
    res.send('cancelled');
})

module.exports = router;