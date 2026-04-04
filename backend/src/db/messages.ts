import { db } from './client';

export async function saveGroupMessage(
  id: string,
  chatroomId: string,
  senderId: string,
  ciphertext: string | null,
  nonce: string | null,
  createdAt: string,
  plaintext?: string
) {
  const { error } = await db.from('group_messages').insert({
    id,
    chatroom_id: chatroomId,
    sender_id: senderId,
    ciphertext: ciphertext ?? null,
    nonce: nonce ?? null,
    created_at: createdAt,
    plaintext: plaintext ?? null,
  });
  if (error) throw error;
}

export async function getGroupMessages(chatroomId: string, limit = 50) {
  const { data, error } = await db
    .from('group_messages')
    .select('id, chatroom_id, sender_id, ciphertext, nonce, plaintext, created_at, profiles(username, avatar_url)')
    .eq('chatroom_id', chatroomId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).reverse();
}

export async function saveDMMessage(
  id: string,
  senderId: string,
  recipientId: string,
  ciphertextRecipient: string,
  ciphertextSender: string,
  ephemeralPublicKey: string
) {
  const { error } = await db.from('direct_messages').insert({
    id,
    sender_id: senderId,
    recipient_id: recipientId,
    ciphertext_recipient: ciphertextRecipient,
    ciphertext_sender: ciphertextSender,
    ephemeral_public_key: ephemeralPublicKey,
  });
  if (error) throw error;
}

export async function getDMMessages(userId: string, otherUserId: string, limit = 50) {
  const { data, error } = await db
    .from('direct_messages')
    .select('id, sender_id, recipient_id, ciphertext_recipient, ciphertext_sender, ephemeral_public_key, created_at')
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).reverse();
}
