"use client";

interface AmenityCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
}

/**
 * Rounded-square checkbox used by the "more filters" amenity list and the
 * stand-alone "has images" toggle. Extracted so the same markup / behavior
 * can't drift between uses.
 */
export function AmenityCheckbox({
  checked,
  onToggle,
  label,
}: AmenityCheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={onToggle}
        className={`h-4.5 w-4.5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
          checked ? "border-primary bg-primary" : "border-border"
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1.5 5l2.5 2.5 4.5-4.5"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}
