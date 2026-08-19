import { BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const run = (exception: unknown) => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ headers: { 'accept-language': 'zh-CN' }, url: '/api/v1/test' }),
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
});
