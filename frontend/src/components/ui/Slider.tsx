interface Props {
  label: string
  value: number
  min: number
  max: number
  step: number
  reasoning?: string
  suffix?: string
  showValue?: boolean
  onChange: (v: number) => void
}

export default function Slider({ label, value, min, max, step, reasoning, suffix = '', showValue = true, onChange }: Props) {
  return (
    <div>
      {(label || showValue) && (
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-neutral-600 dark:text-neutral-400 font-medium">{label}</span>
          {showValue && (
            <span className="font-bold text-brand-900 dark:text-white font-mono">
              {value.toLocaleString()}{suffix}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
      />
      {reasoning && <p className="text-xs text-neutral-400 mt-1 italic leading-snug">{reasoning}</p>}
    </div>
  )
}
