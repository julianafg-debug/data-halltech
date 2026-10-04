import type { ErrorRequestHandler, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
  correlationId: string,
  fieldErrors?: Array<{ field: string; code: string; message: string }>,
): void {
  response.status(status).json({
    type: status >= 500 ? "server_error" : "request_error",
    code,
    message,
    correlation_id: correlationId,
    ...(fieldErrors?.length ? { field_errors: fieldErrors } : {}),
  });
}

export function correlationId(request: Request): string {
  return request.header("x-request-id")?.slice(0, 100) ?? "unavailable";
}

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const requestId = correlationId(request);

  if (error instanceof ZodError) {
    sendError(
      response,
      400,
      "invalid_request",
      "Revise os campos informados.",
      requestId,
      error.issues.map((issue) => ({
        field: issue.path.join("."),
        code: issue.code,
        message: issue.message,
      })),
    );
    return;
  }

  if (error instanceof HttpError) {
    sendError(response, error.status, error.code, error.message, requestId);
    return;
  }

  console.error("Unhandled request error", {
    requestId,
    error: error instanceof Error ? error.message : "Unknown error",
  });
  sendError(response, 500, "internal_error", "Ocorreu um erro inesperado.", requestId);
};
