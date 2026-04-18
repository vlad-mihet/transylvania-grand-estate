import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';

/**
 * Routes validation to Zod or class-validator based on the DTO shape.
 *
 * During the incremental migration to Zod single-source-of-truth (schemas
 * live in `@tge/types/schemas/*`), some DTOs are already `createZodDto`
 * classes while others still carry class-validator decorators. A plain
 * global `ValidationPipe` with `whitelist: true` would strip every field on
 * a Zod DTO (since it has no `@IsX` decorators) — and a plain global
 * `ZodValidationPipe` would silently skip class-validator DTOs, losing
 * their validation. This pipe dispatches per request.
 *
 * Remove this and register `ZodValidationPipe` directly once every DTO is
 * migrated to Zod.
 */
@Injectable()
export class SmartValidationPipe implements PipeTransform {
  private readonly zod = new ZodValidationPipe();
  private readonly classValidator: ValidationPipe;

  constructor(options?: ValidationPipeOptions) {
    this.classValidator = new ValidationPipe(options);
  }

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    const metatype = metadata.metatype as
      | (abstract new (...args: unknown[]) => unknown) & { isZodDto?: boolean }
      | undefined;
    if (metatype?.isZodDto === true) {
      return this.zod.transform(value, metadata);
    }
    return this.classValidator.transform(value, metadata);
  }
}
