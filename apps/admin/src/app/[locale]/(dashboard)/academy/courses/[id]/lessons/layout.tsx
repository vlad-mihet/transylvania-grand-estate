import type { ReactNode } from "react";
import { CourseLessonsRail } from "@/modules/academy/components/course-lessons-rail";

/**
 * Lesson editor shell — adds a secondary rail listing every lesson in the
 * course. Wraps both the new-lesson form and the lesson edit page so the
 * rail (and its scroll position) persists across prev/next navigation.
 *
 * Mobile collapses to a single column; the rail is `lg:` only.
 */
export default function CourseLessonsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-8">
      <aside className="lg:pt-2">
        <CourseLessonsRail />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
