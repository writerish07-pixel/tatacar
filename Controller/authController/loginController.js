import { authenticateUser, generateTokens } from "../../middleware/auth.js";

const loginController = async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) return res.status(400).json({ message: 'Username and password are required' });
    const user = await authenticateUser(userId, password);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const tokens = await generateTokens(user);
    if (!tokens.accessToken || !tokens.refreshToken) throw new Error('Failed to generate tokens');
    const response = {
      message: 'Login successful',
      data: {
        user: { id: user.userId, userId: user.userId, username: user.username, role: user.role },
        auth: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, tokenType: 'Bearer' }
      }
    };
    res.json(response);
  } catch (error) { res.status(500).json({ message: 'Internal server error', error: error.message }); }
};
export default loginController;
