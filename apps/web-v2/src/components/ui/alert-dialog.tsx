import * as React from 'react'
import { cn } from '@/lib/utils'

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 w-full max-w-md">{children}</div>
    </div>
  )
}

export function AlertDialogContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-soft bg-surface p-6 shadow-raised animate-fade-in', className)}
      role="alertdialog"
      aria-modal="true"
      {...props}
    >
      {children}
    </div>
  )
}

export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-2', className)} {...props} />
}

export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-6 flex justify-end gap-3', className)} {...props} />
}

export function AlertDialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold text-content', className)} {...props} />
}

export function AlertDialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-content-secondary', className)} {...props} />
}

export function AlertDialogAction({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'rounded-soft bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover',
        className
      )}
      {...props}
    />
  )
}

export function AlertDialogCancel({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'rounded-soft border border-border px-4 py-2 text-sm font-medium text-content hover:bg-surface-sunken',
        className
      )}
      {...props}
    />
  )
}
