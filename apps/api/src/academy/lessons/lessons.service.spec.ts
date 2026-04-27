import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MetricsService } from '../../metrics/metrics.service';
import type { EnrollmentsService } from '../enrollments/enrollments.service';
import type { LessonProgressService } from '../progress/lesson-progress.service';

function makeEnrollments(): EnrollmentsService {
  return {
    autoEnrollIfPublic: jest.fn().mockResolvedValue(undefined),
  } as unknown as EnrollmentsService;
}

function makeProgress(): LessonProgressService {
  return {
    markSeen: jest.fn().mockResolvedValue(undefined),
    markCompleted: jest.fn().mockResolvedValue({ completedAt: new Date() }),
    getStatsForCourses: jest.fn().mockResolvedValue(new Map()),
    getProgressForCourse: jest.fn().mockResolvedValue(new Map()),
  } as unknown as LessonProgressService;
}

/**
 * Validation contract for `LessonsService.reorder`. The endpoint renumbers
 * every lesson in the course atomically, so a bad input (partial, dupes,
 * foreign ids) must fail closed before any Prisma write fires.
 */
describe('LessonsService.reorder', () => {
  const COURSE_ID = '00000000-0000-0000-0000-000000000001';
  const LESSON_A = '00000000-0000-0000-0000-0000000000a1';
  const LESSON_B = '00000000-0000-0000-0000-0000000000a2';
  const LESSON_C = '00000000-0000-0000-0000-0000000000a3';
  const FOREIGN_LESSON = '00000000-0000-0000-0000-0000000000ff';

  function makePrisma(existing: string[]): {
    prisma: PrismaService;
    tx: jest.Mock;
  } {
    const tx = jest.fn().mockResolvedValue([]);
    const prisma = {
      course: {
        findUnique: jest.fn().mockResolvedValue({ id: COURSE_ID }),
      },
      lesson: {
        findMany: jest.fn().mockResolvedValue(existing.map((id) => ({ id }))),
        update: jest.fn((args) => args),
      },
      $transaction: tx,
    } as unknown as PrismaService;
    return { prisma, tx };
  }

  function makeMetrics(): MetricsService {
    return {
      academyReorders: { inc: jest.fn() },
    } as unknown as MetricsService;
  }

  it('rejects when the course does not exist', async () => {
    const prisma = {
      course: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = new LessonsService(prisma, makeMetrics(), makeEnrollments(), makeProgress());
    await expect(
      service.reorder(COURSE_ID, [LESSON_A]),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects duplicate lesson ids before any DB write', async () => {
    const { prisma, tx } = makePrisma([LESSON_A, LESSON_B, LESSON_C]);
    const service = new LessonsService(prisma, makeMetrics(), makeEnrollments(), makeProgress());
    await expect(
      service.reorder(COURSE_ID, [LESSON_A, LESSON_A, LESSON_B]),
    ).rejects.toThrow(BadRequestException);
    expect(tx).not.toHaveBeenCalled();
  });

  it('rejects when the array length does not cover every lesson in the course', async () => {
    const { prisma, tx } = makePrisma([LESSON_A, LESSON_B, LESSON_C]);
    const service = new LessonsService(prisma, makeMetrics(), makeEnrollments(), makeProgress());
    await expect(
      service.reorder(COURSE_ID, [LESSON_A, LESSON_B]),
    ).rejects.toThrow(BadRequestException);
    expect(tx).not.toHaveBeenCalled();
  });

  it('rejects foreign lesson ids (belong to another course)', async () => {
    const { prisma, tx } = makePrisma([LESSON_A, LESSON_B, LESSON_C]);
    const service = new LessonsService(prisma, makeMetrics(), makeEnrollments(), makeProgress());
    await expect(
      service.reorder(COURSE_ID, [LESSON_A, LESSON_B, FOREIGN_LESSON]),
    ).rejects.toThrow(BadRequestException);
    expect(tx).not.toHaveBeenCalled();
  });

  it('returns prev/next siblings for admin in-editor navigation regardless of status', async () => {
    // The admin sibling chain must include drafts and archived lessons —
    // the editor is the surface used to publish them, so they have to be
    // reachable via prev/next. Order is by `order` ASC.
    const A = { id: LESSON_A, courseId: COURSE_ID, slug: 'a', order: 10, status: 'archived', title: { ro: 'Unu' } };
    const B = { id: LESSON_B, courseId: COURSE_ID, slug: 'b', order: 20, status: 'draft', title: { ro: 'Doi' } };
    const C = { id: LESSON_C, courseId: COURSE_ID, slug: 'c', order: 30, status: 'published', title: { ro: 'Trei' } };
    const prisma = {
      lesson: {
        findMany: jest.fn().mockResolvedValue([A, B, C]),
      },
    } as unknown as PrismaService;
    const service = new LessonsService(prisma, makeMetrics(), makeEnrollments(), makeProgress());

    const first = await service.findByIdForAdminWithSiblings(COURSE_ID, LESSON_A);
    expect(first.position).toBe(1);
    expect(first.total).toBe(3);
    expect(first.prev).toBeNull();
    expect(first.next).toEqual({ id: LESSON_B, slug: 'b', title: { ro: 'Doi' } });

    const middle = await service.findByIdForAdminWithSiblings(COURSE_ID, LESSON_B);
    expect(middle.position).toBe(2);
    expect(middle.prev).toEqual({ id: LESSON_A, slug: 'a', title: { ro: 'Unu' } });
    expect(middle.next).toEqual({ id: LESSON_C, slug: 'c', title: { ro: 'Trei' } });

    const last = await service.findByIdForAdminWithSiblings(COURSE_ID, LESSON_C);
    expect(last.position).toBe(3);
    expect(last.prev).toEqual({ id: LESSON_B, slug: 'b', title: { ro: 'Doi' } });
    expect(last.next).toBeNull();
  });

  it('paginates the student TOC and preserves position when filtered', async () => {
    // 5 published lessons. Page 2 of 2 (limit 2) → returns lessons 3-4
    // with position 3 + 4 (NOT 1 + 2). When filtered to lessons whose
    // slug includes "two", only lesson 2 returns — but its position
    // remains 2, not 1.
    const lessons = Array.from({ length: 5 }, (_, i) => ({
      id: `00000000-0000-0000-0000-000000000${(i + 1).toString().padStart(3, '0')}`,
      slug: ['one', 'two', 'three', 'four', 'five'][i],
      order: (i + 1) * 10,
      title: { ro: ['Unu', 'Doi', 'Trei', 'Patru', 'Cinci'][i] },
      excerpt: { ro: '' },
      content: { ro: 'continut' },
      type: 'text',
      videoDurationSeconds: null,
      publishedAt: new Date('2026-04-20'),
    }));
    const prisma = {
      course: {
        findUnique: jest.fn().mockResolvedValue({
          id: COURSE_ID,
          status: 'published',
          visibility: 'public',
        }),
      },
      lesson: {
        findMany: jest.fn().mockResolvedValue(lessons),
      },
      academyEnrollment: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const service = new LessonsService(
      prisma,
      makeMetrics(),
      makeEnrollments(),
      makeProgress(),
    );

    const page2 = await service.findAllForStudent({
      userId: 'user-1',
      courseSlug: 'demo',
      page: 2,
      limit: 2,
    });
    expect(page2).not.toBeNull();
    expect(page2!.data).toHaveLength(2);
    expect(page2!.data[0].position).toBe(3);
    expect(page2!.data[1].position).toBe(4);
    expect(page2!.meta.total).toBe(5);
    expect(page2!.meta.totalPages).toBe(3);
    expect(page2!.meta.coursePublishedTotal).toBe(5);

    const filtered = await service.findAllForStudent({
      userId: 'user-1',
      courseSlug: 'demo',
      page: 1,
      limit: 20,
      search: 'two',
    });
    expect(filtered!.data).toHaveLength(1);
    expect(filtered!.data[0].position).toBe(2);
    expect(filtered!.meta.total).toBe(1);
    expect(filtered!.meta.coursePublishedTotal).toBe(5);
  });

  it('returns null when the course is not published or accessible', async () => {
    // Draft course -> not visible to students.
    const prisma = {
      course: {
        findUnique: jest.fn().mockResolvedValue({
          id: COURSE_ID,
          status: 'draft',
          visibility: 'public',
        }),
      },
    } as unknown as PrismaService;
    const service = new LessonsService(
      prisma,
      makeMetrics(),
      makeEnrollments(),
      makeProgress(),
    );
    const result = await service.findAllForStudent({
      userId: 'user-1',
      courseSlug: 'demo',
      page: 1,
      limit: 20,
    });
    expect(result).toBeNull();
  });

  it('throws NotFoundException when the lesson does not belong to the course', async () => {
    const prisma = {
      lesson: {
        findMany: jest.fn().mockResolvedValue([
          { id: LESSON_A, courseId: COURSE_ID, slug: 'a', order: 10, title: {} },
        ]),
      },
    } as unknown as PrismaService;
    const service = new LessonsService(prisma, makeMetrics(), makeEnrollments(), makeProgress());
    await expect(
      service.findByIdForAdminWithSiblings(COURSE_ID, FOREIGN_LESSON),
    ).rejects.toThrow(NotFoundException);
  });

  it('writes sparse orders (10/20/30…) in a single transaction on the happy path', async () => {
    const { prisma, tx } = makePrisma([LESSON_A, LESSON_B, LESSON_C]);
    const metrics = makeMetrics();
    const service = new LessonsService(prisma, metrics, makeEnrollments(), makeProgress());
    const result = await service.reorder(COURSE_ID, [
      LESSON_C,
      LESSON_A,
      LESSON_B,
    ]);
    expect(result).toEqual({ ok: true, reordered: 3 });
    expect(tx).toHaveBeenCalledTimes(1);
    // Verify each lesson.update was called with the right order value.
    const updateCalls = (prisma.lesson.update as jest.Mock).mock.calls;
    expect(updateCalls).toEqual([
      [{ where: { id: LESSON_C }, data: { order: 10 } }],
      [{ where: { id: LESSON_A }, data: { order: 20 } }],
      [{ where: { id: LESSON_B }, data: { order: 30 } }],
    ]);
    expect(metrics.academyReorders.inc).toHaveBeenCalledTimes(1);
  });
});
