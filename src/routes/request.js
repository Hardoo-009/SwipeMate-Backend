const express = require('express');
const requestRouter = express.Router();
const checkValidMiddleware = require('../middlewares/checkvalidmiddleware');
const ConnectionRequestModel = require('../models/connectionrequest');

// Route to send a connection request
requestRouter.post(
  '/send/:status/:toUserId',
  checkValidMiddleware,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const toUserId = req.params.toUserId;
      const status = req.params.status;

      const allowedStatus = ['ignored', 'interested'];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' + status });
      }
      // check if toUserId is present in the database or not
      const toUser = await User.findById(toUserId);
      if (!toUser) {
        return res.status(404).json({ message: 'User not found!' });
      }
      // check if the connection request already exists between the two users
      const existingRequest = await ConnectionRequestModel.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      });
      // check if the existing request is accepted or interested or rejected
      if (existingRequest?.status === 'accepted') {
        return res.status(400).json({
          message: 'You are already connected',
        });
      }

      if (existingRequest?.status === 'interested') {
        return res.status(400).json({
          message: 'Connection request already exists',
        });
      }
      // check if the existing request is rejected and if the cooldown period has expired
      if (existingRequest?.status === 'rejected') {
        const cooldown = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

        // Still within 30-day cooldown
        if (
          existingRequest.rejectedAt &&
          Date.now() - existingRequest.rejectedAt.getTime() < cooldown
        ) {
          return res.status(400).json({
            message: 'You cannot send another request yet',
          });
        }

        // Cooldown expired
        existingRequest.status = status;
        existingRequest.rejectedAt = null;

        const data = await existingRequest.save();

        return res.status(201).json({
          message:
            status === 'interested'
              ? `${req.user.firstName} is interested in connecting with ${toUser.firstName}`
              : `${req.user.firstName} ignored ${toUser.firstName}`,
          data,
        });
      }

      const connectionRequest = new ConnectionRequestModel({
        fromUserId,
        toUserId,
        status,
      });

      const data = await connectionRequest.save();

      // send custom json response for intetested status and ignored status
      if (status === 'interested') {
        return res.status(201).json({
          message: `${req.user.firstName} is interested in connecting with ${toUser.firstName}`,
          data,
        });
      }
      if (status === 'ignored') {
        return res.status(201).json({
          message: `${req.user.firstName} ignored the connection request from ${toUser.firstName}`,
          data,
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
);

module.exports = requestRouter;
