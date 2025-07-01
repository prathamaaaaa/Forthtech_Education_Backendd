const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  progress: Number,
  nextMeeting: String,
  activeDiscussions: Number,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPrivate: { type: Boolean, default: false }, 
  joinRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  memberAvatars: [String]
  
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);