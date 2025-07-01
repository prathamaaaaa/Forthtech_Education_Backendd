const mongoose = require('mongoose');

const GroupMessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, default: "" },
  fileUrl: { type: String, default: "" },
  fileType: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  visibleTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

// ✅ Place this AFTER the schema is defined
GroupMessageSchema.pre('validate', function (next) {
  if ((!this.message || this.message.trim() === '') && (!this.fileUrl || this.fileUrl.trim() === '')) {
    this.invalidate('message', 'Either message or file must be provided.');
  }
  next();
});

module.exports = mongoose.model('GroupMessage', GroupMessageSchema);
