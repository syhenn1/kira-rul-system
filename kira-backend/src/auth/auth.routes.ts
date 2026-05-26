import { Router } from 'express';
import passport from 'passport';
import { register, login, googleCallback, getMe, updateProfile, setPin, verifyPin } from './auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login', session: false }),
  googleCallback
);

router.get('/me', authenticateJWT, getMe);
router.put('/me', authenticateJWT, updateProfile);
router.post('/set-pin', authenticateJWT, setPin);
router.post('/verify-pin', authenticateJWT, verifyPin);

export default router;
