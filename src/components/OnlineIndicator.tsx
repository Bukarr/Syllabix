import { useOnlineStatus } from '@/hooks/use-online-status';
import { useSyncQueue } from '@/hooks/use-sync-queue';
import { Wifi, WifiOff, CloudOff } from 'lucide-react';

export function OnlineIndicator() {
  const isOnline = useOnlineStatus();
  const { pendingCount } = useSyncQueue();

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {isOnline ? (
        <>
          <Wifi className="h-3.5 w-3.5 text-success" />
          <span className="text-muted-foreground">
            {pendingCount > 0 ? `${pendingCount} pending` : 'Online'}
          </span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5 text-warning" />
          <span className="text-warning">
            Offline{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </span>
        </>
      )}
    </div>
  );
}
