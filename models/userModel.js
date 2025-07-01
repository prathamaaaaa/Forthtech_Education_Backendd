// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   // Remove custom ID field
  
//   firstName: { type: String, required: true },
//   lastName: { type: String, required: true },
//   email:    { type: String, required: true, unique: true },
//   password: { type: String, required: true }
// }, { timestamps: true });

// module.exports = mongoose.model('User', userSchema);
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },

  followList: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: []
    }
  ],

  // Incoming follow requests (with user and status)
  requestList: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      status: {
        type: String,
        enum: [ 'sent', 'pending'],
        default: 'pending',
      }
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
