"use client";

import { Component, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  children: string;
}

interface State {
  hasError: boolean;
}

/**
 * Wraps `ReactMarkdown` + `remark-gfm` in an error boundary so a malformed
 * markdown fragment (e.g. tab-separated text that the GFM table parser
 * mis-parses) doesn't crash the entire lesson page. When the renderer
 * throws, we fall back to a plain `<pre>` block with the raw text.
 */
class MarkdownErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  State
> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function LessonMarkdown({ children }: Props) {
  const content = children || "";
  return (
    <MarkdownErrorBoundary
      fallback={
        <pre className="whitespace-pre-wrap break-words font-sans text-base leading-relaxed">
          {content}
        </pre>
      }
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </MarkdownErrorBoundary>
  );
}
