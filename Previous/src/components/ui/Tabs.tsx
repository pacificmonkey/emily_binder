import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import styles from './Tabs.module.css'

export interface TabItem<T extends string = string> {
  value: T
  label: string
}

export interface TabsProps<T extends string = string> extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  tabs: TabItem<T>[]
  value: T
  onChange: (value: T) => void
}

/**
 * Standardized tab navigation component
 */
export function Tabs<T extends string = string>({
  tabs,
  value,
  onChange,
  className,
  ...props
}: TabsProps<T>) {
  return (
    <div className={cn(styles.tabs, className)} {...props}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={cn(styles.tab, value === tab.value && styles.active)}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/**
 * Container for tab content
 */
export function TabPanel({ children, className, ...props }: TabPanelProps) {
  return (
    <div className={cn(styles.panel, className)} {...props}>
      {children}
    </div>
  )
}
