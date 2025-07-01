const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app); // ⬅ instead of app.listen()
const io = new Server(server, {
    cors: {
        origin: '*', // You can restrict this to your frontend domain
        methods: ['GET', 'POST'],
    },
});
const PublicMessage = require('./models/PublicMessage');

io.on('connection', (socket) => {
  console.log('🟢 New WebSocket client:', socket.id);

  // Send public chat history
  PublicMessage.find().sort({ timestamp: 1 }).limit(100).then((messages) => {
    socket.emit('public-chat-history', messages);
  });

  // Listen for new messages
  socket.on('public-message', async ({ sender, message }) => {
    const msg = new PublicMessage({ sender, message });
    await msg.save();

    // Broadcast to all clients
    io.emit('public-message', {
      sender,
      message,
      timestamp: msg.timestamp
    });
  });

  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
