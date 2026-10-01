const express = require('express');
const profileRouter = express.Router();
const checkValidMiddleware = require('../middlewares/checkvalidmiddleware');
const { validateEditProfileData } = require('../utils/validate');

profileRouter.get('/view', checkValidMiddleware, (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Exclude sensitive information like password from the response
    const { password, ...userData } = user.toObject();
    return res.json({
      message: 'User profile retrieved successfully',
      data: userData,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

profileRouter.patch('/edit', checkValidMiddleware, async (req, res) => {
  try {
    const isValidEdit = validateEditProfileData(req);
    if (!isValidEdit) {
      return res
        .status(400)
        .json({ error: 'Invalid fields in the request body!' });
    }
    const loggedInUser = req.user;
    // Update the logged-in user's profile with the provided data
    Object.keys(req.body).forEach((key) => {
      loggedInUser[key] = req.body[key];
    });
    await loggedInUser.save();
    return res.json({
      message: `${loggedInUser.firstName} ${loggedInUser.lastName}'s profile updated successfully`,
      data: loggedInUser,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = profileRouter;
