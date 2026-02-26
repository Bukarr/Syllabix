import { useOnlineStatus } from '@/hooks/use-online-status';
import { Wifi, WifiOff } from 'lucide-react';

export function OnlineIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {isOnline ? (
        <>
          <Wifi className="h-3.5 w-3.5 text-success" />
          <span className="text-muted-foreground">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5 text-warning" />
          <span className="text-warning">Offline</span>
        </>
      )}
    </div>
  );
}
