import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getPublicKey, setPublicKeys, searchUsers, getUserProfile, setUserStatus } from '../db/users';
import type { PresenceStatus } from '../redis/presence';

const router = Router();

// Get a user's public keys (ECDH for DMs)
router.get('/users/:userId/public-key', authMiddleware, async (req, res) => {
  try {
    const keys = await getPublicKey(req.params['userId'] as string);
    res.json(keys);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Validate that a string is base64 and within a sane byte length range
function isValidB64Key(s: string, minBytes: number, maxBytes: number): boolean {
  if (typeof s !== 'string') return false;
  const b64 = /^[A-Za-z0-9+/]+={0,2}$/.test(s.trim());
  if (!b64) return false;
  const bytes = Math.floor(s.length * 3 / 4);
  return bytes >= minBytes && bytes <= maxBytes;
}

// Upload own ECDH public key (called on first login after key generation)
router.put('/users/me/public-key', authMiddleware, async (req, res) => {
  const { ecdhPublicKey } = req.body as { ecdhPublicKey?: string };
  if (!ecdhPublicKey) {
    res.status(400).json({ error: 'ecdhPublicKey is required' });
    return;
  }
  // ECDH P-256 SPKI ≈ 91 bytes — allow ±50 bytes slack
  if (!isValidB64Key(ecdhPublicKey, 60, 150)) {
    res.status(400).json({ error: 'Invalid ECDH public key format' });
    return;
  }
  try {
    await setPublicKeys(req.user!.id, ecdhPublicKey);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get own profile
router.get('/users/me', authMiddleware, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user!.id);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/me/status', authMiddleware, async (req, res) => {
  const { status } = req.body as { status?: PresenceStatus };
  if (status !== 'online' && status !== 'away' && status !== 'offline') {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  try {
    await setUserStatus(req.user!.id, status);
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search users
router.get('/users/search', authMiddleware, async (req, res) => {
  const q = (req.query.q as string) || '';
  if (q.length < 2) {
    res.json([]);
    return;
  }
  try {
    const users = await searchUsers(q);
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
