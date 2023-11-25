
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const twilio = require('twilio');
const path = require('path');

const router = express.Router();
const accountSid = 'ACa04ed3f66e29b9c73fab0364c97e5474';
const authToken = '4f5a3d810c8c935979fe38513a751c75';
const client = new twilio(accountSid, authToken);
const twilioPhoneNumber = '+12242314974';

// Genera un código aleatorio de 6 dígitos
const generateRandomCode = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

// Almacena temporalmente el código en memoria
const userCodes = {};

router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const user = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPassword,
    });

    await user.save();
    res.redirect('/auth/login');
  } catch (error) {
    res.status(500).send('Error al registrar usuario');
  }
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (user) {
    const code = generateRandomCode();
    userCodes[user._id] = code;

    // Envía el código por SMS
    client.messages.create({
      body: `Tu código de autenticación es: ${code}`,
      from: twilioPhoneNumber,
      to: user.phone,
    });

    res.render('verify', { userId: user._id });
  } else {
    res.redirect('/auth/login');
  }
});

router.post('/verify', async (req, res) => {
  const userId = req.body.userId;
  const user = await User.findById(userId);

  if (user && req.body.code == userCodes[userId]) {
    delete userCodes[userId];
    
    return res.render('success');
  }

  res.render('login', { error: 'Código incorrecto. Intenta nuevamente.' });
});

router.use(express.static(path.join(__dirname, '../views')));

module.exports = router;
