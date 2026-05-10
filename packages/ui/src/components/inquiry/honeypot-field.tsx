"use client";

interface HoneypotFieldProps {
  /** Form-data key. Defaults to "website" — a plausible-looking field name. */
  name?: string;
  /** Optional id, when the form needs a stable handle for testing. */
  id?: string;
}

/**
 * Hidden text input that anti-bot tooling looks for. Humans never see it,
 * bots that auto-fill every input will. The API silently drops any inquiry
 * arriving with a non-empty value here (see InquiriesService.create —
 * honeypot.triggered log path).
 *
 * Style is inline, not tailwind, so a future utility-class purge can't make
 * the field visible. tabIndex=-1 keeps it off the keyboard tab order;
 * autoComplete=off discourages reasonable password managers from filling it.
 */
export function HoneypotField({ name = "website", id }: HoneypotFieldProps) {
  return (
    <input
      type="text"
      name={name}
      id={id}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}
