import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const run = (exception: unknown, url = '/api/v1/test') => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ headers: { 'accept-language': 'zh-CN' }, url }),
      }),
    };
    new HttpExceptionFilter().catch(exception, host as never);
    return { status, body: json.mock.calls[0][0] };
  };

  it('does not expose unexpected server error details', () => {
    const result = run(new Error('database password leaked in connection error'));
    expect(result.status).toHaveBeenCalledWith(500);
    expect(result.body.message).toBe('服务暂时开小差，请稍后重试');
    expect(JSON.stringify(result.body)).not.toContain('database password');
  });

  it('keeps actionable validation errors', () => {
    const result = run(new BadRequestException(['account should not be empty']));
    expect(result.status).toHaveBeenCalledWith(400);
    expect(result.body.message).toBe('请输入登录账号');
  });

  it('adds a stable error code to public validation errors', () => {
    const result = run(new BadRequestException(['联系人不能为空']), '/api/v1/public/inquiries');
    expect(result.body.errorCode).toBe('CONTACT_NAME_REQUIRED');
    expect(result.body.message).toBe('联系人不能为空');
  });

  it('adds a stable error code to unavailable public sites', () => {
    const result = run(new NotFoundException('Published site not found'), '/api/v1/public/site');
    expect(result.body.errorCode).toBe('SITE_NOT_FOUND_OR_UNPUBLISHED');
  });

  it('preserves public access error codes and safe localized notices', () => {
    const data = { locale: 'en_US', title: 'Site unavailable', description: 'The current plan has expired.' };
    const result = run(new ForbiddenException({ errorCode: 'SITE_PLAN_EXPIRED', message: 'Tenant plan expired', data }), '/api/v1/public/site?lang=en_US');
    expect(result.status).toHaveBeenCalledWith(403);
    expect(result.body).toMatchObject({ errorCode: 'SITE_PLAN_EXPIRED', data });
  });
});
