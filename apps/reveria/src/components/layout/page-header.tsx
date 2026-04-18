import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbItems: BreadcrumbItem[];
}

export function PageHeader({ title, subtitle, breadcrumbItems }: PageHeaderProps) {
  return (
    <section className="pt-10 md:pt-14 pb-10 md:pb-14 bg-background">
      <Container>
        <Breadcrumb items={breadcrumbItems} />
        <div className="mt-4 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-base md:text-lg text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}
