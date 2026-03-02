import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: { container: 'h-4 w-4', icon: 'h-2.5 w-2.5', rounded: 'rounded-sm' },
  sm: { container: 'h-8 w-8', icon: 'h-4 w-4', rounded: 'rounded-lg' },
  md: { container: 'h-10 w-10', icon: 'h-5 w-5', rounded: 'rounded-xl' },
  lg: { container: 'h-16 w-16', icon: 'h-8 w-8', rounded: 'rounded-2xl' },
  xl: { container: 'h-20 w-20', icon: 'h-10 w-10', rounded: 'rounded-2xl' },
};

export function AppLogo({ size = 'sm', className }: AppLogoProps) {
  const s = sizeMap[size];
  return (
    <div
      className={cn(
        s.container,
        s.rounded,
        'bg-primary flex items-center justify-center shrink-0',
        className
      )}
    >
      <BookOpen className={cn(s.icon, 'text-primary-foreground')} />
    </div>
  );
}
