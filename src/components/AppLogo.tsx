import { cn } from '@/lib/utils';
import logoIcon from '@/assets/logo-mark.png';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: { container: 'h-4 w-4', rounded: 'rounded-sm', pad: 'p-0.5' },
  sm: { container: 'h-8 w-8', rounded: 'rounded-lg', pad: 'p-1.5' },
  md: { container: 'h-10 w-10', rounded: 'rounded-xl', pad: 'p-2' },
  lg: { container: 'h-16 w-16', rounded: 'rounded-2xl', pad: 'p-3' },
  xl: { container: 'h-20 w-20', rounded: 'rounded-2xl', pad: 'p-3.5' },
};

export function AppLogo({ size = 'sm', className }: AppLogoProps) {
  const s = sizeMap[size];
  return (
    <span
      className={cn(
        s.container,
        s.rounded,
        s.pad,
        'inline-flex items-center justify-center shrink-0 bg-primary',
        className,
      )}
    >
      <img
        src={logoIcon}
        alt="Syllabix"
        width={40}
        height={40}
        decoding="async"
        className="h-full w-full object-contain"
      />
    </span>
  );
}
