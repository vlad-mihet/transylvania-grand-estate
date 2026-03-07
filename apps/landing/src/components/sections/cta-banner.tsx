import { Container } from "@/components/layout/container";
import { AccentButton } from "@tge/ui";
import { Link } from "@tge/i18n/navigation";
import { InquiryTrigger, type InquiryContext } from "@/components/inquiry";

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
    <section className="py-16 md:py-20 bg-[#101014] border-y border-copper/10">
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
