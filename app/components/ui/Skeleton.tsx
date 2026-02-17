import { cn } from "@/lib/utils";

interface SkeletonProps {
  /** Additional CSS classes */
  className?: string;
  /** Width of the skeleton (default: 100%) */
  width?: string | number;
  /** Height of the skeleton (default: 1rem) */
  height?: string | number;
  /** Border radius (default: 0.5rem) */
  radius?: "sm" | "md" | "lg" | "xl" | "full";
  /** Whether to animate the skeleton */
  animate?: boolean;
}

/**
 * Skeleton loading component
 * 
 * Used as a placeholder while content is loading.
 * Provides visual feedback that data is being fetched.
 * 
 * @example
 * <Skeleton width={200} height={24} radius="md" />
 * <Skeleton className="w-full h-32" radius="lg" />
 */
export function Skeleton({
  className,
  width = "100%",
  height = "1rem",
  radius = "md",
  animate = true,
}: SkeletonProps) {
  const radiusClasses = {
    sm: "rounded-[8px]",
    md: "rounded-[12px]",
    lg: "rounded-[16px]",
    xl: "rounded-[20px]",
    full: "rounded-full",
  };

  const style: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };

  return (
    <div
      className={cn(
        "bg-[var(--color-navy-elevated)]",
        radiusClasses[radius],
        animate && "animate-pulse-skeleton",
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton text with multiple lines
 */
interface SkeletonTextProps {
  /** Number of lines to show */
  lines?: number;
  /** Additional CSS classes */
  className?: string;
  /** Line height multiplier */
  lineHeight?: number;
  /** Last line width (as percentage) */
  lastLineWidth?: string;
}

export function SkeletonText({
  lines = 3,
  className,
  lineHeight = 1.5,
  lastLineWidth = "60%",
}: SkeletonTextProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={`${lineHeight}rem`}
          radius="sm"
          width={index === lines - 1 ? lastLineWidth : "100%"}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton avatar (circular placeholder for profile images)
 */
interface SkeletonAvatarProps {
  /** Size of the avatar (default: 48) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

export function SkeletonAvatar({ size = 48, className }: SkeletonAvatarProps) {
  return (
    <Skeleton
      width={size}
      height={size}
      radius="full"
      className={className}
    />
  );
}

/**
 * Skeleton card for content cards
 */
interface SkeletonCardProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to show image placeholder */
  hasImage?: boolean;
  /** Number of text lines */
  textLines?: number;
}

export function SkeletonCard({
  className,
  hasImage = true,
  textLines = 2,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--color-navy-surface)] rounded-[16px] p-4 space-y-3",
        className
      )}
    >
      {hasImage && <Skeleton height={160} radius="lg" />}
      <SkeletonText lines={textLines} />
    </div>
  );
}
