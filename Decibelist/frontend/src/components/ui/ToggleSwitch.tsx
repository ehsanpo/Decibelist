import { classNames } from "../../utils/classNames";

export function ToggleSwitch({
  active,
  onToggle,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        className={classNames(
          "group relative flex flex-col items-center",
          active && "rocker-active"
        )}
        onClick={onToggle}
        type="button"
      >
        <div className="rocker-housing">
          <div className="rocker-switch" />
        </div>
        <div className="rocker-indicator-lamp" />
        <div className="rocker-status">{active ? "ON" : "OFF"}</div>
        <span className="rocker-label">{label}</span>
      </button>
    </div>
  );
}
