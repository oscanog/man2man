import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label text */
  label?: string;
  /** Helper text or error message */
  helperText?: string;
  /** Error state */
  error?: boolean;
  /** Left icon */
  leftIcon?: React.ReactNode;
  /** Right icon (overrides password toggle) */
  rightIcon?: React.ReactNode;
  /** Full width input */
  fullWidth?: boolean;
  /** Input size */
  size?: "sm" | "md" | "lg";
}

/**
 * Input component optimized for mobile
 * 
 * Features:
 * - Touch-friendly height (min 56px)
 * - Built-in label and helper text support
 * - Error state styling
 * - Icon support
 * - Password visibility toggle
 * - Full width by default
 * 
 * @example
 * <Input label="Email" placeholder="Enter your email" />
 * <Input label="Password" type="password" />
 * <Input label="Username" leftIcon={<UserIcon />} error helperText="Username is required" />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error = false,
      leftIcon,
      rightIcon,
      fullWidth = true,
      size = "md",
      type = "text",
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;

    const sizes = {
      sm: "min-h-[44px] px-3 text-sm",
      md: "min-h-[56px] px-4 text-base",
      lg: "min-h-[64px] px-5 text-lg",
    };

    const iconSizes = {
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
    };

    const paddingLeft = {
      sm: leftIcon ? "pl-10" : "pl-3",
      md: leftIcon ? "pl-12" : "pl-4",
      lg: leftIcon ? "pl-14" : "pl-5",
    };

    const paddingRight = {
      sm: rightIcon || isPassword ? "pr-10" : "pr-3",
      md: rightIcon || isPassword ? "pr-12" : "pr-4",
      lg: rightIcon || isPassword ? "pr-14" : "pr-5",
    };

    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "font-medium text-[var(--color-text-primary)]",
              size === "sm" && "text-sm",
              size === "md" && "text-base",
              size === "lg" && "text-lg",
              disabled && "opacity-50"
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none",
                size === "sm" && "left-3",
                size === "lg" && "left-5"
              )}
              aria-hidden="true"
            >
              <span className={iconSizes[size]}>{leftIcon}</span>
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            disabled={disabled}
            className={cn(
              // Base styles
              "w-full bg-[var(--color-navy-surface)] text-white placeholder-[var(--color-text-muted)]",
              "border rounded-[12px] transition-all duration-200 ease-in-out",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-rose)]/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              
              // Size styles
              sizes[size],
              paddingLeft[size],
              paddingRight[size],
              
              // Border styles
              error
                ? "border-[var(--color-error)] focus:border-[var(--color-error)]"
                : "border-[var(--color-border)] focus:border-[var(--color-rose)]",
              
              className
            )}
            aria-invalid={error}
            aria-describedby={helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {/* Password toggle button or right icon */}
          {(isPassword || rightIcon) && (
            <div
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2",
                size === "sm" && "right-3",
                size === "lg" && "right-5"
              )}
            >
              {isPassword && !rightIcon ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={cn(
                    "text-[var(--color-text-muted)] hover:text-white transition-colors",
                    "focus:outline-none focus:text-[var(--color-rose)]",
                    "p-1 rounded"
                  )}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className={iconSizes[size]} />
                  ) : (
                    <Eye className={iconSizes[size]} />
                  )}
                </button>
              ) : (
                <span className={cn("text-[var(--color-text-muted)]", iconSizes[size])}>
                  {rightIcon}
                </span>
              )}
            </div>
          )}
        </div>
        {helperText && (
          <p
            id={`${inputId}-helper`}
            className={cn(
              "text-sm",
              error
                ? "text-[var(--color-error)]"
                : "text-[var(--color-text-secondary)]",
              disabled && "opacity-50"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

/**
 * TextArea component optimized for mobile
 */
export interface TextAreaProps
  extends Omit<InputHTMLAttributes<HTMLTextAreaElement>, "size"> {
  /** Label text */
  label?: string;
  /** Helper text or error message */
  helperText?: string;
  /** Error state */
  error?: boolean;
  /** Full width textarea */
  fullWidth?: boolean;
  /** Number of rows */
  rows?: number;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      className,
      label,
      helperText,
      error = false,
      fullWidth = true,
      rows = 4,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `textarea-${Math.random().toString(36).substring(2, 9)}`;

    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "font-medium text-[var(--color-text-primary)]",
              disabled && "opacity-50"
            )}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          disabled={disabled}
          className={cn(
            // Base styles
            "w-full min-h-[120px] p-4 bg-[var(--color-navy-surface)] text-white",
            "placeholder-[var(--color-text-muted)] border rounded-[12px]",
            "transition-all duration-200 ease-in-out resize-y",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-rose)]/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            
            // Border styles
            error
              ? "border-[var(--color-error)] focus:border-[var(--color-error)]"
              : "border-[var(--color-border)] focus:border-[var(--color-rose)]",
            
            className
          )}
          aria-invalid={error}
          aria-describedby={helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {helperText && (
          <p
            id={`${inputId}-helper`}
            className={cn(
              "text-sm",
              error
                ? "text-[var(--color-error)]"
                : "text-[var(--color-text-secondary)]",
              disabled && "opacity-50"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";
