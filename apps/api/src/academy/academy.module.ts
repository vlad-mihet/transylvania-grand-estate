import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { UploadsModule } from '../uploads/uploads.module';

import { AcademyAuthService } from './auth/academy-auth.service';
import { AcademyAuthController } from './auth/academy-auth.controller';
import { JwtAcademyAccessStrategy } from './auth/strategies/jwt-academy-access.strategy';
import { JwtAcademyRefreshStrategy } from './auth/strategies/jwt-academy-refresh.strategy';
import { GoogleAcademyStrategy } from './auth/strategies/google-academy.strategy';
import { JwtAcademyAuthGuard } from './auth/guards/jwt-academy-auth.guard';
import { GoogleAcademyAuthGuard } from './auth/guards/google-academy-auth.guard';

import { AcademyInvitationsService } from './invitations/academy-invitations.service';
import { AcademyInvitationsController } from './invitations/academy-invitations.controller';

import { CoursesService } from './courses/courses.service';
import {
  AdminCoursesController,
  StudentCoursesController,
} from './courses/courses.controller';

import { LessonsService } from './lessons/lessons.service';
import {
  AdminLessonsController,
  StudentLessonsController,
} from './lessons/lessons.controller';

import { EnrollmentsService } from './enrollments/enrollments.service';
import { EnrollmentsController } from './enrollments/enrollments.controller';

import { AcademyUsersService } from './users/academy-users.service';
import { AcademyUsersController } from './users/academy-users.controller';

import { EnrolledGuard } from './guards/enrolled.guard';

/**
 * Academy feature module. Registers all academy-surface controllers plus
 * the admin-surface controllers that manage academy resources. The two
 * surfaces live in one module because they share services (Courses,
 * Lessons, AcademyUsers, Enrollments, AcademyInvitations) — splitting them
 * into two modules would force a circular services-export story.
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    PrismaModule,
    UploadsModule,
    forwardRef(() => EmailModule),
  ],
  controllers: [
    AcademyAuthController,
    AcademyInvitationsController,
    AdminCoursesController,
    StudentCoursesController,
    AdminLessonsController,
    StudentLessonsController,
    EnrollmentsController,
    AcademyUsersController,
  ],
  providers: [
    AcademyAuthService,
    JwtAcademyAccessStrategy,
    JwtAcademyRefreshStrategy,
    GoogleAcademyStrategy,
    JwtAcademyAuthGuard,
    GoogleAcademyAuthGuard,
    AcademyInvitationsService,
    CoursesService,
    LessonsService,
    EnrollmentsService,
    AcademyUsersService,
    EnrolledGuard,
  ],
  exports: [AcademyAuthService],
})
export class AcademyModule {}
