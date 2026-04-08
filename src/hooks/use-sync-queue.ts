import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getPendingOps,
  getPendingCount,
  removeSyncOp,
  markSyncFailed,
  type SyncOperation,
} from '@/lib/sync-queue';
import { useOnlineStatus } from './use-online-status';
import { toast } from 'sonner';

const MAX_RETRIES = 5;

export function useSyncQueue() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  /** Process a single operation against Supabase */
  const processOp = async (op: SyncOperation): Promise<boolean> => {
    try {
      if (op.action === 'insert') {
        const { error } = await (supabase.from(op.table) as any).insert(op.payload);
        if (error) throw error;
      } else if (op.action === 'update') {
        if (!op.matchColumn || !op.matchValue) throw new Error('Missing match criteria');

        // Conflict resolution: check server's updated_at via last-write-wins
        if ('updated_at' in op.payload) {
          const { data: serverRow } = await (supabase.from(op.table) as any)
            .select('updated_at')
            .eq(op.matchColumn, op.matchValue)
            .maybeSingle();

          if (serverRow?.updated_at) {
            const serverTime = new Date(serverRow.updated_at).getTime();
            const localTime = new Date(op.createdAt).getTime();
            if (serverTime > localTime) {
              console.log(`[Sync] Conflict resolved: server wins for ${op.table}/${op.matchValue}`);
              return true;
            }
          }
        }

        const { error } = await (supabase.from(op.table) as any)
          .update(op.payload)
          .eq(op.matchColumn, op.matchValue);
        if (error) throw error;
      } else if (op.action === 'delete') {
        if (!op.matchColumn || !op.matchValue) throw new Error('Missing match criteria');
        const { error } = await (supabase.from(op.table) as any)
          .delete()
          .eq(op.matchColumn, op.matchValue);
        if (error) throw error;
      }
      return true;
    } catch (err: any) {
      console.error(`[Sync] Failed op ${op.id}:`, err?.message);
      return false;
    }
  };

  /** Drain the queue — process all pending operations in order */
  const processQueue = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);

    const ops = await getPendingOps();
    let synced = 0;
    let failed = 0;

    for (const op of ops) {
      if (op.retries >= MAX_RETRIES) {
        // Permanently failed — remove and warn
        await removeSyncOp(op.id);
        failed++;
        continue;
      }

      const success = await processOp(op);
      if (success) {
        await removeSyncOp(op.id);
        synced++;
      } else {
        await markSyncFailed(op.id, 'Sync failed');
        failed++;
      }
    }

    if (synced > 0) {
      toast.success(`Synced ${synced} pending change${synced > 1 ? 's' : ''}`);
    }
    if (failed > 0) {
      toast.warning(`${failed} change${failed > 1 ? 's' : ''} failed to sync`);
    }

    await refreshCount();
    syncingRef.current = false;
    setSyncing(false);
  }, [refreshCount]);

  // Auto-process queue when coming back online
  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  // Refresh count on mount
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  return { pendingCount, syncing, processQueue, refreshCount };
}
