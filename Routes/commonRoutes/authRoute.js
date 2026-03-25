import { Router } from 'express';
const router = Router();

router.get('/auth/health', (req, res) => {
  res.json({ message: 'Auth routes working' });
});

export default router;
