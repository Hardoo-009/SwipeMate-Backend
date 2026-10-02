const express = require('express');
const authRouter = express.Router();
const { validateSignUpData } = require('../utils/validate');
const bycrypt = require('bcrypt');
const User = require('../models/user');
const redisClient = require('../config/redis');
const jwt = require('jsonwebtoken');
const checkValidMiddleware = require('../middlewares/checkvalidmiddleware');
const bcrypt = require('bcrypt');
// Signup route
authRouter.post('/signup', async (req, res) => {
  try {
    // Validation logic for signup data
    validateSignUpData(req);

    const { firstName, lastName, emailId, password, gender } = req.body;
    // Encrypt the password
    const passwordHash = await bcrypt.hash(password, 10);

    //Creating a new instance of the User model
    // could have done it through User.create() but I wanted to create an instance of a model and then save it to the database
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
      gender,
    });
    const savedUser = await user.save();
    // now make the jwt token and send it to the user in the response
    const token = await savedUser.getJWT(); // schema method to generate jwt token for the user
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      expires: new Date(Date.now() + 8 * 3600000), // 8 hours in milliseconds
    });
    // filter out the password from the response
    const { password: userPassword, ...userData } = savedUser.toObject();
    return res.json({ message: 'User Added successfully!', data: userData });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Login route
authRouter.post('/login', checkValidMiddleware, async (req, res) => {
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
    // filter out the password from the response
    const { password: userPassword, ...userData } = user.toObject();
    return res.json({
      message: `${user.firstName} ${user.lastName} logged in successfully!`,
      data: userData,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Logout route
authRouter.post('/logout', checkValidMiddleware, async (req, res) => {
  try {
    const { token } = req.cookies;
    // Add the token to the Redis blacklist
    await redisClient.set(`token:${token}`, 'blocked');
    // have to add the expiry time , which is present in the payload of the token
    const payload = jwt.decode(token);
    if (!payload || !payload.exp) {
      return res.status(400).send('Invalid token.');
    }
    // Set the expiry time for the token in Redis
    await redisClient.expireAt(`token:${token}`, payload.exp);
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    });
    return res.status(200).json({ message: 'User logged out successfully!' });
  } catch (error) {
    console.error('Error during logout:', error);
    return res.status(500).send('Logout failed. Please try again later.');
  }
});

module.exports = authRouter;
