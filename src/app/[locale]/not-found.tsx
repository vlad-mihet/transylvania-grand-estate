import { Link } from "@/i18n/navigation";
import { AccentButton } from "@/components/shared/accent-button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="font-serif text-8xl text-copper mb-4">404</h1>
        <h2 className="font-serif text-2xl text-cream mb-4">
          Page Not Found
        </h2>
        <p className="text-cream-muted mb-8 max-w-md">
          The property you&apos;re looking for may have been moved or no longer
          exists. Let us help you find your dream home.
        </p>
        <div className="flex gap-4 justify-center">
          <AccentButton asChild>
            <Link href="/">Go Home</Link>
          </AccentButton>
          <AccentButton accentVariant="outline" asChild>
            <Link href="/properties">Browse Properties</Link>
          </AccentButton>
        </div>
      </div>
    </div>
  );
}
