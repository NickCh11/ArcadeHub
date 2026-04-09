import { db } from './client';
import type { PresenceStatus } from '../redis/presence';

export async function getPublicKey(userId: string): Promise<{ ecdhPublicKey: string | null }> {
  const { data } = await db
    .from('profiles')
    .select('ecdh_public_key')
    .eq('id', userId)
    .single();
  return { ecdhPublicKey: data?.ecdh_public_key ?? null };
}

export async function setPublicKeys(userId: string, ecdhPublicKey: string) {
  const { error } = await db
    .from('profiles')
    .update({ ecdh_public_key: ecdhPublicKey })
    .eq('id', userId);
  if (error) throw error;
}

export async function searchUsers(query: string, limit = 20) {
  const { data, error } = await db
    .from('profiles')
    .select('id, username, user_tag, avatar_url, ecdh_public_key, status')
    .ilike('username', `%${query}%`)
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getUserProfile(userId: string) {
  const { data, error } = await db
    .from('profiles')
    .select('id, username, user_tag, avatar_url, ecdh_public_key, role, status, bio, username_changed_at')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function setUserStatus(userId: string, status: PresenceStatus) {
  const { error } = await db
    .from('profiles')
    .update({ status })
    .eq('id', userId);
  if (error) throw error;
}

export interface ProfileUpdateFields {
  username?: string;
  bio?: string;
  avatarUrl?: string;
}

export async function updateUserProfile(userId: string, fields: ProfileUpdateFields) {
  const updateData: Record<string, unknown> = {};

  if (fields.bio !== undefined) updateData['bio'] = fields.bio;
  if (fields.avatarUrl !== undefined) updateData['avatar_url'] = fields.avatarUrl;

  if (fields.username !== undefined) {
    // Enforce 7-day cooldown on username changes
    const { data: current } = await db
      .from('profiles')
      .select('username, username_changed_at')
      .eq('id', userId)
      .single();

    if (current?.username !== fields.username) {
      if (current?.username_changed_at) {
        const lastChanged = new Date(current.username_changed_at as string).getTime();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - lastChanged < sevenDays) {
          const nextAllowed = new Date(lastChanged + sevenDays).toISOString();
          throw Object.assign(new Error('Username can only be changed once per week'), {
            code: 'USERNAME_COOLDOWN',
            nextAllowed,
          });
        }
      }
      updateData['username'] = fields.username;
      updateData['username_changed_at'] = new Date().toISOString();
    }
  }

  if (Object.keys(updateData).length === 0) return;

  const { error } = await db
    .from('profiles')
    .update(updateData)
    .eq('id', userId);
  if (error) throw error;
}
