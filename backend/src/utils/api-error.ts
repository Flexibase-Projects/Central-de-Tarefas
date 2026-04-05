import type { Response } from 'express';

/** Códigos estáveis para o cliente tratar sem depender do texto de `error`. */
export type ApiErrorCode =
  | 'AUTH_MISSING'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_CONTEXT_INCOMPLETE'
  | 'ACCESS_PENDING'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'SUPABASE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMIT_EXCEEDED';

export type ApiErrorBody = {
  error: string;
  code?: ApiErrorCode;
  requestId?: string;
  details?: unknown;
};

export function jsonError(
  res: Response,
  status: number,
  body: { error: string; code?: ApiErrorCode; details?: unknown },
): Response {
  const requestId = res.locals?.requestId;
  const payload: ApiErrorBody = {
    error: body.error,
    ...(body.code ? { code: body.code } : {}),
    ...(body.details !== undefined ? { details: body.details } : {}),
    ...(requestId ? { requestId } : {}),
  };
  return res.status(status).json(payload);
}
