import { riceTier } from '../../lib/rice'

interface Props {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

const sizeClass = {
  sm: 'text-[11px] px-[6px] py-px',
  md: 'text-[12px] px-2 py-0.5',
  lg: 'text-[14px] px-[10px] py-[3px]',
}

export default function ScorePill({ score, size = 'md' }: Props) {
  const tier = riceTier(score)
  const color =
    tier === 'high' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
    tier === 'med'  ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'         :
                     'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'

  return (
    <span className={`inline-flex items-center rounded-full font-mono font-bold tracking-[-0.01em] ${sizeClass[size]} ${color}`}>
      {score.toLocaleString()}
    </span>
  )
}
