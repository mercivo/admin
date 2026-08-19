import { Request } from 'express';

export type ApiLocale = 'zh-CN' | 'en-US';

export function resolveApiLocale(request: Request): ApiLocale {
  const value = String(request.headers['x-locale'] || request.headers['accept-language'] || '').toLowerCase();
  return value.startsWith('en') ? 'en-US' : 'zh-CN';
}

const messages: Array<[RegExp, string, string]> = [
  [/^Internal server error$/i, '服务暂时开小差，请稍后重试', 'The service is temporarily unavailable. Please try again later'],
  [/^Bad Request$/i, '提交信息有误，请检查后重试', 'The submitted information is invalid. Please check and try again'],
  [/^Unauthorized$/i, '未登录或登录已过期', 'Authentication required or session expired'],
  [/^Forbidden resource$/i, '无权执行此操作', 'You do not have permission to perform this action'],
  [/^Not Found$/i, '请求的资源不存在', 'The requested resource was not found'],
  [/^Cannot (GET|POST|PUT|PATCH|DELETE) .+$/i, '请求的接口不存在或已调整', 'The requested endpoint does not exist or has changed'],
  [/^Conflict$/i, '数据已存在或状态冲突，请刷新后重试', 'The data already exists or has changed. Refresh and try again'],
  [/^Payload Too Large$/i, '上传内容过大，请减小文件后重试', 'The upload is too large. Reduce the file size and try again'],
  [/^Too Many Requests$/i, '操作过于频繁，请稍后再试', 'Too many requests. Please try again later'],
  [/^Bad Gateway$/i, '服务连接异常，请稍后重试', 'The service connection failed. Please try again later'],
  [/^Service Unavailable$/i, '服务暂时不可用，请稍后重试', 'The service is temporarily unavailable. Please try again later'],
  [/^Gateway Timeout$/i, '服务响应超时，请稍后重试', 'The service timed out. Please try again later'],
  [/^验证码错误或已过期$/, '验证码错误或已过期', 'The captcha is incorrect or has expired'],
  [/^请输入有效手机号$/, '请输入有效手机号', 'Please enter a valid phone number'],
  [/^密码必须包含大小写字母、数字和特殊字符$/, '密码必须包含大小写字母、数字和特殊字符', 'Password must include uppercase and lowercase letters, a number, and a special character'],
  [/^该手机号已注册$/, '该手机号已注册', 'This phone number is already registered'],
  [/^账号或密码错误$/, '账号或密码错误', 'Incorrect account or password'],
  [/^账号已被停用$/, '账号已被停用', 'This account has been disabled'],
  [/^账号已失效$/, '账号已失效', 'This account is no longer valid'],
  [/^商户已停用$/, '商户已停用', 'This merchant has been suspended'],
  [/^商户已被停用，请联系平台管理员$/, '商户已被停用，请联系平台管理员', 'This merchant has been suspended. Contact the platform administrator'],
  [/^无权访问该站点$/, '无权访问该站点', 'You do not have access to this site'],
  [/^客户不存在$/, '客户不存在', 'Customer not found'],
  [/^商机不存在$/, '商机不存在', 'Opportunity not found'],
  [/^商户不存在$/, '商户不存在', 'Merchant not found'],
  [/^Product with id (.+) not found$/i, '商品 $1 不存在', 'Product $1 not found'],
  [/^Lead with id (.+) not found$/i, '线索 $1 不存在', 'Lead $1 not found'],
  [/^Agent (.+) not found$/i, '智能体 $1 不存在', 'Agent $1 not found'],
  [/^Testimonial (.+) not found$/i, '客户评价 $1 不存在', 'Testimonial $1 not found'],
  [/^Chat session not found$/i, '会话不存在', 'Chat session not found'],
  [/^Domain not found$/i, '域名不存在', 'Domain not found'],
  [/^Site version not found$/i, '站点版本不存在', 'Site version not found'],
  [/^Published site not found$/i, '已发布站点不存在', 'Published site not found'],
  [/^Published version not found$/i, '已发布版本不存在', 'Published version not found'],
  [/^Site (.+) not found$/i, '站点 $1 不存在', 'Site $1 not found'],
  [/^Config (.+) not found$/i, '配置 $1 不存在', 'Configuration $1 not found'],
  [/^Member (.+) not found$/i, '成员 $1 不存在', 'Member $1 not found'],
  [/^Dict type (.+) not found$/i, '字典类型 $1 不存在', 'Dictionary type $1 not found'],
  [/^Dict entry (.+) not found in (.+)$/i, '字典类型 $2 中不存在条目 $1', 'Dictionary entry $1 was not found in $2'],
  [/^字典项编码已存在$/, '字典项编码已存在', 'This dictionary entry code already exists'],
  [/^商品数量已达到当前套餐上限$/, '商品数量已达到当前套餐上限', 'The product limit for the current plan has been reached'],
  [/^请选择有效的商品分类$/, '请选择有效的商品分类', 'Please select a valid product category'],
  [/^站点数量已达到当前套餐上限$/, '站点数量已达到当前套餐上限', 'The site limit for the current plan has been reached'],
  [/^已发布站点数量已达到当前套餐上限$/, '已发布站点数量已达到当前套餐上限', 'The published site limit for the current plan has been reached'],
  [/^当前套餐未开通自定义域名$/, '当前套餐未开通自定义域名', 'Custom domains are not included in the current plan'],
  [/^智能体权限未开通或已达到套餐上限$/, '智能体权限未开通或已达到套餐上限', 'AI agents are unavailable or the current plan limit has been reached'],
  [/^未检测到域名验证 TXT 记录$/, '未检测到域名验证 TXT 记录', 'The domain verification TXT record was not found'],
  [/^域名验证 TXT 记录不匹配$/, '域名验证 TXT 记录不匹配', 'The domain verification TXT record does not match'],
  [/^Site preview parameter is not allowed on this host$/i, '当前域名不允许使用站点预览参数', 'The site preview parameter is not allowed on this host'],
  [/^property (.+) should not exist$/i, '字段 $1 不允许传入', 'Field $1 is not allowed'],
  [/^(.+) must be a string$/i, '字段 $1 必须是字符串', 'Field $1 must be a string'],
  [/^(.+) must be a number conforming to the specified constraints$/i, '字段 $1 必须是有效数字', 'Field $1 must be a valid number'],
  [/^(.+) must be an integer number$/i, '字段 $1 必须是整数', 'Field $1 must be an integer'],
  [/^(.+) must not be less than (.+)$/i, '字段 $1 不能小于 $2', 'Field $1 must not be less than $2'],
  [/^(.+) must not be greater than (.+)$/i, '字段 $1 不能大于 $2', 'Field $1 must not be greater than $2'],
  [/^(.+) must be an array$/i, '字段 $1 必须是数组', 'Field $1 must be an array'],
  [/^(.+) must be an object$/i, '字段 $1 必须是对象', 'Field $1 must be an object'],
  [/^(.+) must be a boolean value$/i, '字段 $1 必须是布尔值', 'Field $1 must be a boolean'],
  [/^(.+) must be one of the following values: (.+)$/i, '字段 $1 必须是以下值之一：$2', 'Field $1 must be one of: $2'],
  [/^each value in (.+) must be a string$/i, '字段 $1 中的每一项都必须是字符串', 'Every value in $1 must be a string'],
  [/^(.+) must be a UUID$/i, '字段 $1 必须是有效 UUID', 'Field $1 must be a valid UUID'],
  [/^(.+) should not be empty$/i, '字段 $1 不能为空', 'Field $1 is required'],
  [/^(.+) must be longer than or equal to (\d+) characters$/i, '字段 $1 长度不能少于 $2 个字符', 'Field $1 must be at least $2 characters'],
  [/^(.+) must be shorter than or equal to (\d+) characters$/i, '字段 $1 长度不能超过 $2 个字符', 'Field $1 must be at most $2 characters'],
];

export function localizeApiMessage(message: string, locale: ApiLocale): string {
  for (const [pattern, zh, en] of messages) {
    if (pattern.test(message)) return message.replace(pattern, locale === 'en-US' ? en : zh);
  }
  return message;
}

const statusMessages: Record<number, [string, string]> = {
  400: ['提交信息有误，请检查后重试', 'The submitted information is invalid. Please check and try again'],
  401: ['账号或密码错误，或登录已过期', 'Incorrect account or password, or your session has expired'],
  403: ['当前账号无权执行此操作', 'Your account does not have permission to perform this action'],
  404: ['请求的内容不存在或已被移除', 'The requested content does not exist or has been removed'],
  409: ['数据已存在或状态冲突，请刷新后重试', 'The data already exists or has changed. Refresh and try again'],
  413: ['上传内容过大，请减小文件后重试', 'The upload is too large. Reduce the file size and try again'],
  429: ['操作过于频繁，请稍后再试', 'Too many requests. Please try again later'],
  502: ['服务连接异常，请稍后重试', 'The service connection failed. Please try again later'],
  503: ['服务暂时不可用，请稍后重试', 'The service is temporarily unavailable. Please try again later'],
  504: ['服务响应超时，请稍后重试', 'The service timed out. Please try again later'],
};

export function friendlyStatusMessage(status: number, locale: ApiLocale): string {
  const message = statusMessages[status] || (status >= 500
    ? ['服务暂时开小差，请稍后重试', 'The service is temporarily unavailable. Please try again later']
    : ['请求未能完成，请稍后重试', 'The request could not be completed. Please try again']);
  return message[locale === 'en-US' ? 1 : 0];
}

const technicalValidationPatterns = [
  /^property .+ should not exist$/i,
  /^.+ must be a string$/i,
  /^.+ must be a number conforming to the specified constraints$/i,
  /^.+ must be an integer number$/i,
  /^.+ must not be less than .+$/i,
  /^.+ must not be greater than .+$/i,
  /^.+ must be an array$/i,
  /^.+ must be an object$/i,
  /^.+ must be a boolean value$/i,
  /^.+ must be one of the following values: .+$/i,
  /^each value in .+ must be a string$/i,
  /^.+ must be a UUID$/i,
  /^.+ should not be empty$/i,
  /^.+ must be longer than or equal to \d+ characters$/i,
  /^.+ must be shorter than or equal to \d+ characters$/i,
];

const friendlyFields: Record<string, [string, string]> = {
  account: ['请输入登录账号', 'Please enter your account'],
  password: ['请输入密码', 'Please enter your password'],
  phone: ['请输入手机号', 'Please enter your phone number'],
  tenantName: ['请输入企业或店铺名称', 'Please enter your company or store name'],
  captchaId: ['请刷新后重新输入验证码', 'Refresh and enter the captcha again'],
  captchaCode: ['请输入验证码', 'Please enter the captcha'],
};

/** Turn class-validator's message array into one actionable, user-facing message. */
export function localizeValidationMessages(rawMessages: string[], locale: ApiLocale): string {
  const usefulMessages = rawMessages.filter(message => !/^property .+ should not exist$/i.test(message));
  const customMessage = usefulMessages.find(message => !technicalValidationPatterns.some(pattern => pattern.test(message)));
  if (customMessage) return localizeApiMessage(customMessage, locale);

  const first = usefulMessages[0];
  if (first) {
    const field = first.match(/^([^ ]+) /)?.[1];
    const friendly = field && friendlyFields[field];
    if (friendly) return friendly[locale === 'en-US' ? 1 : 0];
  }
  return locale === 'en-US' ? 'The submitted information is invalid. Please check and try again' : '提交信息有误，请检查后重试';
}
