import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-semibold uppercase tracking-[0.24em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default:
          'border-[rgba(34,211,238,0.55)] bg-[rgba(34,211,238,0.12)] text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.18)] hover:border-cyan-300 hover:bg-[rgba(34,211,238,0.18)]',
        secondary:
          'border-[rgba(244,114,182,0.38)] bg-[rgba(244,114,182,0.08)] text-pink-200 hover:border-pink-300 hover:bg-[rgba(244,114,182,0.14)]',
        ghost:
          'border-[rgba(148,163,184,0.24)] bg-transparent text-slate-200 hover:border-[rgba(34,211,238,0.45)] hover:text-cyan-200',
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
