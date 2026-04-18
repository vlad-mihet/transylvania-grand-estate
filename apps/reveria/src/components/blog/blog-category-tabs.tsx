"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Tabs, TabsList, TabsTrigger } from "@tge/ui";
import { CATEGORIES, type BlogCategory } from "./blog-category";

interface BlogCategoryTabsProps {
  value: BlogCategory;
}

export function BlogCategoryTabs({ value }: BlogCategoryTabsProps) {
  const t = useTranslations("BlogPage");
  const router = useRouter();

  const onChange = (next: string) => {
    router.push({
      pathname: "/blog",
      query: next === "all" ? {} : { category: next },
    });
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
