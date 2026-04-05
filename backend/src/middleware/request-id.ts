import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const HEADER = 'x-request-id';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[HEADER];
  const fromClient =
    typeof incoming === 'string' && incoming.trim().length > 0 ? incoming.trim().slice(0, 128) : null;
  const id = fromClient || randomUUID();
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
