const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 4,
      maxLength: 50,
    },
    lastName: {
      type: String,
    },
    emailId: {
      type: String,
      lowercase: true,
      required: true,
      unique: true,
      trim: true,
      // this value which is used in the validate function is the value of the emailId field in the userSchema
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email address: ' + value);
        }
      },
    },
    password: {
      type: String,
      required: true,
      validate(value) {
        if (!validator.isStrongPassword(value)) {
          throw new Error('Enter a Strong Password: ' + value);
        }
      },
    },
    age: {
      type: Number,
      min: 18,
    },
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other'],
        message: `{VALUE} is not a valid gender type`,
      },
      // validate(value) {
      //   if (!["male", "female", "others"].includes(value)) {
      //     throw new Error("Gender data is not valid");
      //   }
      // },
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    membershipType: {
      type: String,
    },
    photoUrl: {
      type: String,
      default: function () {
        // this refers to the current document (user) being created
        if (this.gender === 'female') {
          return 'https://images.unsplash.com/photo-1544725176-7c40e5a2c9f9?w=256&h=256&fit=crop&auto=format';
        }
        if (this.gender === 'male') {
          return 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=256&h=256&fit=crop&auto=format';
        }
        return 'https://images.unsplash.com/photo-1548932813-1ff6aa1e0a02?w=256&h=256&fit=crop&auto=format';
      },
      validate(value) {
        if (!validator.isURL(value)) {
          throw new Error('Invalid Photo URL: ' + value);
        }
      },
    },
    about: {
      type: String,
      default: 'This is a default about of the user!',
    },
    skills: {
      type: [String],
    },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.getJWT = async function () {
  const user = this;

  const token = await jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  return token;
};

userSchema.methods.validatePassword = async function (passwordInputByUser) {
  const user = this;
  const passwordHash = user.password;

  const isPasswordValid = await bcrypt.compare(
    passwordInputByUser,
    passwordHash,
  );

  return isPasswordValid;
};

module.exports = mongoose.model('User', userSchema);
