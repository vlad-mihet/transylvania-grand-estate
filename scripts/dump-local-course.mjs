import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

const courses = await prisma.course.findMany({
  include: {
    lessons: { orderBy: { order: "asc" } },
  },
  orderBy: { order: "asc" },
});

if (courses.length === 0) {
  console.error("No courses found locally");
  process.exit(1);
}

// Dump everything — the import script picks the one course to push.
const out = courses.map((c) => ({
  slug: c.slug,
  title: c.title,
  description: c.description,
  coverImage: c.coverImage,
  status: c.status,
  order: c.order,
  publishedAt: c.publishedAt,
  lessons: c.lessons.map((l) => ({
    slug: l.slug,
    order: l.order,
    title: l.title,
    excerpt: l.excerpt,
    content: l.content,
    type: l.type,
    videoUrl: l.videoUrl,
    videoDurationSeconds: l.videoDurationSeconds,
    status: l.status,
    publishedAt: l.publishedAt,
  })),
}));

writeFileSync("scripts/course-dump.json", JSON.stringify(out, null, 2));
console.log(
  `Dumped ${out.length} course(s) with ${out.reduce(
    (n, c) => n + c.lessons.length,
    0,
  )} total lessons to scripts/course-dump.json`,
);

await prisma.$disconnect();
