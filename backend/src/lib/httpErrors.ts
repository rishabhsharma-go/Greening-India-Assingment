export type FieldErrors = Record<string, string>;

// Thin wrapper for structured API errors.
//
// These are thrown/passed via next() and then mapped to JSON responses by errorHandler.
export class HttpError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(
      typeof body === "object" && body && "error" in (body as any)
        ? String((body as any).error)
        : "http error",
    );
    this.status = status;
    this.body = body;
  }
}

export const validationError = (fields: FieldErrors) =>
  new HttpError(400, { error: "validation failed", fields });

// Authentication/authorization helpers.
export const unauthorizedError = () =>
  new HttpError(401, { error: "unauthorized" });

export const forbiddenError = () => new HttpError(403, { error: "forbidden" });

export const notFoundError = () => new HttpError(404, { error: "not found" });
