const express = require('express');
const app = express();
require('dotenv').config();
const connectDB = require('./config/database');
const cookieParser = require('cookie-parser');
const cors = require('cors');

app.use(cookieParser());
app.use(cors());
app.use(express.json());

// Define your routes here
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

connectDB()
  .then(() => {
    console.log('Connected to the database');
    app.listen(3000, () => {
      console.log(`Server is running on http://localhost:3000`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to the database:', error);
  });
