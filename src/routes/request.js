const express = require('express');
const requestRouter = express.Router();
const checkValidMiddleware = require('../middlewares/checkvalidmiddleware');
const ConnectionRequestModel = require('../models/connectionrequest');
const User = require('../models/user');
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
      // Check if the toUserId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(toUserId)) {
        return res.status(400).json({
          error: 'Invalid user ID',
        });
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
      // check if the existing request is interested
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
      /*
      Handle an existing ignored request
      A → B = ignored
      Later A changes their mind:
      A → B = interested
      We should update the existing document rather than
      creating:
      A → B = ignored
      A → B = interested
      which would give us duplicate relationships.
      */
      if (
        existingRequest?.status === 'ignored' &&
        existingRequest.fromUserId.toString() === fromUserId.toString()
      ) {
        existingRequest.status = status;

        const data = await existingRequest.save();

        return res.status(201).json({
          message:
            status === 'interested'
              ? `${req.user.firstName} is interested in connecting with ${toUser.firstName}`
              : `${req.user.firstName} ignored ${toUser.firstName}`,
          data,
        });
      }
      /*
      If the other user already ignored this user
      Example:
      B → A = ignored
      Now A tries:
      A → B = interested
      I would NOT allow A to create another request if B has already explicitly ignored A.
      */
      if (
        existingRequest?.status === 'ignored' &&
        existingRequest.fromUserId.toString() !== fromUserId.toString()
      ) {
        return res.status(400).json({
          message: 'This user is not available for a connection request',
        });
      }
      // No existing relationship
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
      res.status(500).json({ error: 'Internal Server Error' + error.message });
    }
  },
);

requestRouter.post(
  '/review/:status/:requestId',
  checkValidMiddleware,
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const { status, requestId } = req.params;

      const allowedStatus = ['accepted', 'rejected'];
      // Check if the provided status is allowed
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({
          message: 'Status not allowed!',
        });
      }
      const connectionRequest = await ConnectionRequestModel.findOne({
        _id: requestId,
        toUserId: loggedInUser._id,
        status: 'interested',
      });

      if (!connectionRequest) {
        return res.status(404).json({
          message: 'Connection request not found',
        });
      }
      // Update the status of the connection request based on the provided status
      connectionRequest.status = status;
      // If request is rejected, store the rejection time
      if (status === 'rejected') {
        connectionRequest.rejectedAt = new Date();
      }
      const data = await connectionRequest.save();
      res.json({
        message: 'Connection request ' + status,
        data,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' + error.message });
    }
  },
);

module.exports = requestRouter;
