import { verifyRefreshToken, generateTokens } from "../../middleware/auth.js";
import User from "../../models/User.js";
import Token from "../../models/Token.js";

const refreshController = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token is required' });
    const tokenDoc = await verifyRefreshToken(refreshToken);
    const user = await User.findById(tokenDoc.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    await Token.findByIdAndDelete(tokenDoc._id);
    const tokens = await generateTokens(user);
    res.json({
      message: 'Tokens refreshed successfully',
      data: {
        auth: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, tokenType: 'Bearer', accessTokenExpires: tokens.accessTokenExpires, refreshTokenExpires: tokens.refreshTokenExpires }
      }
    });
  } catch (error) { res.status(401).json({ message: 'Invalid refresh token', error: error.message }); }
};
export default refreshController;
