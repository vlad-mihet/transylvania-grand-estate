import { BookOpen, Gauge, GraduationCap, Mail } from "lucide-react";
import type { NavGroup } from "@/components/layout/nav-types";

/**
 * Academy is a comprehensive product surface inside admin: overview metrics,
 * the course catalog, the student roster, and academy-scoped invitations. The
 * sidebar imports this group and renders it as its own section so the module
 * reads as a coherent whole instead of being scattered under Content + People.
 *
 * Students and Invitations currently live under /people/* URLs (with /academy/*
 * redirects) — once the route move lands they'll resolve canonically under
 * /academy/*. The sidebar grouping reinforces Academy ownership regardless.
 */
export const academyNavGroup: NavGroup = {
  labelKey: "academy",
  home: "/academy",
  items: [
    {
      href: "/academy",
      labelKey: "academyOverview",
      icon: Gauge,
      requires: "academy.user.manage",
    },
    {
      href: "/academy/courses",
      labelKey: "academyCourses",
      icon: BookOpen,
      requires: "academy.course.read",
    },
    {
      href: "/academy/students",
      labelKey: "academyStudents",
      icon: GraduationCap,
      requires: "academy.user.manage",
    },
    {
      href: "/academy/invitations",
      labelKey: "academyInvitations",
      icon: Mail,
      requires: "academy.user.manage",
    },
  ],
};
