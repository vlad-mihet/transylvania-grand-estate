import { cn } from "@tge/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  alignment?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  alignment = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-12 md:mb-16",
        alignment === "center" && "text-center",
        className
      )}
    >
      {subtitle && (
        <p className="text-copper uppercase tracking-[0.2em] text-sm font-medium mb-3">
          {subtitle}
        </p>
      )}
      <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-cream">
        {title}
      </h2>
      <div className="mt-4 mx-auto h-px w-16 bg-gradient-to-r from-transparent via-copper to-transparent" />
    </div>
  );
}
