import { friendlyStatusMessage, localizeApiMessage, localizeValidationMessages } from './api-locale';

describe('API error messages', () => {
  it('uses an actionable message for unexpected server errors', () => {
    expect(localizeApiMessage('Internal server error', 'zh-CN')).toBe('服务暂时开小差，请稍后重试');
    expect(friendlyStatusMessage(500, 'zh-CN')).toBe('服务暂时开小差，请稍后重试');
  });

  it('provides friendly fallbacks for common HTTP failures', () => {
    expect(friendlyStatusMessage(401, 'zh-CN')).toContain('账号或密码错误');
    expect(friendlyStatusMessage(403, 'zh-CN')).toContain('无权');
    expect(friendlyStatusMessage(429, 'zh-CN')).toContain('过于频繁');
    expect(friendlyStatusMessage(503, 'en-US')).toContain('temporarily unavailable');
    expect(localizeApiMessage('Cannot GET /api/v1/missing', 'zh-CN')).toBe('请求的接口不存在或已调整');
  });

  it('turns validation details into one actionable field message', () => {
    expect(localizeValidationMessages(['password must be longer than or equal to 8 characters'], 'zh-CN')).toBe('请输入密码');
    expect(localizeValidationMessages(['property debug should not exist'], 'zh-CN')).toBe('提交信息有误，请检查后重试');
  });
});
