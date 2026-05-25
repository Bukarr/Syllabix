import { cn } from '@/lib/utils';
import logoIcon from '@/assets/logo-icon.png';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: { container: 'h-4 w-4', rounded: 'rounded-sm' },
  sm: { container: 'h-8 w-8', rounded: 'rounded-lg' },
  md: { container: 'h-10 w-10', rounded: 'rounded-xl' },
  lg: { container: 'h-16 w-16', rounded: 'rounded-2xl' },
  xl: { container: 'h-20 w-20', rounded: 'rounded-2xl' },
};

export function AppLogo({ size = 'sm', className }: AppLogoProps) {
  const s = sizeMap[size];
  return (
    <div
      className={cn(
        s.container,
        s.rounded,
        'bg-primary flex items-center justify-center shrink-0 overflow-hidden',
        className
      )}
    >
      <img
        src={logoIcon}
        alt="Syllabix"
        className="h-[78%] w-[78%] object-contain"
      />
    </div>
  );
}
