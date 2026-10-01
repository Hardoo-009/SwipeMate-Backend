const express = require('express');
const authRouter = express.Router();
const { validateSignUpData } = require('../utils/validate');
const bycrypt = require('bcrypt');
const User = require('../models/user');

// Signup route
authRouter.post('/signup', async (req, res) => {
  try {
    // Validation logic for signup data
    validateSignUpData(req);

    const { firstName, lastName, emailId, password } = req.body;
    // Encrypt the password
    const passwordHash = await bcrypt.hash(password, 10);

    //Creating a new instance of the User model
    // could have done it through User.create() but I wanted to create an instance of a model and then save it to the database
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });
    const savedUser = await user.save();
    // now make the jwt token and send it to the user in the response
    const token = await savedUser.getJWT(); // schema method to generate jwt token for the user
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      expires: new Date(Date.now() + 8 * 3600000),
    });
    return res.json({ message: 'User Added successfully!', data: savedUser });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Login route
authRouter.post('/login', async (req, res) => {
  try {
    const { emailId, password } = req.body;
    if (!emailId) throw new Error('Invalid Credentials');
    if (!password) throw new Error('Invalid Credentials');
    const user = await User.findOne({ emailId: emailId });
    if (!user) {
      throw new Error('Invalid credentials');
    }
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    // now again make the jwt token and send it to the user in the response
    const token = await user.getJWT();
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      expires: new Date(Date.now() + 8 * 3600000),
    });
    return res.json({ message: 'User logged in successfully!', data: user });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Logout route
authRouter.post('/logout', (req, res) => {
  res.clearCookie('token', {});
  return res.json({ message: 'User logged out successfully!' });
});

module.exports = authRouter;
