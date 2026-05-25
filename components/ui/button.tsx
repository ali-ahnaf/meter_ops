import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border text-sm font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default:
          'border-blue-700 bg-blue-700 text-white hover:bg-blue-800',
        secondary:
          'border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
        ghost:
          'border-transparent bg-transparent text-slate-700 hover:bg-slate-100',
      },
      size: {
        default: 'px-5 py-3',
        sm: 'px-3 py-2 text-xs',
        icon: 'h-12 w-12 px-0 py-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
