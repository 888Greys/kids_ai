export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export type ApiErrorDetail = {
  field: string;
  reason: string;
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: ApiErrorDetail[];

  constructor(code: ApiErrorCode, status: number, message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function toErrorResponse(error: unknown): {
  status: number;
  body: { error: { code: ApiErrorCode; message: string; details: ApiErrorDetail[] } };
} {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        details: []
      }
    }
  };
}
