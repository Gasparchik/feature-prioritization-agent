import type { ReactNode } from 'react'
import { Close } from './Icons'

interface Props {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  width?: number
  footer?: ReactNode
}

export default function Drawer({ open, onClose, title, children, width = 480, footer }: Props) {
  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/20 z-40 animate-fade-in"
        />
      )}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-lifted transition-transform duration-[220ms] ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ width, maxWidth: '90vw', transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex-1 font-semibold text-[14px]">{title}</div>
          <button className="btn-ghost btn-sm" onClick={onClose}>
            <Close size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 flex gap-2 items-center">
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
