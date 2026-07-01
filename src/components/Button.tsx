import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
type ButtonSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[15px] md:text-xs',
  md: 'px-4 py-2 text-[15px] md:text-sm',
  lg: 'px-8 py-3 text-[15px] md:text-sm font-semibold',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent font-semibold text-white shadow-sm hover:bg-accent-bright active:scale-[0.98]',
  secondary:
    'border border-accent/35 bg-accent-soft font-medium text-accent hover:border-accent/55 hover:bg-accent/15',
  tertiary: 'font-medium text-accent hover:bg-accent-soft',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full transition-colors disabled:pointer-events-none disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
});
