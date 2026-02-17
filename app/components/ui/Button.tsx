import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Loading state */
  isLoading?: boolean;
  /** Loading text (shown when loading) */
  loadingText?: string;
  /** Full width button */
  fullWidth?: boolean;
  /** Icon to show before text */
  leftIcon?: React.ReactNode;
  /** Icon to show after text */
  rightIcon?: React.ReactNode;
}

/**
 * Button component with Man2Man design system
 * 
 * Features:
 * - Mobile-first touch targets (min 56px height)
 * - Multiple variants: primary, secondary, tertiary, ghost, danger
 * - Loading state support with spinner
 * - Full width option for mobile layouts
 * 
 * @example
 * <Button>Click me</Button>
 * <Button variant="primary" isLoading>Loading...</Button>
 * <Button variant="tertiary" leftIcon={<Icon />}>With Icon</Button>
 * <Button fullWidth>Full Width Button</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-200 ease-in-out " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-rose)] focus-visible:ring-offset-2 " +
      "disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] " +
      "touch-manipulation select-none";

    const variants = {
      primary: [
        "bg-[var(--color-rose)] text-white",
        "hover:bg-[var(--color-rose-light)]",
        "active:bg-[var(--color-rose-dark)]",
      ],
      secondary: [
        "bg-[var(--color-navy-surface)] text-white",
        "border border-[var(--color-border)]",
        "hover:bg-[var(--color-navy-elevated)]",
        "hover:border-[var(--color-border-focus)]",
      ],
      tertiary: [
        "bg-transparent text-white",
        "border-2 border-[var(--color-rose)]",
        "hover:bg-[var(--color-rose)]/10",
        "active:bg-[var(--color-rose)]/20",
      ],
      ghost: [
        "bg-transparent text-[var(--color-text-secondary)]",
        "hover:bg-[var(--color-navy-surface)]",
        "hover:text-white",
      ],
      danger: [
        "bg-[var(--color-error)] text-white",
        "hover:bg-[#E01440]",
        "active:bg-[#C01238]",
      ],
    };

    const sizes = {
      sm: "min-h-[44px] px-4 py-2 text-sm rounded-[10px]",
      md: "min-h-[56px] px-6 py-3 text-base rounded-[12px]",
      lg: "min-h-[64px] px-8 py-4 text-lg rounded-[16px]",
    };

    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          isLoading && "relative",
          className
        )}
        disabled={isDisabled}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2
              className="mr-2 h-5 w-5 animate-spin flex-shrink-0"
              aria-hidden="true"
            />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && (
              <span className="mr-2 flex-shrink-0" aria-hidden="true">
                {leftIcon}
              </span>
            )}
            <span className="truncate">{children}</span>
            {rightIcon && (
              <span className="ml-2 flex-shrink-0" aria-hidden="true">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

/**
 * Icon Button - Square button optimized for icon-only usage
 */
export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: "primary" | "secondary" | "tertiary" | "ghost";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Loading state */
  isLoading?: boolean;
  /** Icon element */
  icon: React.ReactNode;
  /** Accessible label (required for icon-only buttons) */
  "aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = "ghost",
      size = "md",
      isLoading = false,
      icon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-200 ease-in-out " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-rose)] focus-visible:ring-offset-2 " +
      "disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] " +
      "touch-manipulation select-none";

    const variants = {
      primary: [
        "bg-[var(--color-rose)] text-white",
        "hover:bg-[var(--color-rose-light)]",
        "active:bg-[var(--color-rose-dark)]",
      ],
      secondary: [
        "bg-[var(--color-navy-surface)] text-white",
        "border border-[var(--color-border)]",
        "hover:bg-[var(--color-navy-elevated)]",
        "hover:border-[var(--color-border-focus)]",
      ],
      tertiary: [
        "bg-transparent text-white",
        "border-2 border-[var(--color-rose)]",
        "hover:bg-[var(--color-rose)]/10",
        "active:bg-[var(--color-rose)]/20",
      ],
      ghost: [
        "bg-transparent text-[var(--color-text-secondary)]",
        "hover:bg-[var(--color-navy-surface)]",
        "hover:text-white",
      ],
    };

    const sizes = {
      sm: "h-11 w-11 min-h-[44px] min-w-[44px] text-sm rounded-[10px]",
      md: "h-14 w-14 min-h-[56px] min-w-[56px] text-base rounded-[12px]",
      lg: "h-16 w-16 min-h-[64px] min-w-[64px] text-lg rounded-[16px]",
    };

    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          isLoading && "relative",
          className
        )}
        disabled={isDisabled}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
