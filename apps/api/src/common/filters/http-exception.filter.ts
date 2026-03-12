import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
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
    } else {
      console.error('Unhandled exception:', exception);
      response.status(500).json({
        success: false,
        error: {
          statusCode: 500,
          message: 'Internal server error',
        },
      });
    }
  }
}
