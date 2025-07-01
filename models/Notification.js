const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: String,
  description: String,
  date: String,
  time: String,
  server: String,

  visibleTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  isReadBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
});

module.exports = mongoose.model('Notification', notificationSchema);
