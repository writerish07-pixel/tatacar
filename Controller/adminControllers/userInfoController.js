import User from '../../models/User.js';

const userInfoController = async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
    res.json({ message: 'User info fetched', data: users });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export default userInfoController;
