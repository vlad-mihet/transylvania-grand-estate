import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ZodValidationException } from 'nestjs-zod';
import type { ZodError, ZodIssue } from 'zod';
import type { Request, Response } from 'express';

interface FieldIssue {
  path: string;
  message: string;
  code: string;
}

interface ErrorBody {
  statusCode: number;
  message: string;
  error?: string;
  field?: string;
  fields?: FieldIssue[];
  requestId?: string;
}

function prismaToHttp(
  exception: Prisma.PrismaClientKnownRequestError,
): { status: number; body: Omit<ErrorBody, 'requestId'> } {
  switch (exception.code) {
    // Unique constraint violation — 409 Conflict. Surface the violating
    // field(s) from meta.target so clients can map them to form fields.
    case 'P2002': {
      const target = exception.meta?.target;
      const field = Array.isArray(target)
        ? (target as string[]).join(', ')
        : typeof target === 'string'
          ? target
          : undefined;
      return {
        status: HttpStatus.CONFLICT,
        body: {
          statusCode: HttpStatus.CONFLICT,
          message: field
            ? `A record with this ${field} already exists`
            : 'A record with these values already exists',
          error: 'UniqueConstraintViolation',
          ...(field ? { field } : {}),
        },
      };
    }
    // Record not found on update/delete → 404.
    case 'P2025':
      return {
        status: HttpStatus.NOT_FOUND,
        body: {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'RecordNotFound',
        },
      };
    // Foreign-key constraint failed → 400.
    case 'P2003':
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Related record is missing or invalid',
          error: 'ForeignKeyViolation',
        },
      };
    // Value too long for a column → 400.
    case 'P2000':
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'A provided value is too long for one of the fields',
          error: 'ValueTooLong',
        },
      };
    // Null constraint / missing required value → 400.
    case 'P2011':
    case 'P2012':
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'A required field is missing',
          error: 'MissingRequiredField',
        },
      };
    // Nested relation rule violated (e.g., required relation not connected).
    case 'P2014':
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'The operation would violate a required relationship',
          error: 'RelationConstraintViolation',
        },
      };
    // Connection pool timeout → 503 so clients can retry with backoff.
    case 'P2024':
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'The service is temporarily busy. Please try again shortly.',
          error: 'DatabaseBusy',
        },
      };
    default:
      // Don't leak raw Prisma codes to clients — the operator still sees the
      // code in the server log via the Logger.error call in catch().
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            'The operation failed due to a database constraint. Please try again or contact support if the problem persists.',
          error: 'DatabaseError',
        },
      };
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.id;

    let status: number;
    let body: Omit<ErrorBody, 'requestId'>;

    if (exception instanceof ZodValidationException) {
      status = HttpStatus.BAD_REQUEST;
      const zodError = exception.getZodError() as ZodError;
      body = {
        statusCode: status,
        message: 'Validation failed',
        error: 'ValidationError',
        fields: zodError.issues.map((issue: ZodIssue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
          code: issue.code,
        })),
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const raw = exception.getResponse();
      if (typeof raw === 'string') {
        body = { statusCode: status, message: raw };
      } else {
        const obj = raw as Record<string, unknown>;
        body = {
          statusCode: status,
          message:
            (obj.message as string | undefined) ?? 'Internal server error',
          ...(obj.error ? { error: obj.error as string } : {}),
        };
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = prismaToHttp(exception);
      status = mapped.status;
      body = mapped.body;
      // Unmapped codes hit the 500 branch with a generic client message. Log
      // the code + meta so operators can still trace the root cause.
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(
          `Unmapped Prisma error ${exception.code} on ${request.method} ${request.url}${requestId ? ` [reqId=${requestId}]` : ''} meta=${JSON.stringify(exception.meta ?? {})}`,
        );
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      body = {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Database validation failed',
        error: 'PrismaValidationError',
      };
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      body = {
        statusCode: status,
        message: 'Internal server error',
      };
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}${requestId ? ` [reqId=${requestId}]` : ''}`,
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(status).json({
      success: false,
      error: { ...body, ...(requestId ? { requestId } : {}) },
    });
  }
}
