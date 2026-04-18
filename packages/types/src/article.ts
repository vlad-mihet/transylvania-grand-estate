import { LocalizedString } from "./property";

export interface Article {
  id: string;
  slug: string;
  title: LocalizedString;
  excerpt: LocalizedString;
  content: LocalizedString;
  coverImage: string;
  category: string;
  tags: string[];
  publishedAt: string;
  authorName: string;
  authorAvatar?: string;
  readTimeMinutes: number;
}
