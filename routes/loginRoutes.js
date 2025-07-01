const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
// 🔹 Basic Login (no hashing, NOT secure for production)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare plain text password
    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Success
    res.json({
      message: "Login successful",
      user: {
        id: user._id, // ✅ now it will work
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
