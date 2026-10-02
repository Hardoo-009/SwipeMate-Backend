const express = require('express');
const userRouter = express.Router();
const User = require('../models/user');
const ConnectionRequestModel = require('../models/connectionrequest');
const checkValidMiddleware = require('../middlewares/checkvalidmiddleware');

const USER_SAFE_DATA = 'firstName lastName photoUrl age gender about skills';

// Get all the pending connection request for the loggedIn user
userRouter.get('/requests/received', checkValidMiddleware, async (req, res) => {
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
});

//Get the requests sent by the logged in user
userRouter.get('/requests/sent', checkValidMiddleware, async (req, res) => {
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
});

//get all the user connections
userRouter.get('/connections', checkValidMiddleware, async (req, res) => {
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

// feed of the user based on the ignored and the interested status of the connection request
userRouter.get('/feed', checkValidMiddleware, async (req, res) => {
  try {
    const loggedInUser = req.user;
    // Get pagination values from query parameters
    // Example: user/feed?page=2&limit=20
    const page = parseInt(req.query.page) || 1;

    // Default limit = 30 users per page
    let limit = parseInt(req.query.limit) || 30;

    // Never allow more than 50 users per request
    limit = limit > 50 ? 50 : limit;

    // Calculate how many users MongoDB should skip
    // Example:
    // page 1, limit 30 -> skip 0
    // page 2, limit 30 -> skip 30
    // page 3, limit 30 -> skip 60
    const skip = (page - 1) * limit;
    //Find all connection requests involving the logged-in user
    // Find all connection requests where the logged-in user is either the sender or receiver
    const connectionRequests = await ConnectionRequestModel.find({
      $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
    }).select('fromUserId toUserId status rejectedAt');

    // This Set will contain user IDs that should NOT appear
    // in the logged-in user's feed.
    //
    // We use a Set because it automatically prevents duplicate IDs.
    const hideUsersFromFeed = new Set();
    const loggedInUserId = loggedInUser._id.toString();
    // 30 days in milliseconds
    const cooldown = 30 * 24 * 60 * 60 * 1000;
    //Decide which users should be hidden from the feed
    connectionRequests.forEach((request) => {
      const fromUserId = request.fromUserId.toString();
      const toUserId = request.toUserId.toString();

      // ACCEPTED
      // They are already connected.
      // Neither should appear in the other's dating feed.
      if (request.status === 'accepted') {
        hideUsersFromFeed.add(fromUserId);
        hideUsersFromFeed.add(toUserId);
        return;
      }
      //INTERESTED
      //A → B = interested , B has not responded yet
      //We should hide both A and B from each other's feed
      if (request.status === 'interested') {
        hideUsersFromFeed.add(fromUserId);
        hideUsersFromFeed.add(toUserId);
        return;
      }
      // IGNORED
      // INGONED is unidirectional. If A → B = ignored, then A has ignored B.
      // Therefore, B should not appear in A's feed , but A can still appear in B's feed.
      if (request.status === 'ignored') {
        // Only hide the target user if the logged-in user
        // is the person who performed the ignore action.
        if (fromUserId === loggedInUserId) {
          hideUsersFromFeed.add(toUserId);
        }
        return;
      }
      // Request was rejected
      if (request.status === 'rejected') {
        // Check whether the 30-day rejection cooldown
        // is still active.
        const isWithinCooldown =
          request.rejectedAt &&
          Date.now() - request.rejectedAt.getTime() < cooldown;

        if (isWithinCooldown) {
          // Rejection happened less than 30 days ago.
          // Therefore, hide both users from each other's feed.
          hideUsersFromFeed.add(fromUserId);
          hideUsersFromFeed.add(toUserId);
        }

        // If more than 30 days have passed,
        // we DON'T add the users to hideUsersFromFeed.
        // Therefore they can appear in the feed again.
        return;
      }
    });
    // Now we can query the User collection to get users who are not in the hideUsersFromFeed set
    const users = await User.find({
      $and: [
        // Don't show users who are already involved
        // in a connection request with the logged-in user.
        {
          _id: {
            $nin: Array.from(hideUsersFromFeed),
          },
        },

        // Don't show the logged-in user themselves.
        {
          _id: {
            $ne: loggedInUser._id, // for the edge case where set is empty
          },
        },
      ],
    })
      .select(USER_SAFE_DATA)
      // Pagination
      .skip(skip)
      .limit(limit);
    res.json({
      data: users,
    });
  } catch (err) {
    console.error('Error fetching user feed:', err);
    res.statusCode(400).send('ERROR: ' + err.message);
  }
});

module.exports = userRouter;
