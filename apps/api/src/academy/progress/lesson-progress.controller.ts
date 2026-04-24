import {
  Controller,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LessonProgressService } from './lesson-progress.service';
import { Realm } from '../../common/decorators/realm.decorator';
import { JwtAcademyAuthGuard } from '../auth/guards/jwt-academy-auth.guard';
import {
  CurrentAcademyUser,
  type AcademyUserPayload,
} from '../../common/decorators/academy-user.decorator';

/**
 * Student-facing progress writes. Read-side progress is merged into the
 * course + lesson responses by `CoursesService` and `LessonsService`;
 * this controller only exposes explicit completion.
 */
@ApiTags('Academy Progress (Student)')
@Controller('academy/courses/:courseSlug/lessons/:lessonSlug')
@Realm('academy')
@UseGuards(JwtAcademyAuthGuard)
export class LessonProgressController {
  constructor(private readonly progress: LessonProgressService) {}

  @Post('complete')
  @HttpCode(200)
  async markComplete(
    @CurrentAcademyUser() user: AcademyUserPayload,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    const result = await this.progress.markCompleted({
      userId: user.id,
      courseSlug,
      lessonSlug,
    });
    if (!result) throw new NotFoundException('Lesson not found');
    return {
      completed: true,
      completedAt: result.completedAt.toISOString(),
    };
  }
}
