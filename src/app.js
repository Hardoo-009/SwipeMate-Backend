const express = require('express');
const app = express();
require('dotenv').config();
const connectDB = require('./config/database');
const cookieParser = require('cookie-parser');
const redisClient = require('./config/redis');
const cors = require('cors');
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const requestRouter = require('./routes/request');
const userRouter = require('./routes/user');

app.use(cookieParser());
app.use(cors());
app.use(express.json());

// Use the authRouter for routes starting with /auth
app.use('/auth', authRouter);
// Use the profileRouter for routes starting with /profile
app.use('/profile', profileRouter);
// Use the requestRouter for routes starting with /request
app.use('/request', requestRouter);
// Use the userRouter for routes starting with /user
app.use('/user', userRouter);
async function InitializeConnection() {
  try {
    await Promise.all([connectDB(), redisClient.connect()]);
    console.log('Connected to all the databases');
    app.listen(3000, () => {
      console.log(`the server is running on the port http://localhost:3000`);
    });
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
}

InitializeConnection();

// connectDB()
//   .then(() => {
//     console.log('Connected to the database');
//     app.listen(3000, () => {
//       console.log(`Server is running on http://localhost:3000`);
//     });
//   })
//   .catch((error) => {
//     console.error('Error connecting to the database:', error);
//   });
