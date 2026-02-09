import { classNames } from '../../utils/classNames'

export function ToggleSwitch({
  active,
  onToggle,
  label,
}: {
  active: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button className="flex items-center gap-4" onClick={onToggle} type="button">
      <div className={classNames('toggle w-20', active && 'toggle-active')}>
        <div className="toggle-dot" />
      </div>
      <span className="text-sm uppercase tracking-[0.2em] text-slate-200">{label}</span>
    </button>
  )
}
