const verifyController = async (req, res) => {
  try {
    res.json({
      message: 'Token is valid',
      user: { id: req.user.userId, username: req.user.username, role: req.user.role }
    });
  } catch (error) { res.status(500).json({ message: 'Internal server error', error: error.message }); }
};
export default verifyController;
