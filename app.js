const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const handleSocketConnection = require('./routes/socketHandler'); 
const notificationRoutes = require('./routes/notificationRoutes'); 
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const onlineUsers = new Map();
app.set('onlineUsersMap', onlineUsers);
app.set('io', io);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB Connected');
}).catch(err => {
  console.error('❌ MongoDB Connection Failed:', err);
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/users', require('./routes/loginRoutes'));
app.use('/api', require('./routes/messageRoutes'));
app.use('/api/groups', require('./routes/groupRoutes')); 
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/uploads', express.static('uploads')); // serve static files
app.use('/api/upload', require('./routes/upload')); // your upload route

// 🔌 Socket.IO
io.on('connection', (socket) => {
  handleSocketConnection(io, socket, onlineUsers); 
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running with WebSocket on port ${PORT}`);
});

module.exports = { app, server, io, onlineUsers };





// const express = require('express');
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const http = require('http');
// const { Server } = require('socket.io');

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST']
//   }
// });

// app.set('io', io);

// // MongoDB connection
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }).then(() => {
//   console.log('✅ MongoDB Connected');
// }).catch(err => {
//   console.error('❌ MongoDB Connection Failed:', err);
// });

// // Models
// const PublicMessage = require('./models/PublicMessage');
// const PrivateMessage = require('./models/PrivateMessage');
// const User = require('./models/userModel');

// // Routes
// const userRoutes = require('./routes/userRoutes');
// const loginRoutes = require('./routes/loginRoutes');
// const messageRoutes = require('./routes/messageRoutes');

// app.use('/api/users', userRoutes);
// app.use('/api/users', loginRoutes);
// app.use('/api', messageRoutes);

// // In-memory online users map
// // const onlineUsers = new Map();
// const onlineUsers = new Map();
// app.set('onlineUsersMap', onlineUsers); // ✅ Make it accessible in routes


// io.on('connection', (socket) => {
//   const userId = socket.handshake.auth?.userId;

//   if (userId) {
//     onlineUsers.set(userId, socket.id);
//     console.log(`🟢 ${userId} connected as ${socket.id}`);
//   }

//     socket.on("setup", (userId) => {
//     onlineUsers.set(userId, socket.id);
//     console.log(`🧑‍💻 User ${userId} is online with socket ${socket.id}`);
//   });

//   PublicMessage.find().sort({ timestamp: 1 }).limit(100).then((messages) => {
//     socket.emit('public-chat-history', messages);
//   });

//   socket.on('public-message', async ({ sender, message }) => {
//     const msg = new PublicMessage({ sender, message });
//     await msg.save();
//     io.emit('public-message', {
//       sender,
//       message,
//       timestamp: msg.timestamp
//     });
//   });

//   socket.on("send-invite", ({ fromId, toId }) => {
//     const receiverSocketId = onlineUsers.get(toId);
//     console.log("📨 Invite attempt:", { fromId, toId, receiverSocketId });

//     if (receiverSocketId) {
//       io.to(receiverSocketId).emit("receive-invite", { fromId });
//       console.log(`✅ Invite sent to ${toId} (${receiverSocketId})`);
//     } else {
//       console.log(`❌ User ${toId} is not online. Invite not delivered.`);
//     }
//   });

//   socket.on('load-messages', async ({ currentUserId, selectedUserId }) => {
//     const messages = await PrivateMessage.find({
//       $or: [
//         { senderId: currentUserId, receiverId: selectedUserId },
//         { senderId: selectedUserId, receiverId: currentUserId }
//       ]
//     }).sort({ timestamp: 1 });

//     socket.emit('message-history', messages);
//   });
//   socket.on("send-message", async ({ senderId, receiverId, message }) => {
//     const msg = await PrivateMessage.create({ senderId, receiverId, message });

//     const receiverSocketId = onlineUsers.get(receiverId);
//     console.log(`🟢 ${senderId} sent message to ${receiverId}:`, msg);
//     if (receiverSocketId) {
//       io.to(receiverSocketId).emit("receive-message", msg);
//     }

//     socket.emit("message-sent", msg);
//   });
  

// socket.on("contact-accepted", ({ fromId, toId, user }) => {
//   const toSocketId = onlineUsers.get(toId);
//   if (toSocketId) {
//     io.to(toSocketId).emit("contact-accepted", { user });
//   }
// });












//   // Handle disconnect
//   socket.on('disconnect', () => {
//     console.log(`🔴 ${socket.id} disconnected`);
//     for (let [uid, sid] of onlineUsers.entries()) {
//       if (sid === socket.id) {
//         onlineUsers.delete(uid);
//         break;
//       }
//     }
//   });
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`🚀 Server running with WebSocket on port ${PORT}`);
// });



// module.exports = { app, server, io, onlineUsers };




// const express = require('express');
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const http = require('http');
// const { Server } = require('socket.io');

// // Load env
// dotenv.config();

// // Express app
// const app = express();
// app.use(cors());
// app.use(express.json());


// // MongoDB Connection
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }).then(() => {
//   console.log('✅ MongoDB Connected');
// }).catch(err => {
//   console.error('❌ MongoDB Connection Failed:', err);
// });

// // Models
// const PublicMessage = require('./models/PublicMessage');
// const PrivateMessage = require('./models/PrivateMessage');
// const User = require('./models/userModel'); // your user model

// // Routes
// const userRoutes = require('./routes/userRoutes');
// const loginRoutes = require('./routes/loginRoutes');
// const messageRoutes = require('./routes/messageRoutes');
// app.use('/api/users', userRoutes);
// app.use('/api/users', loginRoutes);
// app.use('/api',messageRoutes);


// // Custom route: get all users
// app.get('/api/all-users', async (req, res) => {
//   try {
//     const users = await User.find({}, '-password'); // exclude password
//     res.json(users);
//   } catch (err) {
//     res.status(500).json({ error: 'Error fetching users' });
//   }
// });

// // HTTP server + Socket.IO
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST']
//   }
// });
// app.set('io', io);

// // In-memory map of online users: userId -> socket.id
// const onlineUsers = new Map();

// socket.on("setup", (userId) => {
//   onlineUsers.set(userId, socket.id);
//   console.log(`🧑‍💻 User ${userId} is online with socket ${socket.id}`);
// });

// // WebSocket Events
// io.on('connection', (socket) => {
//   const userId = socket.handshake.auth?.userId;
// console.log(`🟢 ${socket.id} connected with userId: ${userId}`);
//   if (userId) {
//     onlineUsers.set(userId, socket.id);
//     console.log(`🟢 ${userId} connected as ${socket.id}`);
//   }

//   // --- Public Chat ---
//   PublicMessage.find().sort({ timestamp: 1 }).limit(100).then((messages) => {
//     socket.emit('public-chat-history', messages);
//   });

//   socket.on('public-message', async ({ sender, message }) => {
//     const msg = new PublicMessage({ sender, message });
//     await msg.save();
//     io.emit('public-message', {
//       sender,
//       message,
//       timestamp: msg.timestamp
//     });
//   });
// socket.on("send-invite", ({ fromId, toId }) => {
//   const receiverSocketId = onlineUsers.get(toId);
//   console.log("📨 Invite attempt:", { fromId, toId, receiverSocketId });

//   if (receiverSocketId) {
//     io.to(receiverSocketId).emit("receive-invite", { fromId });
//     console.log(`✅ Invite sent to ${toId} (${receiverSocketId})`);
//   } else {
//     console.log(`❌ User ${toId} is not online. Invite not delivered.`);
//   }
// });

//   // --- Private Chat ---
//   socket.on('load-messages', async ({ currentUserId, selectedUserId }) => {
//     const messages = await PrivateMessage.find({
//       $or: [
//         { senderId: currentUserId, receiverId: selectedUserId },
//         { senderId: selectedUserId, receiverId: currentUserId }
//       ]
//     }).sort({ timestamp: 1 });

//     socket.emit('message-history', messages);
//   });


// // Inside io.on("connection") {...}
// socket.on("send-message", async ({ senderId, receiverId, message }) => {
//   const msg = await PrivateMessage.create({ senderId, receiverId, message });

//   const receiverSocketId = onlineUsers.get(receiverId); 
//   console.log(`🟢 ${senderId} sent message to ${receiverId}:`, msg);
//   if (receiverSocketId) {
//     io.to(receiverSocketId).emit("receive-message", msg); // ✅ emit to receiver
//   }

//   // Optionally, emit back to sender
//   socket.emit("message-sent", msg);
// });


//   // --- Disconnect ---
//   socket.on('disconnect', () => {
//     console.log(`🔴 ${socket.id} disconnected`);
//     for (let [uid, sid] of onlineUsers.entries()) {
//       if (sid === socket.id) {
//         onlineUsers.delete(uid);
//         break;
//       }
//     }
//   });
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`🚀 Server running with WebSocket on port ${PORT}`);
// });
