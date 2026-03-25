import { Router } from 'express';
const router = Router();

router.get('/health', (req, res) => {
  res.json({ message: 'Common routes working' });
});

export default router;
