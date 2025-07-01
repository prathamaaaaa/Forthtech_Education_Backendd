// socketHandler.js
const PublicMessage = require('../models/PublicMessage');
const PrivateMessage = require('../models/PrivateMessage');
const GroupMessage = require('../models/GroupMessage');
const Group = require('../models/Group');
const handleSocketConnection = (io, socket, onlineUsers) => {
  const userId = socket.handshake.auth?.userId;

  if (userId) {
    onlineUsers.set(userId, socket.id);
    console.log(`🟢 ${userId} connected as ${socket.id}`);
  }
socket.on("join-group", ({ groupId }) => {
  socket.join(groupId);
  console.log(`✅ Socket ${socket.id} joined group ${groupId}`);
});

  socket.on("setup", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`🧑‍💻 User ${userId} is online with socket ${socket.id}`);
  });

  // Load public history
  PublicMessage.find().sort({ timestamp: 1 }).limit(100).then((messages) => {
    socket.emit('public-chat-history', messages);
  });

  socket.on('public-message', async ({ sender, message }) => {
    const msg = new PublicMessage({ sender, message });
    await msg.save();
    io.emit('public-message', {
      sender,
      message,
      timestamp: msg.timestamp
    });
  });

  socket.on("send-invite", ({ fromId, toId }) => {
    const receiverSocketId = onlineUsers.get(toId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive-invite", { fromId });
    }
  });

  // socket.on("send-message", async ({ senderId, receiverId, message }) => {
  //   const msg = await PrivateMessage.create({ senderId, receiverId, message });
  //   const receiverSocketId = onlineUsers.get(receiverId);
  //   if (receiverSocketId) {
  //     io.to(receiverSocketId).emit("receive-message", msg);
  //   }
  //   socket.emit("message-sent", msg);
  // });

// socket.on("send-message", async ({ senderId, receiverId, message }) => {
//   const msg = await PrivateMessage.create({
//     senderId,
//     receiverId,
//     message,
//     visibleTo: [senderId, receiverId], // 👈 Only these 2 can see the message
//   });

//   const receiverSocketId = onlineUsers.get(receiverId);
//   if (receiverSocketId) {
//     io.to(receiverSocketId).emit("receive-message", msg);
//   }
//   socket.emit("message-sent", msg);
// });



socket.on("send-message", async ({ senderId, receiverId, message, fileUrl, fileType }) => {
  const msg = await PrivateMessage.create({
    senderId,
    receiverId,
    message,
    fileUrl: fileUrl || "",
    fileType: fileType || "",
    visibleTo: [senderId, receiverId],
  });

  const receiverSocketId = onlineUsers.get(receiverId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("receive-message", msg);
  }
  socket.emit("message-sent", msg);
});





  socket.on("load-messages", async ({ currentUserId, selectedUserId }) => {
    // const messages = await PrivateMessage.find({
    //   $or: [
    //     { senderId: currentUserId, receiverId: selectedUserId },
    //     { senderId: selectedUserId, receiverId: currentUserId },
    //   ],
    // }).sort({ timestamp: 1 });

    const messages = await PrivateMessage.find({
  $or: [
    { senderId: currentUserId, receiverId: selectedUserId },
    { senderId: selectedUserId, receiverId: currentUserId },
  ],
  visibleTo: currentUserId, 
}).sort({ timestamp: 1 });

    socket.emit("message-history", messages);
  });

  socket.on("contact-accepted", ({ fromId, toId, user }) => {
    const toSocketId = onlineUsers.get(toId);
    if (toSocketId) {
      io.to(toSocketId).emit("contact-accepted", { user });
    }
  });



  //  socket.on("load-group-messages", async ({ groupId }) => {
  //   try {
  //     const msgs = await GroupMessage.find({ groupId })
  //       .populate("senderId", "firstName lastName _id")
  //       .sort({ timestamp: 1 });
  //     socket.emit("group-message-history", msgs);
  //   } catch (err) {
  //     console.error("Failed to load group messages:", err);
  //   }
  // });


socket.on("load-group-messages", async ({ groupId, userId }) => {
  try {
    const msgs = await GroupMessage.find({
      groupId,
      visibleTo: userId // 🟢 Only messages visible to this user
    })
      .populate("senderId", "firstName lastName _id")
      .sort({ timestamp: 1 });

    socket.emit("group-message-history", msgs);
  } catch (err) {
    console.error("Failed to load group messages:", err);
  }
});


socket.on("delete-messages", ({ ids }) => {
  io.emit("delete-messages", { ids }); // broadcast to all clients
});




  //   socket.on("send-group-message", async (msg) => {
  //   try {
  //     const saved = await GroupMessage.create(msg);
  //     const populated = await saved.populate("senderId", "firstName lastName _id");
  //     io.emit("receive-group-message", populated); // Broadcast to all
  //   } catch (err) {
  //     console.error("Failed to save group message:", err);
  //   }
  // });




//   socket.on("send-group-message", async (msg) => {
//   // msg = { groupId, senderId, message, timestamp }

//   const group = await Group.findById(msg.groupId);
//   if (!group) return;

//   const visibleTo = [group.creator.toString(), ...group.members.map(m => m.toString())];

//   const newMessage = new GroupMessage({
//     groupId: msg.groupId,
//     senderId: msg.senderId,
//     message: msg.message,
//     timestamp: msg.timestamp || Date.now(),
//     visibleTo
//   });

//   await newMessage.save();

//   io.to(msg.groupId).emit("receive-group-message", newMessage);
// });







// socket.on("send-group-message", async (data) => {
//   try {
//     const newMessage = await GroupMessage.create({
//       senderId: data.senderId,
//       message: data.message,
//       groupId: data.groupId,
//       timestamp: new Date(),
//       visibleTo: data.visibleTo || [],
//     });

//     const populatedMessage = await GroupMessage.findById(newMessage._id)
//       .populate("senderId", "firstName lastName _id");

//     io.to(data.groupId).emit("receive-group-message", populatedMessage); 
//   } catch (err) {
//     console.error("send-group-message error:", err);
//   }
// });


socket.on("send-group-message", async (data) => {
  const newMessage = await GroupMessage.create({
    senderId: data.senderId,
    message: data.message,
    fileUrl: data.fileUrl || "",
    fileType: data.fileType || "",
    groupId: data.groupId,
    timestamp: new Date(),
    visibleTo: data.visibleTo || [],
  });

  const populatedMessage = await GroupMessage.findById(newMessage._id)
    .populate("senderId", "firstName lastName _id");

  io.to(data.groupId).emit("receive-group-message", populatedMessage);
});






socket.on("group-created", ({ group, memberIds }) => {
  memberIds.forEach((memberId) => {
    console.log(`🔔 Notifying member ${memberId} about new group ${group.name}`);
    const receiverSocketId = onlineUsers.get(memberId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("group-created-notification", {
        message: `You have been added to the group "${group.name}"`,
        group,
      });
    }
  });
});

  socket.on("leave-group", async ({ groupId, userId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) return;

      if (group.creator.toString() === userId) {
        socket.emit("leave-group-error", "Creator cannot leave.");
        return;
      }

      group.members = group.members.filter(memberId => memberId.toString() !== userId);
      await group.save();

      socket.emit("left-group", groupId);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 ${socket.id} disconnected`);
    for (let [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        break;
      }
    }
  });
};

module.exports = handleSocketConnection;
