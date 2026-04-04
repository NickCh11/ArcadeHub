import { db } from './client';

export async function getRooms() {
  const { data, error } = await db
    .from('chatrooms')
    .select('id, name, created_by, created_at')
    .eq('is_private', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getRoomWithType(roomId: string) {
  const { data, error } = await db
    .from('chatrooms')
    .select('id, name, created_by, created_at, is_private')
    .eq('id', roomId)
    .single();
  if (error) throw error;
  return data;
}

export async function getRoomById(roomId: string) {
  const { data, error } = await db
    .from('chatrooms')
    .select('id, name, created_by, created_at')
    .eq('id', roomId)
    .single();
  if (error) throw error;
  return data;
}

export async function createRoom(name: string, createdBy: string) {
  const { data, error } = await db
    .from('chatrooms')
    .insert({ name, created_by: createdBy, is_private: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRoomById(roomId: string) {
  const { error: msgError } = await db.from('group_messages').delete().eq('chatroom_id', roomId);
  if (msgError) throw msgError;

  const { error } = await db.from('chatrooms').delete().eq('id', roomId);
  if (error) throw error;
}

export async function getUserRole(userId: string): Promise<string> {
  const { data } = await db
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role ?? 'user';
}
