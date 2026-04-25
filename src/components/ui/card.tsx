import { cn } from "@/lib/utils"

type CardProps = {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  style?: React.CSSProperties
}

export function Card({ children, className, onClick, style }: CardProps) {
  return (
    <div
      className={cn("rounded-xl border border-[var(--mw-card-border)] bg-white shadow-sm shadow-[0_1px_3px_rgba(0,61,110,0.04)]", className)}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-6 py-4 border-b border-[var(--mw-card-border)]", className)}>{children}</div>
}

export function CardContent({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={cn("px-6 py-4", className)} style={style}>{children}</div>
}
