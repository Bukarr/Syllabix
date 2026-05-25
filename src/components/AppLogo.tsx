import { cn } from '@/lib/utils';
import logoIcon from '@/assets/logo-icon.jpg';

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
    <img
      src={logoIcon}
      alt="Syllabix"
      className={cn(
        s.container,
        s.rounded,
        'object-contain shrink-0',
        className
      )}
    />
  );
}
