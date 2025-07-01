const mongoose = require('mongoose');

const publicMessageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PublicMessage', publicMessageSchema);
