import { classNames } from "../../utils/classNames";

export type SegmentedOption = {
  value: string;
  label: string;
};

export function SegmentedControl({
  value,
  onChange,
  options,
  size = "md",
  tone = "cyan",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SegmentedOption[];
  size?: "sm" | "md";
  tone?: "cyan" | "amber" | "emerald";
}) {
  const sizeClass = size === "sm" ? "segment-group-sm" : "segment-group-md";
  const activeClass =
    tone === "amber"
      ? "segment-button-active-amber"
      : tone === "emerald"
      ? "segment-button-active-emerald"
      : "segment-button-active-cyan";

  return (
    <div className={classNames("segment-group", sizeClass)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={classNames(
            "segment-button",
            value === option.value && activeClass
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
