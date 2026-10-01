const mongoose = require('mongoose');

const connectionRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['ignored', 'interested', 'accepted', 'rejected'],
        message: `{VALUE} is incorrect status type`,
      },
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);
// Create a compound index to ensure uniqueness of connection requests between users
connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 });

// Pre-save middleware to check if fromUserId and toUserId are the same
connectionRequestSchema.pre('save', function (next) {
  const connectionRequest = this;
  // Check if the fromUserId is same as toUserId
  if (connectionRequest.fromUserId.equals(connectionRequest.toUserId)) {
    throw new Error('Cannot send connection request to yourself!');
  }
  next();
});
const ConnectionRequestModel = mongoose.model(
  'ConnectionRequest',
  connectionRequestSchema,
);

module.exports = ConnectionRequestModel;
