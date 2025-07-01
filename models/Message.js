// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    from: String,
    to: String,
    text: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});
console.log("Message schema created:", messageSchema.obj);  // 👈 Add this for debugging
module.exports = mongoose.model('Message', messageSchema);
