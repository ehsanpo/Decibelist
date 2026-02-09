import { SegmentedControl } from './SegmentedControl'

export function RackTabs({
  active,
  onChange,
  tabs,
}: {
  active: string
  onChange: (value: string) => void
  tabs: Array<{ id: string; label: string }>
}) {
  return (
    <SegmentedControl
      value={active}
      onChange={onChange}
      options={tabs.map((tab) => ({ value: tab.id, label: tab.label }))}
      size="md"
      tone="emerald"
    />
  )
}
