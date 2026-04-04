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
    .select('id, username, avatar_url, ecdh_public_key')
    .ilike('username', `%${query}%`)
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getUserProfile(userId: string) {
  const { data, error } = await db
    .from('profiles')
    .select('id, username, avatar_url, ecdh_public_key, role, status')
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
