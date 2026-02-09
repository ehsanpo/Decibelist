import { MetricRow as MetricRowType } from '../../types'

export function MetricRow({ name, original, mastered }: MetricRowType) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-white/5 py-3 text-sm">
      <div className="text-slate-200">{name}</div>
      <div className="text-slate-400">{original}</div>
      <div className="text-emerald-200">{mastered}</div>
    </div>
  )
}
