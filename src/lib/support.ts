import { supabase } from '@/integrations/supabase/client';
import {
  saveSupportMessage,
  getPendingSupportMessages,
  markSupportMessageSynced,
  type SupportMessage,
} from '@/lib/db';
import { z } from 'zod';

export const supportMessageSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(200, 'Name must be under 200 characters'),
  email: z.string().trim().email('Please enter a valid email').max(320, 'Email is too long'),
  message: z.string().trim().min(5, 'Message must be at least 5 characters').max(5000, 'Message must be under 5000 characters'),
});

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Queue a support message locally, then attempt to sync immediately if online. */
export async function queueSupportMessage(input: { name: string; email: string; message: string }): Promise<SupportMessage> {
  const msg: SupportMessage = {
    id: genId(),
    name: input.name.trim(),
    email: input.email.trim(),
    message: input.message.trim(),
    synced: false,
    createdAt: new Date().toISOString(),
  };
  await saveSupportMessage(msg);
  if (typeof navigator === 'undefined' || navigator.onLine) {
    await syncSupportMessages();
  }
  return msg;
}

/** Push any pending (unsynced) support messages to the backend. */
export async function syncSupportMessages(): Promise<{ synced: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0 };

  const pending = await getPendingSupportMessages();
  if (pending.length === 0) return { synced: 0 };

  const { data: { user } } = await supabase.auth.getUser();
  let synced = 0;

  for (const msg of pending) {
    const { error } = await supabase.from('support_messages').insert({
      user_id: user?.id ?? null,
      name: msg.name,
      email: msg.email,
      message: msg.message,
    });
    if (!error) {
      await markSupportMessageSynced(msg.id);
      synced++;
    }
  }
  return { synced };
}

let listenerRegistered = false;
/** Re-sync pending support messages whenever the device comes back online. */
export function initSupportSync(): void {
  if (listenerRegistered || typeof window === 'undefined') return;
  listenerRegistered = true;
  window.addEventListener('online', () => {
    void syncSupportMessages();
  });
  // Attempt an initial sync on startup
  void syncSupportMessages();
}