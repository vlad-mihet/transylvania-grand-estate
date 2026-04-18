import { Container } from "@/components/layout/container";
import { AccentButton } from "@tge/ui";
import { Link } from "@tge/i18n/navigation";
import { InquiryTrigger, type InquiryContext } from "@tge/ui";

interface CTABannerProps {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonHref?: string;
  inquiryContext?: InquiryContext;
}

export function CTABanner({
  title,
  subtitle,
  buttonText,
  buttonHref,
  inquiryContext,
}: CTABannerProps) {
  return (
    <section id="cta-section" className="relative overflow-hidden pt-24 md:pt-28 pb-16 md:pb-20 bg-[#101014] border-y border-copper/10 cta-diamond-glow">
      <Container>
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-cream mb-4">
            {title}
          </h2>
          <p className="text-cream-muted text-lg mb-8">{subtitle}</p>
          {inquiryContext ? (
            <InquiryTrigger context={inquiryContext}>
              <AccentButton size="lg">{buttonText}</AccentButton>
            </InquiryTrigger>
          ) : (
            <AccentButton size="lg" asChild>
              <Link href={buttonHref!}>{buttonText}</Link>
            </AccentButton>
          )}
        </div>
      </Container>
    </section>
  );
}
