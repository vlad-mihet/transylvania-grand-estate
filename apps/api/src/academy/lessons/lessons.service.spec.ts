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

function makeMetrics(): MetricsService {
  return {
    academyReorders: { inc: jest.fn() },
  } as unknown as MetricsService;
}

const COURSE_ID = '00000000-0000-0000-0000-000000000001';
const LESSON_A = '00000000-0000-0000-0000-0000000000a1';
const LESSON_B = '00000000-0000-0000-0000-0000000000a2';
const LESSON_C = '00000000-0000-0000-0000-0000000000a3';
const LESSON_D = '00000000-0000-0000-0000-0000000000a4';
const LESSON_E = '00000000-0000-0000-0000-0000000000a5';
const FOREIGN_LESSON = '00000000-0000-0000-0000-0000000000ff';

/**
 * `move` is the lone source of truth for changing lesson order — the
 * legacy bulk-reorder endpoint was retired so admin pagination + DnD
 * could coexist. The contract is forgiving by design (out-of-range
 * `targetOrder` is clamped rather than rejected) so an admin scrolling
 * past the end can't trip a 400; the validation we DO enforce is the
 * lesson-belongs-to-course check.
 */
describe('LessonsService.move', () => {
  function makePrisma(existing: { id: string; order: number }[]): {
    prisma: PrismaService;
    tx: jest.Mock;
    update: jest.Mock;
  } {
    const tx = jest.fn().mockResolvedValue([]);
    const update = jest.fn((args) => args);
    const prisma = {
      course: {
        findUnique: jest.fn().mockResolvedValue({ id: COURSE_ID }),
      },
      lesson: {
        findMany: jest.fn().mockResolvedValue(existing),
        update,
      },
      $transaction: tx,
    } as unknown as PrismaService;
    return { prisma, tx, update };
  }

  it('rejects when the course does not exist', async () => {
    const prisma = {
      course: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = new LessonsService(
      prisma,
      makeMetrics(),
      makeEnrollments(),
      makeProgress(),
    );
    await expect(
      service.move(COURSE_ID, LESSON_A, 1),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a lesson id that does not belong to the course', async () => {
    const { prisma, tx } = makePrisma([
      { id: LESSON_A, order: 10 },
      { id: LESSON_B, order: 20 },
    ]);
    const service = new LessonsService(
      prisma,
      makeMetrics(),
      makeEnrollments(),
      makeProgress(),
    );
    await expect(
      service.move(COURSE_ID, FOREIGN_LESSON, 1),
    ).rejects.toThrow(BadRequestException);
    expect(tx).not.toHaveBeenCalled();
  });

  it('is a no-op when moved to its current position (no write, no metric)', async () => {
    const { prisma, tx, update } = makePrisma([
      { id: LESSON_A, order: 10 },
      { id: LESSON_B, order: 20 },
      { id: LESSON_C, order: 30 },
    ]);
    const metrics = makeMetrics();
    const service = new LessonsService(
      prisma,
      metrics,
      makeEnrollments(),
      makeProgress(),
    );
    const result = await service.move(COURSE_ID, LESSON_B, 2);
    expect(result).toEqual({ ok: true, moved: 0 });
    expect(tx).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(metrics.academyReorders.inc).not.toHaveBeenCalled();
  });

  it('moves lesson #3 to position 1 and renumbers densely', async () => {
    const { prisma, tx, update } = makePrisma([
      { id: LESSON_A, order: 10 },
      { id: LESSON_B, order: 20 },
      { id: LESSON_C, order: 30 },
      { id: LESSON_D, order: 40 },
      { id: LESSON_E, order: 50 },
    ]);
    const metrics = makeMetrics();
    const service = new LessonsService(
      prisma,
      metrics,
      makeEnrollments(),
      makeProgress(),
    );
    const result = await service.move(COURSE_ID, LESSON_C, 1);
    expect(result).toEqual({
      ok: true,
      moved: 1,
      fromOrder: 30,
      toOrder: 10,
    });
    expect(tx).toHaveBeenCalledTimes(1);
    expect(update.mock.calls).toEqual([
      [{ where: { id: LESSON_C }, data: { order: 10 } }],
      [{ where: { id: LESSON_A }, data: { order: 20 } }],
      [{ where: { id: LESSON_B }, data: { order: 30 } }],
      [{ where: { id: LESSON_D }, data: { order: 40 } }],
      [{ where: { id: LESSON_E }, data: { order: 50 } }],
    ]);
    expect(metrics.academyReorders.inc).toHaveBeenCalledTimes(1);
  });

  it('clamps targetOrder=0 to position 1', async () => {
    const { prisma, update } = makePrisma([
      { id: LESSON_A, order: 10 },
      { id: LESSON_B, order: 20 },
      { id: LESSON_C, order: 30 },
    ]);
    const service = new LessonsService(
      prisma,
      makeMetrics(),
      makeEnrollments(),
      makeProgress(),
    );
    const result = await service.move(COURSE_ID, LESSON_B, 0);
    expect(result.moved).toBe(1);
    // First update is the moved lesson at order 10.
    expect(update.mock.calls[0]).toEqual([
      { where: { id: LESSON_B }, data: { order: 10 } },
    ]);
  });

  it('clamps targetOrder beyond the end to the last position', async () => {
    const { prisma, update } = makePrisma([
      { id: LESSON_A, order: 10 },
      { id: LESSON_B, order: 20 },
      { id: LESSON_C, order: 30 },
    ]);
    const service = new LessonsService(
      prisma,
      makeMetrics(),
      makeEnrollments(),
      makeProgress(),
    );
    const result = await service.move(COURSE_ID, LESSON_A, 999);
    expect(result.moved).toBe(1);
    expect(result.toOrder).toBe(30);
    // A ended up last.
    expect(update.mock.calls).toEqual([
      [{ where: { id: LESSON_B }, data: { order: 10 } }],
      [{ where: { id: LESSON_C }, data: { order: 20 } }],
      [{ where: { id: LESSON_A }, data: { order: 30 } }],
    ]);
  });
});

/**
 * Non-mutation reads stay covered. The sibling chain feeds the lesson
 * editor's prev/next controls; the student paginator drives the academy
 * TOC. Both are unaffected by the move refactor but are the surfaces an
 * admin will exercise side-by-side with the new pagination.
 */
describe('LessonsService reads', () => {
  it('returns prev/next siblings for admin in-editor navigation regardless of status', async () => {
    const A = {
      id: LESSON_A,
      courseId: COURSE_ID,
      slug: 'a',
      order: 10,
      status: 'archived',
      title: { ro: 'Unu' },
    };
    const B = {
      id: LESSON_B,
      courseId: COURSE_ID,
      slug: 'b',
      order: 20,
      status: 'draft',
      title: { ro: 'Doi' },
    };
    const C = {
      id: LESSON_C,
      courseId: COURSE_ID,
      slug: 'c',
      order: 30,
      status: 'published',
      title: { ro: 'Trei' },
    };
    const prisma = {
      lesson: {
        findMany: jest.fn().mockResolvedValue([A, B, C]),
      },
    } as unknown as PrismaService;
    const service = new LessonsService(
      prisma,
      makeMetrics(),
      makeEnrollments(),
      makeProgress(),
    );

    const first = await service.findByIdForAdminWithSiblings(COURSE_ID, LESSON_A);
    expect(first.position).toBe(1);
    expect(first.total).toBe(3);
    expect(first.prev).toBeNull();
    expect(first.next).toEqual({
      id: LESSON_B,
      slug: 'b',
      title: { ro: 'Doi' },
    });

    const middle = await service.findByIdForAdminWithSiblings(COURSE_ID, LESSON_B);
    expect(middle.position).toBe(2);
    expect(middle.prev).toEqual({
      id: LESSON_A,
      slug: 'a',
      title: { ro: 'Unu' },
    });
    expect(middle.next).toEqual({
      id: LESSON_C,
      slug: 'c',
      title: { ro: 'Trei' },
    });

    const last = await service.findByIdForAdminWithSiblings(COURSE_ID, LESSON_C);
    expect(last.position).toBe(3);
    expect(last.prev).toEqual({
      id: LESSON_B,
      slug: 'b',
      title: { ro: 'Doi' },
    });
    expect(last.next).toBeNull();
  });

  it('paginates the student TOC and preserves position when filtered', async () => {
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
    const service = new LessonsService(
      prisma,
      makeMetrics(),
      makeEnrollments(),
      makeProgress(),
    );
    await expect(
      service.findByIdForAdminWithSiblings(COURSE_ID, FOREIGN_LESSON),
    ).rejects.toThrow(NotFoundException);
  });
});
