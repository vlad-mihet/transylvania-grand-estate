"use client";

import { Component, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { PluggableList } from "unified";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

/**
 * Authors author markdown, but our long-form content (articles, lessons)
 * routinely embeds HTML for layout — `<article class='article-grid'>`,
 * `<div class='article-toc'>`, custom callouts. Without `rehype-raw` those
 * wrappers are silently dropped during parsing and the preview goes blank.
 *
 * The schema extension here allows `className` and `id` on any element, plus
 * the structural tags our content actually uses. `rehype-sanitize` still
 * strips `<script>`, `on*` handlers, `javascript:` URLs, and any tag not on
 * the (already-permissive) default allowlist — so admin-authored HTML
 * renders, but a compromised editor account can't smuggle in XSS.
 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      "className",
      "id",
    ],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "article",
    "section",
    "aside",
    "header",
    "footer",
    "figure",
    "figcaption",
  ],
};

const remarkPlugins: PluggableList = [remarkGfm, remarkBreaks];
// Order matters: `rehype-raw` reparses raw HTML nodes into real elements
// FIRST, then `rehype-sanitize` strips anything dangerous from the result.
// `rehype-slug` adds anchor `id`s to headings (kept after sanitize since the
// sanitize allowlist preserves `id`).
const rehypePlugins: PluggableList = [
  rehypeRaw,
  [rehypeSanitize, sanitizeSchema],
  rehypeSlug,
];

const isExternalHref = (href: string | undefined) =>
  !!href && /^https?:\/\//.test(href);

const defaultComponents: Components = {
  a: ({ href, children, ...rest }) => {
    const external = isExternalHref(href);
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...rest}
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt, ...rest }) => (
    <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" {...rest} />
  ),
  code: ({ className, children, ...rest }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-[var(--muted,theme(colors.zinc.100))] px-1 py-0.5 text-[0.85em]"
        {...rest}
      >
        {children}
      </code>
    );
  },
};

class MarkdownErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export interface MarkdownViewProps {
  children: string;
  className?: string;
  proseSize?: "sm" | "base" | "lg";
  components?: Components;
}

export function MarkdownView({
  children,
  className,
  proseSize = "base",
  components,
}: MarkdownViewProps) {
  const proseClass =
    proseSize === "sm"
      ? "prose prose-sm"
      : proseSize === "lg"
        ? "prose prose-lg"
        : "prose";
  const merged = components
    ? { ...defaultComponents, ...components }
    : defaultComponents;
  const content = children ?? "";
  return (
    <MarkdownErrorBoundary
      fallback={
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
          {content}
        </pre>
      }
    >
      <article className={[proseClass, "max-w-none", className].filter(Boolean).join(" ")}>
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={merged}
        >
          {content}
        </ReactMarkdown>
      </article>
    </MarkdownErrorBoundary>
  );
}
