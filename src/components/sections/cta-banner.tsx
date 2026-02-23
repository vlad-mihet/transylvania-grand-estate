import { Container } from "@/components/layout/container";
import { AccentButton } from "@/components/shared/accent-button";
import { Link } from "@/i18n/navigation";

interface CTABannerProps {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonHref: string;
}

export function CTABanner({
  title,
  subtitle,
  buttonText,
  buttonHref,
}: CTABannerProps) {
  return (
    <section className="py-16 md:py-20 bg-[#101014] border-y border-copper/10">
      <Container>
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-cream mb-4">
            {title}
          </h2>
          <p className="text-cream-muted text-lg mb-8">{subtitle}</p>
          <AccentButton size="lg" asChild>
            <Link href={buttonHref}>{buttonText}</Link>
          </AccentButton>
        </div>
      </Container>
    </section>
  );
}
