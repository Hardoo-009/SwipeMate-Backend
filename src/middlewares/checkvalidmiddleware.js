const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');
const User = require('../models/user');

const checkValidMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).send('Token is not present.');
    }
    // if the token is present , then the payload which is returned contains the userId of the user , which is present in the payload of the token, which was set during the login and signup process
    // and if the token is invalid , then the jwt.verify function will throw an error and the catch block will be executed
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    //but now we have to check whether the token is present in the redis blacklist or not , if it is present in the blacklist , then the token is invalid and we have to return an error message
    const isBlocked = await redisClient.exists(`token:${token}`);
    if (isBlocked) {
      return res.status(401).send('Token is invalid.');
    }
    const { _id } = payload;
    if (!_id) {
      return res.status(401).send('User ID is not present.');
    }
    // Check whether the user still exists maybe the user has been deleted from the db
    const user = await User.findById(_id);
    if (!user) {
      return res.status(401).send('User is not present.');
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }
};

module.exports = checkValidMiddleware;
