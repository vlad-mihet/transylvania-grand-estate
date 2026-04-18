"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@tge/i18n/navigation";
import { Tabs, TabsList, TabsTrigger } from "@tge/ui";
import { CATEGORIES, type BlogCategory } from "./blog-category";

interface BlogCategoryTabsProps {
  value: BlogCategory;
}

export function BlogCategoryTabs({ value }: BlogCategoryTabsProps) {
  const t = useTranslations("BlogPage");
  const router = useRouter();
  const pathname = usePathname();

  const onChange = (next: string) => {
    const params = new URLSearchParams();
    if (next !== "all") params.set("category", next);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <Tabs value={value} onValueChange={onChange} className="mb-8">
      <TabsList>
        {CATEGORIES.map((cat) => (
          <TabsTrigger key={cat} value={cat}>
            {t(`categories.${cat}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
