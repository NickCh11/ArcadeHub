'use client';

import { generateEcdhKeyPair, exportEcdhPublicKey } from '@/lib/crypto/directMessage';
import { storeKey, hasKey, KEY_NAMES } from '@/lib/crypto/keyStorage';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function bootstrapUserKeys(userId: string, accessToken: string) {
  const hasPrivate = await hasKey(KEY_NAMES.ecdhPrivate(userId));
  const hasPublic = await hasKey(KEY_NAMES.ecdhPublic(userId));

  if (hasPrivate && hasPublic) return;

  const pair = await generateEcdhKeyPair();
  await storeKey(KEY_NAMES.ecdhPrivate(userId), pair.privateKey);
  await storeKey(KEY_NAMES.ecdhPublic(userId), pair.publicKey);

  const ecdhPubB64 = await exportEcdhPublicKey(pair.publicKey);

  const response = await fetch(`${BACKEND}/api/users/me/public-key`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ecdhPublicKey: ecdhPubB64 }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Could not upload public key');
  }
}
