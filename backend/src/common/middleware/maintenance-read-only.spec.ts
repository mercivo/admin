import type { NextFunction, Request, Response } from 'express';
import {
  maintenanceReadOnlyEnabled,
  maintenanceReadOnlyMiddleware,
} from './maintenance-read-only';

describe('maintenanceReadOnlyMiddleware', () => {
  const originalValue = process.env.MAINTENANCE_READ_ONLY;

  afterEach(() => {
    if (originalValue === undefined) delete process.env.MAINTENANCE_READ_ONLY;
    else process.env.MAINTENANCE_READ_ONLY = originalValue;
  });

  it('is disabled unless explicitly set to true', () => {
    expect(maintenanceReadOnlyEnabled({})).toBe(false);
    expect(maintenanceReadOnlyEnabled({ MAINTENANCE_READ_ONLY: 'false' })).toBe(false);
    expect(maintenanceReadOnlyEnabled({ MAINTENANCE_READ_ONLY: ' TRUE ' })).toBe(true);
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])('allows safe %s requests during maintenance', method => {
    process.env.MAINTENANCE_READ_ONLY = 'true';
    const next = jest.fn() as NextFunction;

    maintenanceReadOnlyMiddleware({ method } as Request, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects writes with a stable 503 response during maintenance', () => {
    process.env.MAINTENANCE_READ_ONLY = 'true';
    const next = jest.fn() as NextFunction;
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));

    maintenanceReadOnlyMiddleware(
      { method: 'POST' } as Request,
      { status } as unknown as Response,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MAINTENANCE_READ_ONLY' }));
  });
});
