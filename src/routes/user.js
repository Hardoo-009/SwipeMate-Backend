const express = require('express');
const userRouter = express.Router();
const User = require('../models/user');
const ConnectionRequestModel = require('../models/connectionrequest');
const checkValidMiddleware = require('../middlewares/checkvalidmiddleware');

const USER_SAFE_DATA = 'firstName lastName photoUrl age gender about skills';

// Get all the pending connection request for the loggedIn user
userRouter.get(
  '/user/requests/received',
  checkValidMiddleware,
  async (req, res) => {
    try {
      const loggedInUser = req.user;

      const connectionRequests = await ConnectionRequestModel.find({
        toUserId: loggedInUser._id,
        status: 'interested',
      }).populate('fromUserId', USER_SAFE_DATA); // we need fromUserId to get the details of the user who sent the request, so we populate it with the user model and select only the safe fields
      // }).populate("fromUserId", ["firstName", "lastName"]);

      res.json({
        message: 'Data fetched successfully',
        data: connectionRequests,
      });
    } catch (err) {
      console.error('Error fetching received connection requests:', err);
      res.statusCode(400).send('ERROR: ' + err.message);
    }
  },
);

//Get the requests sent by the logged in user
userRouter.get(
  '/user/requests/sent',
  checkValidMiddleware,
  async (req, res) => {
    try {
      const loggedInUser = req.user;

      const connectionRequests = await ConnectionRequestModel.find({
        fromUserId: loggedInUser._id,
      })
        .populate('toUserId', USER_SAFE_DATA)
        .select('status toUserId createdAt');

      res.json({
        message: 'Data fetched successfully',
        data: connectionRequests,
      });
    } catch (err) {
      console.error('Error fetching sent connection requests:', err);
      res.statusCode(400).send('ERROR: ' + err.message);
    }
  },
);

//get all the user connections
userRouter.get('/user/connections', checkValidMiddleware, async (req, res) => {
  try {
    const loggedInUser = req.user;

    // Find all connection requests where the logged-in user is either the sender or receiver and the status is 'accepted'
    const connectionRequests = await ConnectionRequestModel.find({
      $or: [
        { toUserId: loggedInUser._id, status: 'accepted' },
        { fromUserId: loggedInUser._id, status: 'accepted' },
      ],
    })
      .populate('fromUserId', USER_SAFE_DATA)
      .populate('toUserId', USER_SAFE_DATA);
    // return the other user in the connection request, not the logged in user
    const data = connectionRequests.map((row) => {
      if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
        return row.toUserId;
      }
      return row.fromUserId;
    });
    res.json({
      message: 'Data fetched successfully',
      data: data,
    });
  } catch (err) {
    console.error('Error fetching user connections:', err);
    res.statusCode(400).send('ERROR: ' + err.message);
  }
});

module.exports = userRouter;
