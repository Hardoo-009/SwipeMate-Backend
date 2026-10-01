const redis = require('redis');

const redisClient = redis.createClient({
  username: 'default',
  password: 'nVQ1taKURykucikJlLWr7kX5JqKXQorr',
  socket: {
    host: 'sandy-belief-glove-68870.db.redis.io',
    port: 14051,
  },
});

module.exports = redisClient;
