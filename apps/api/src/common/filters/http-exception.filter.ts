import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const error =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse, statusCode: status }
        : (exceptionResponse as Record<string, unknown>);

    response.status(status).json({
      success: false,
      error: {
        statusCode: status,
        message: error.message || 'Internal server error',
        ...(error.error ? { error: error.error } : {}),
      },
    });
  }
}
