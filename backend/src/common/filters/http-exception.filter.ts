import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

type ErrorResponse = string | { message?: string | string[]; error?: string };

interface RequestWithId extends Request {
  requestId?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<RequestWithId>();

    const { status, message } = this.toHttpError(exception);
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} failed`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      message,
      request_id: request.requestId,
    });
  }

  private toHttpError(exception: unknown): {
    status: number;
    message: string | string[];
  } {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        return {
          status: HttpStatus.CONFLICT,
          message: "A record with this value already exists",
        };
      }
      if (exception.code === "P2025") {
        return { status: HttpStatus.NOT_FOUND, message: "Resource not found" };
      }
    }

    if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse() as ErrorResponse;
      const message =
        typeof errorResponse === "string"
          ? errorResponse
          : errorResponse.message;
      return {
        status: exception.getStatus(),
        message: message || exception.message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    };
  }
}
