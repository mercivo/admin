import jwtConfig from './jwt.config';
import { JwtService } from '@nestjs/jwt';

describe('jwtConfig', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalExpiresIn = process.env.JWT_EXPIRES_IN;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
    delete process.env.JWT_EXPIRES_IN;
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalExpiresIn === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = originalExpiresIn;
  });

  it('defaults newly issued access tokens to 24 hours', () => {
    const config = jwtConfig();
    expect(config).toMatchObject({ expiresIn: '24h' });
    const token = new JwtService({ secret: config.secret }).sign({ sub: 'user-1' }, { expiresIn: config.expiresIn as '24h' });
    const payload = new JwtService().decode(token) as { iat: number; exp: number };
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
  });

  it('keeps the deployment override configurable', () => {
    process.env.JWT_EXPIRES_IN = '86400s';
    expect(jwtConfig()).toMatchObject({ expiresIn: '86400s' });
  });
});
