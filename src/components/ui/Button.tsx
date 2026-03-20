interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses =
    "font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed btn-fluo";

  const variantClasses = {
    primary: "bg-fluo-cyan text-bg-primary hover:bg-fluo-magenta",
    secondary:
      "bg-bg-tertiary text-fluo-cyan border border-fluo-cyan/50 hover:bg-fluo-cyan hover:text-bg-primary",
    danger: "bg-fluo-red text-bg-primary hover:bg-fluo-magenta",
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}
