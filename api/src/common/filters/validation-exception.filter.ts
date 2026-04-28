import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

interface AppErrorBody {
  message: string;
  errors: Record<string, string> | null;
}

function isAppErrorBody(body: unknown): body is AppErrorBody {
  return typeof body === 'object' && body !== null && 'errors' in body;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body: unknown = exception.getResponse();

    if (exception instanceof BadRequestException && isAppErrorBody(body)) {
      return response.status(status).json(body);
    }

    let message: string = exception.message;
    if (typeof body === 'string') {
      message = body;
    } else if (isAppErrorBody(body)) {
      message = body.message;
    }

    return response.status(status).json({
      statusCode: status,
      message,
      errors: null,
    });
  }
}
