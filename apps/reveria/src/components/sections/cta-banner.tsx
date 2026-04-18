import { Container } from "@/components/layout/container";
import { Button } from "@tge/ui";
import { Link } from "@tge/i18n/navigation";

interface CTABannerProps {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonHref?: string;
}

export function CTABanner({
  title,
  subtitle,
  buttonText,
  buttonHref = "/contact",
}: CTABannerProps) {
  return (
    <section className="py-12 sm:py-14 md:py-20 bg-muted">
      <Container>
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">{title}</h2>
          <p className="text-muted-foreground mb-8">{subtitle}</p>
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            <Link href={buttonHref}>{buttonText}</Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
