import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MetricsService } from '../../metrics/metrics.service';
import type { EnrollmentsService } from '../enrollments/enrollments.service';

function makeEnrollments(): EnrollmentsService {
  return {
    autoEnrollIfPublic: jest.fn().mockResolvedValue(undefined),
  } as unknown as EnrollmentsService;
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
    const service = new LessonsService(prisma, makeMetrics(), makeEnrollments());
    await expect(
      service.reorder(COURSE_ID, [LESSON_A]),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects duplicate lesson ids before any DB write', async () => {
    const { prisma, tx } = makePrisma([LESSON_A, LESSON_B, LESSON_C]);
    const service = new LessonsService(prisma, makeMetrics(), makeEnrollments());
    await expect(
      service.reorder(COURSE_ID, [LESSON_A, LESSON_A, LESSON_B]),
    ).rejects.toThrow(BadRequestException);
    expect(tx).not.toHaveBeenCalled();
  });

  it('rejects when the array length does not cover every lesson in the course', async () => {
    const { prisma, tx } = makePrisma([LESSON_A, LESSON_B, LESSON_C]);
    const service = new LessonsService(prisma, makeMetrics(), makeEnrollments());
    await expect(
      service.reorder(COURSE_ID, [LESSON_A, LESSON_B]),
    ).rejects.toThrow(BadRequestException);
    expect(tx).not.toHaveBeenCalled();
  });

  it('rejects foreign lesson ids (belong to another course)', async () => {
    const { prisma, tx } = makePrisma([LESSON_A, LESSON_B, LESSON_C]);
    const service = new LessonsService(prisma, makeMetrics(), makeEnrollments());
    await expect(
      service.reorder(COURSE_ID, [LESSON_A, LESSON_B, FOREIGN_LESSON]),
    ).rejects.toThrow(BadRequestException);
    expect(tx).not.toHaveBeenCalled();
  });

  it('writes sparse orders (10/20/30…) in a single transaction on the happy path', async () => {
    const { prisma, tx } = makePrisma([LESSON_A, LESSON_B, LESSON_C]);
    const metrics = makeMetrics();
    const service = new LessonsService(prisma, metrics, makeEnrollments());
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
