import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const DUMP_PATH = process.env.DUMP_PATH ?? "/tmp/course-dump.json";

const courses = JSON.parse(readFileSync(DUMP_PATH, "utf8"));
if (!Array.isArray(courses) || courses.length === 0) {
  console.error("Dump is empty — nothing to import");
  process.exit(1);
}

for (const c of courses) {
  const courseRow = await prisma.course.upsert({
    where: { slug: c.slug },
    create: {
      slug: c.slug,
      title: c.title,
      description: c.description,
      coverImage: c.coverImage ?? null,
      status: c.status,
      visibility: "public",
      order: c.order,
      publishedAt: c.publishedAt ? new Date(c.publishedAt) : null,
    },
    update: {
      title: c.title,
      description: c.description,
      coverImage: c.coverImage ?? null,
      status: c.status,
      visibility: "public",
      order: c.order,
      publishedAt: c.publishedAt ? new Date(c.publishedAt) : null,
    },
  });
  console.log(`course ${c.slug} → id ${courseRow.id}, visibility=public`);

  for (const l of c.lessons) {
    const lessonRow = await prisma.lesson.upsert({
      where: {
        courseId_slug: { courseId: courseRow.id, slug: l.slug },
      },
      create: {
        courseId: courseRow.id,
        slug: l.slug,
        order: l.order,
        title: l.title,
        excerpt: l.excerpt,
        content: l.content,
        type: l.type,
        videoUrl: l.videoUrl ?? null,
        videoDurationSeconds: l.videoDurationSeconds ?? null,
        status: l.status,
        publishedAt: l.publishedAt ? new Date(l.publishedAt) : null,
      },
      update: {
        order: l.order,
        title: l.title,
        excerpt: l.excerpt,
        content: l.content,
        type: l.type,
        videoUrl: l.videoUrl ?? null,
        videoDurationSeconds: l.videoDurationSeconds ?? null,
        status: l.status,
        publishedAt: l.publishedAt ? new Date(l.publishedAt) : null,
      },
    });
    console.log(`  lesson ${l.slug} → id ${lessonRow.id}`);
  }
}

await prisma.$disconnect();
console.log("import complete");
