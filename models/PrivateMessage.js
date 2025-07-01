const mongoose = require('mongoose');

const privateMessageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  message: String,
  fileUrl: { type: String, default: "" },
fileType: { type: String, default: "" }, 

  read: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
    visibleTo: {
    type: [String], // list of userIds who can see the message
    default: function () {
      return [this.senderId, this.receiverId]; // both can see by default
    }
  }
});

module.exports = mongoose.model('PrivateMessage', privateMessageSchema);
