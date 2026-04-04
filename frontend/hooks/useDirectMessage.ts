'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '../../shared/types/events';
import type { NewDMPayload } from '../../shared/types/events';
import type { DecryptedMessage, RawDMMessage } from '@/types';
import {
  encryptDM,
  decryptDMAsRecipient,
  decryptDMAsSender,
  importEcdhPublicKey,
} from '@/lib/crypto/directMessage';
import { loadKey, KEY_NAMES } from '@/lib/crypto/keyStorage';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function useDirectMessage(
  socket: Socket | null,
  userId: string | null,
  otherUserId: string | null,
  token: string | null
) {
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Load DM history
  useEffect(() => {
    if (!otherUserId || !userId || !token) return;
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND}/api/dm/${otherUserId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Could not load DM messages');
        const resData = await res.json();
        const rawMessages: RawDMMessage[] = Array.isArray(resData) ? resData : [];

        const myPrivKey = await loadKey(KEY_NAMES.ecdhPrivate(userId!));
        if (!myPrivKey) throw new Error('ECDH private key not found');

        const decrypted = await Promise.all(
          rawMessages.map(async (m) => {
            try {
              let plaintext: string;
              if (m.sender_id === userId) {
                plaintext = await decryptDMAsSender(m.ciphertext_sender, m.ephemeral_public_key, m.id, myPrivKey);
              } else {
                plaintext = await decryptDMAsRecipient(m.ciphertext_recipient, m.ephemeral_public_key, m.id, myPrivKey);
              }
              return {
                id: m.id,
                senderId: m.sender_id,
                senderName: m.sender_id === userId ? 'You' : '',
                plaintext,
                createdAt: m.created_at,
              } as DecryptedMessage;
            } catch {
              return {
                id: m.id,
                senderId: m.sender_id,
                senderName: '',
                plaintext: '[Could not decrypt]',
                createdAt: m.created_at,
              } as DecryptedMessage;
            }
          })
        );
        if (!cancelled) setMessages(decrypted);
      } catch (err) {
        console.error('[DM] History load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHistory();
    return () => { cancelled = true; };
  }, [otherUserId, userId, token]);

  // Listen for incoming DMs
  useEffect(() => {
    if (!socket || !userId) return;

    const handler = async ({ message }: NewDMPayload) => {
      const isForThisConvo =
        (message.senderId === otherUserId && message.recipientId === userId) ||
        (message.senderId === userId && message.recipientId === otherUserId);
      if (!isForThisConvo) return;

      const myPrivKey = await loadKey(KEY_NAMES.ecdhPrivate(userId));
      if (!myPrivKey) return;

      try {
        let plaintext: string;
        if (message.senderId === userId) {
          plaintext = await decryptDMAsSender(message.ciphertextSender, message.ephemeralPublicKey, message.id, myPrivKey);
        } else {
          plaintext = await decryptDMAsRecipient(message.ciphertextRecipient, message.ephemeralPublicKey, message.id, myPrivKey);
        }
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== message.id),
          {
            id: message.id,
            senderId: message.senderId,
            senderName: message.senderName,
            senderAvatar: message.senderAvatar,
            plaintext,
            createdAt: message.createdAt,
          },
        ]);
      } catch (err) {
        console.error('[DM] Decrypt incoming error:', err);
      }
    };

    socket.on(SOCKET_EVENTS.NEW_DM, handler);
    return () => { socket.off(SOCKET_EVENTS.NEW_DM, handler); };
  }, [socket, userId, otherUserId]);

  // Send a DM
  const sendMessage = useCallback(
    async (plaintext: string, senderName: string, senderAvatar?: string) => {
      if (!socket || !userId || !otherUserId || !token) return;

      // Load our own static private + public keys
      const myPrivKey = await loadKey(KEY_NAMES.ecdhPrivate(userId));
      const myPubKey = await loadKey(KEY_NAMES.ecdhPublic(userId));
      if (!myPrivKey || !myPubKey) throw new Error('Keys not initialized');

      // Fetch recipient's public key
      const res = await fetch(`${BACKEND}/api/users/${otherUserId}/public-key`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { ecdhPublicKey } = await res.json();
      if (!ecdhPublicKey) throw new Error('Recipient has no public key');

      const recipientPubKey = await importEcdhPublicKey(ecdhPublicKey);
      const messageId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const { ciphertextRecipient, ciphertextSender, ephemeralPublicKey } = await encryptDM(
        plaintext, messageId, myPubKey, recipientPubKey
      );

      socket.emit(SOCKET_EVENTS.SEND_DM, {
        message: {
          id: messageId,
          senderId: userId,
          recipientId: otherUserId,
          senderName,
          senderAvatar,
          ciphertextRecipient,
          ciphertextSender,
          ephemeralPublicKey,
          createdAt,
        },
      });
    },
    [socket, userId, otherUserId, token]
  );

  return { messages, loading, sendMessage };
}
