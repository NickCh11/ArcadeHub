export interface UserProfile {
  id: string;
  username: string;
  user_tag?: number;
  display_name?: string;
  avatar_url?: string;
  status: 'online' | 'away' | 'offline';
  ecdh_public_key?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface DecryptedMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  plaintext: string;
  createdAt: string;
  pending?: boolean;
}

export interface RawDMMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  ciphertext_recipient: string;
  ciphertext_sender: string;
  ephemeral_public_key: string;
  created_at: string;
}
