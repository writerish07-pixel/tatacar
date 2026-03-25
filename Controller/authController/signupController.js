import User from '../../models/User.js';
import { generateTokens } from '../../middleware/auth.js';

const signupController = async (req, res) => {
  try {
    const { userId, username, password, role } = req.body;
    if (!userId || !password) return res.status(400).json({ message: 'Username and password are required' });
    const existingUser = await User.findOne({ userId });
    if (existingUser) return res.status(400).json({ message: 'Username already exists' });
    const validRoles = ['admin', 'sales','teamLead'];
    if (role && !validRoles.includes(role)) return res.status(400).json({ message: 'Invalid role. Must be either admin or sales' });
    const newUser = new User({ userId, username, password, role: role || 'sales' });
    await newUser.save();
    const tokens = await generateTokens(newUser);
    res.status(201).json({
      message: 'User created successfully',
      data: {
        user: { id: newUser._id, userId: newUser.userId, username: newUser.username, role: newUser.role },
        auth: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, tokenType: 'Bearer' }
      }
    });
  } catch (error) { res.status(500).json({ message: 'Error creating user', error: error.message }); }
};
export default signupController;
