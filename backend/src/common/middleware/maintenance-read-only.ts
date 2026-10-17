import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function maintenanceReadOnlyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MAINTENANCE_READ_ONLY?.trim().toLowerCase() === 'true';
}

export function maintenanceReadOnlyMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (!maintenanceReadOnlyEnabled() || SAFE_METHODS.has(request.method.toUpperCase())) {
    next();
    return;
  }

  response.status(503).json({
    code: 'MAINTENANCE_READ_ONLY',
    message: '系统正在进行数据库维护，当前仅支持查询，请稍后重试。',
  });
}
