const express = require('express');
const router = express.Router();
const Group = require('../models/Group'); // Ensure this path is correct
const Notification = require('../models/Notification')
const mongoose = require('mongoose');
const User = require('../models/userModel');
router.get('/', async (req, res) => {
  const { userId } = req.query;

  try {
    let query = {};
    if (userId) {
      query = {
        $or: [
          { creator: userId },
          { members: userId }
        ]
      };
    }

    const groups = await Group.find(query)
      .populate('members', 'firstName lastName email')
      .populate('creator', 'firstName lastName email') 
      .populate('joinRequests', 'firstName lastName email');

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

// Create a group
// router.post('/create', async (req, res) => {
//   try {
//     const { name, description, category, creatorId, members, progress, nextMeeting, activeDiscussions, isPrivate } = req.body;


//     const avatars = members.map(() => 'https://github.com/shadcn.png');

//     const newGroup = await Group.create({
//       name,
//       description,
//       category,
//       creator: creatorId,
//       members,
//       progress,
//       nextMeeting,
//       activeDiscussions,
//       memberAvatars: avatars,
//       isPrivate
//     });

//     res.status(201).json(newGroup);
//   } catch (err) {
//     console.error('Error creating group:', err);
//     res.status(500).json({ error: err.message });
//   }
// });



router.post('/create', async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      creatorId,
      members,
      progress,
      nextMeeting,
      activeDiscussions,
      isPrivate
    } = req.body;

    const avatars = members.map(() => 'https://github.com/shadcn.png');

    const newGroup = await Group.create({
      name,
      description,
      category,
      creator: creatorId,
      members,
      progress,
      nextMeeting,
      activeDiscussions,
      memberAvatars: avatars,
      isPrivate
    });

const visibleTo = members.filter(id => id !== creatorId);


    const now = new Date();

    await Notification.create({
      title: 'New Group Created',
      description: `You've been added to the group "${name}"`,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      server: 'Group System',
      visibleTo,
      isReadBy: []
    });

    res.status(201).json(newGroup);
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ error: err.message });
  }
});




// POST /api/groups/:groupId/add-members

router.post('/:groupId/add-members', async (req, res) => {
  const { userIds } = req.body;
  const groupId = req.params.groupId;

  console.log("Incoming userIds:", userIds);

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const existingMemberIds = group.members.filter(Boolean).map(id => id.toString());
    console.log("Existing group members:", existingMemberIds);

    // Filter out invalid IDs and duplicates
    const cleanUserIds = (userIds || []).filter(uid => uid);
    console.log("Clean userIds:", cleanUserIds);

    const newUserIds = cleanUserIds.filter(uid => !existingMemberIds.includes(uid));
    console.log("New user IDs to add:", newUserIds);

    const newObjectIds = newUserIds.map(id => new mongoose.Types.ObjectId(id));

    group.members.push(...newObjectIds);
    group.memberAvatars.push(...newUserIds.map(() => 'https://github.com/shadcn.png'));

    await group.save();

    const now = new Date();

    if (newUserIds.length > 0) {
      await Notification.create({
        title: 'Added to Group',
        description: `You've been added to the group "${group.name}"`,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        server: 'Group System',
        visibleTo: newUserIds,
        isReadBy: []
      });

      const notifyOthers = [
        group.creator.toString(),
        ...existingMemberIds
      ].filter(uid => !newUserIds.includes(uid));

      if (notifyOthers.length > 0) {
        await Notification.create({
          title: 'New Members Added',
          description: `New members have joined your group "${group.name}"`,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          server: 'Group System',
          visibleTo: notifyOthers,
          isReadBy: []
        });
      }
    }

    res.status(200).json({ message: 'Members added successfully' });
  } catch (err) {
    console.error('Error adding members:', err);
    res.status(500).json({ message: 'Failed to add members' });
  }
});








// POST /api/groups/:groupId/reject-request
router.post('/:groupId/reject-request', async (req, res) => {
  const { userId } = req.body;
  console.log('Rejecting request for userId:', userId);
  console.log('Group ID:', req.params.groupId);
  if (!userId) {
    return res.status(400).json({ message: 'Missing userId' });
  }

  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    console.log('Before rejection (joinRequests IDs):', group.joinRequests.map(id => id.toString()));

    const newJoinRequests = group.joinRequests.filter(
      (id) => id.toString() !== userId
    );

    if (newJoinRequests.length === group.joinRequests.length) {
      return res.status(400).json({ message: 'User not in join requests or already processed.' });
    }

    group.joinRequests = newJoinRequests; // Update the array

    await group.save(); // Save the modified group document
    console.log('After rejection (joinRequests IDs):', group.joinRequests.map(id => id.toString()));

    res.status(200).json({ message: 'Request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ message: 'Failed to reject request' });
  }
});

// POST /api/groups/:groupId/accept-request
router.post('/:groupId/accept-request', async (req, res) => {
  const { userId } = req.body;

  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'User is already a member of this group.' });
    }

    // Notify existing members and creator (excluding new user)
    const notifyUsers = [
      group.creator.toString(),
      ...group.members.map(m => m.toString())
    ].filter(uid => uid !== userId);

    // Add user to group
    group.members.push(userId);
    group.memberAvatars.push('https://github.com/shadcn.png');
    group.joinRequests = group.joinRequests.filter(id => id.toString() !== userId);

    await group.save();

    const now = new Date();

    // 🔔 Notify members & creator
    if (notifyUsers.length > 0) {
      await Notification.create({
        title: 'New Member Joined',
        description: `A new member has joined your group "${group.name}"`,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        server: 'Group System',
        visibleTo: notifyUsers,
        isReadBy: []
      });
    }

    // 🔔 Notify the user whose request was accepted
    await Notification.create({
      title: 'Request Accepted',
      description: `Your request to join the group "${group.name}" was accepted.`,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      server: 'Group System',
      visibleTo: [userId],
      isReadBy: []
    });

    res.status(200).json({ message: 'User added to group and request accepted' });
  } catch (err) {
    console.error('Error accepting request:', err);
    res.status(500).json({ message: 'Failed to accept request' });
  }
});




// POST /api/groups/:groupId/join
router.post('/:groupId/join', async (req, res) => {
  const { userId } = req.body;

  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) return res.status(404).json({ message: 'Group not found' });

    const alreadyMember = group.members.includes(userId);
    const alreadyRequested = group.joinRequests.includes(userId);

    if (alreadyMember) {
      return res.status(400).json({ message: 'You are already a member of this group.' });
    }

   if (group.isPrivate) {
  if (alreadyRequested) {
    return res.status(400).json({ message: 'Join request already sent for this private group.' });
  }

  group.joinRequests.push(userId);
  await group.save();

  // 🔔 Notify the group creator only
  const now = new Date();
  await Notification.create({
    title: 'New Join Request',
    description: `A user has requested to join your group "${group.name}"`,
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().split(' ')[0],
    server: 'Group System',
    visibleTo: [group.creator.toString()],
    isReadBy: []
  });

  return res.status(200).json({ message: 'Join request sent for private group. Awaiting creator approval.' });
}

     else {
      // Public group — direct join
      const notifyUsers = [
        group.creator.toString(),
        ...group.members.map(m => m.toString())
      ].filter(uid => uid !== userId);

      group.members.push(userId);
      group.memberAvatars.push('https://github.com/shadcn.png');

      await group.save();

      // Notify all others
      if (notifyUsers.length > 0) {
        const now = new Date();
        await Notification.create({
          title: 'New Member Joined',
          description: `A new member has joined your group "${group.name}"`,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          server: 'Group System',
          visibleTo: notifyUsers,
          isReadBy: []
        });
      }

      return res.status(200).json({ message: 'Successfully joined the public group.' });
    }
  } catch (err) {
    console.error('Error joining group:', err);
    res.status(500).json({ message: 'Failed to join group' });
  }
});




router.post('/leave-group', async (req, res) => {
  try {
    const { groupId, userId } = req.body;
console.log("leave")
    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid groupId or userId' });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // If user is creator, you can decide to disallow or auto-delete the group
    if (group.creator.toString() === userId) {
      return res.status(400).json({ message: 'Group creator cannot leave. You may delete the group.' });
    }

    // Remove user from members array
    // group.members = group.members.filter(memberId => memberId.toString() !== userId);

    group.members = group.members.filter(memberId => memberId && memberId.toString() !== userId);

    await group.save();
    
  const notifyUsers = [
      group.creator.toString(),
      ...group.members.map(m => m.toString())
    ].filter(uid => uid !== userId);  // avoid notifying the one who left
const userWhoLeft = await User.findById(userId);

    if (notifyUsers.length > 0) {
      const now = new Date();
      await Notification.create({
        title: 'Member Left Group',
        description: `${userWhoLeft.firstName} ${userWhoLeft.lastName} left your group "${group.name}"`,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        server: 'Group System',
        visibleTo: notifyUsers,
        isReadBy: []
      });
    }
    return res.status(200).json({
      message: 'Successfully left the group',
      group
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
