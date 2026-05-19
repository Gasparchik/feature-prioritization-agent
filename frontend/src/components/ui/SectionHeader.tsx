import type { ReactNode } from 'react'

interface Props {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}

export default function SectionHeader({ eyebrow, title, subtitle, actions }: Props) {
  return (
    <div className="sticky top-0 z-10 flex items-start gap-4 px-6 pt-5 pb-[14px] border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
      <div className="flex-1 min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-[22px] font-semibold tracking-[-0.018em] leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}
