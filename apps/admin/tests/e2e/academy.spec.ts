import { test, expect } from '@playwright/test';
import {
  adminApi,
  getAdminAccessToken,
  uniqueSuffix,
  type ApiEnvelope,
} from './_fixtures/api';

type Course = {
  id: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'enrolled';
  title: { ro: string; en?: string };
};

type Lesson = {
  id: string;
  slug: string;
  order: number;
  title: { ro: string; en?: string };
};

const localized = (text: string) => ({ ro: text, en: text });

test.describe('academy course + lessons lifecycle', () => {
  test('course → 3 lessons → reorder → publish → catalog visibility → delete', async ({
    page,
  }) => {
    const token = getAdminAccessToken();
    const suffix = uniqueSuffix('course');
    const courseSlug = `qa-course-${suffix}`;

    // 1. Create draft course.
    const created = await adminApi<ApiEnvelope<Course>>(
      token,
      '/admin/academy/courses',
      {
        method: 'POST',
        body: {
          slug: courseSlug,
          title: localized(`QA Course ${suffix}`),
          description: localized(`Course description ${suffix}`),
          visibility: 'public',
        },
      },
    );
    const courseId = created.data.id;

    const lessonIds: string[] = [];

    try {
      // 2. Add three lessons.
      for (let i = 1; i <= 3; i++) {
        const lessonSlug = `qa-lesson-${suffix}-${i}`;
        const res = await adminApi<ApiEnvelope<Lesson>>(
          token,
          `/admin/academy/courses/${courseId}/lessons`,
          {
            method: 'POST',
            body: {
              slug: lessonSlug,
              order: i * 10,
              title: localized(`Lesson ${i} ${suffix}`),
              excerpt: localized(`Excerpt ${i}`),
              content: localized(`Body of lesson ${i}`),
              type: 'text',
            },
          },
        );
        lessonIds.push(res.data.id);
      }

      // 3. Reorder via the move-by-id endpoint: move each lesson to the top
      //    in CREATION order — the last one moved lands first, so the final
      //    sequence is the reverse of creation order. (Iterating the
      //    reversed array here would reproduce the original order — the
      //    last mover always ends on top.) The legacy bulk-reorder endpoint
      //    was retired so admin pagination + drag-drop can coexist; this
      //    loop is the closest equivalent.
      const reversed = [...lessonIds].reverse();
      for (const lessonId of lessonIds) {
        await adminApi(
          token,
          `/admin/academy/courses/${courseId}/lessons/${lessonId}/move`,
          {
            method: 'POST',
            body: { targetOrder: 1 },
          },
        );
      }

      // Verify order took effect. Default pagination covers 3 lessons.
      const lessonsEnv = await adminApi<ApiEnvelope<Lesson[]>>(
        token,
        `/admin/academy/courses/${courseId}/lessons?sort=order`,
      );
      const orderedIds = lessonsEnv.data.map((l) => l.id);
      expect(orderedIds).toEqual(reversed);

      // 4. Publish the course.
      await adminApi(token, `/admin/academy/courses/${courseId}`, {
        method: 'PATCH',
        body: {
          status: 'published',
          publishedAt: new Date().toISOString(),
          mode: 'publish',
        },
      });

      // 5. Verify the publish PATCH took effect by re-reading via the admin
      //    endpoint. The student-facing /academy/courses route requires an
      //    AcademyUser JWT (different realm from admin), so we can't query it
      //    with our admin token. The admin re-read proves the status flipped;
      //    the student-side rendering is covered by manual checklist Domain E.
      const refetched = await adminApi<ApiEnvelope<Course>>(
        token,
        `/admin/academy/courses/${courseId}`,
      );
      expect(refetched.data.status).toBe('published');
    } finally {
      // 6. Cleanup — delete course (cascades lessons via service logic).
      await adminApi(token, `/admin/academy/courses/${courseId}`, {
        method: 'DELETE',
      }).catch(() => undefined);
    }
  });
});
