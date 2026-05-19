interface Props { size?: number }

export default function BrandMark({ size = 22 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="2.5" className="fill-brand-500 dark:fill-brand-400" />
      <path d="M16 2v6 M16 24v6 M2 16h6 M24 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
