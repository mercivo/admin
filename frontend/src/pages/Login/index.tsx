import React, { useEffect, useState } from 'react';
import { Button, Form, Typography, message } from 'antd';
import {
  ArrowRightOutlined,
  GlobalOutlined,
  InboxOutlined,
  LockOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  StarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { AppForm, AppFormItem, AppInput, AppPasswordInput } from '../../components/shared/AppForm';
import BrandMark from '../../components/shared/BrandMark';
import { firstAuthorizedRoute } from '../../utils/navigation';

type Captcha = { captchaId: string; image: string };
type AuthResult = { accessToken: string; user: { role: string; account: string; name?: string }; tenant: { name: string; permissions?: string[] } | null };
const loadApi = () => import('../../services/api').then(module => module.default);

const capabilities = [
  { icon: InboxOutlined, label: '外贸 ERP' },
  { icon: GlobalOutlined, label: '品牌独立站' },
];

const LoginPage: React.FC = () => {
  const [mode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const loadCaptcha = async () => setCaptcha(await (await loadApi()).get<unknown, Captcha>('/auth/captcha'));

  useEffect(() => { if (mode === 'register') void loadCaptcha(); }, [mode]);

  const finish = (result: AuthResult) => {
    localStorage.setItem('mercivo_access_token', result.accessToken);
    localStorage.setItem('mercivo_user', JSON.stringify(result.user));
    if (result.tenant) localStorage.setItem('mercivo_tenant', JSON.stringify(result.tenant));
    location.assign(result.user.role === 'system_admin' ? '/system' : firstAuthorizedRoute(result.tenant?.permissions || []));
  };

  const login = async (values: { account: string; password: string }) => {
    setLoading(true);
    try { finish(await (await loadApi()).post<unknown, AuthResult>('/auth/login', values)); }
    finally { setLoading(false); }
  };

  const register = async (values: { phone: string; password: string; confirm: string; tenantName: string; captchaCode: string }) => {
    if (!captcha) return;
    setLoading(true);
    try {
      const { confirm: _confirm, ...registration } = values;
      finish(await (await loadApi()).post<unknown, AuthResult>('/auth/register', { ...registration, captchaId: captcha.captchaId }));
      message.success('注册成功');
    } catch {
      void loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative grid min-h-[100dvh] overflow-hidden bg-[#f8f8fc] lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden bg-[#17133f] px-[clamp(2.5rem,6vw,6.5rem)] py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(124,110,245,.5),transparent_34%),radial-gradient(circle_at_85%_78%,rgba(76,201,240,.22),transparent_32%),linear-gradient(145deg,transparent_20%,rgba(255,255,255,.04)_20%,rgba(255,255,255,.04)_21%,transparent_21%)]" />
        <div className="absolute -right-32 top-16 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -right-16 top-32 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute bottom-[-12rem] left-[-8rem] h-[30rem] w-[30rem] rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <BrandMark size={44} />
          <div>
            <div className="text-xl font-bold tracking-[.16em]">迈犀沃</div>
            <div className="text-[10px] font-semibold tracking-[.3em] text-violet-200/70">MERCIVO</div>
          </div>
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-white/10 px-4 py-2 text-xs font-medium text-violet-100 backdrop-blur">
            <StarOutlined className="text-sm" /> 商户智能增长工作台
          </div>
          <h1 className="relative whitespace-nowrap text-[clamp(2.35rem,4vw,4.25rem)] font-black leading-[1.08] tracking-[-.055em]">
            <span className="relative inline-block bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text pr-3 text-transparent drop-shadow-[0_8px_28px_rgba(103,232,249,.2)] after:absolute after:inset-x-1 after:-bottom-2 after:h-[3px] after:origin-left after:-rotate-1 after:rounded-full after:bg-gradient-to-r after:from-violet-400/80 after:via-cyan-300/70 after:to-transparent">让外贸增长，全程在线</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-8 text-indigo-100/65">
            外贸 ERP 与品牌独立站一体化，集中管理商品、客户、定价与全球站点发布。
          </p>
          <div className="mt-9 grid max-w-sm grid-cols-2 gap-3">
            {capabilities.map(({ icon: Icon, label }) => (
              <div key={label} data-testid="login-capability" className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[.07] px-3 py-4 text-center backdrop-blur-sm">
                <Icon className="mb-3 text-[19px] text-violet-300" />
                <span className="text-xs font-medium text-indigo-50/80">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-indigo-200/45">© 2026 迈犀沃 · 外贸 ERP 与独立站管理平台</p>
      </section>

      <section className="relative flex min-h-[100dvh] items-center justify-center px-4 py-4 sm:px-8 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,#ddd6fe,transparent_70%)] opacity-70 lg:hidden" />
        <div className="relative w-full max-w-[420px] rounded-[26px] border border-white/80 bg-white/95 p-5 shadow-[0_24px_70px_-24px_rgba(91,76,180,.3)] backdrop-blur sm:p-7">
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            <BrandMark size={36} />
            <div><div className="font-bold tracking-[.14em] text-slate-900">迈犀沃</div><div className="text-[9px] tracking-[.24em] text-indigo-400">MERCIVO</div></div>
          </div>

          <div className="mb-4">
            <Typography.Title level={2} style={{ margin: 0, fontSize: 27 }}>
              {mode === 'login' ? '欢迎回来' : '创建商户账号'}
            </Typography.Title>
            <Typography.Text className="text-[13px]" type="secondary">
              {mode === 'login' ? '登录迈犀沃，继续管理外贸业务全流程' : '填写信息，即刻开启 14 天免费试用'}
            </Typography.Text>
          </div>

          {mode === 'login' ? (
            <AppForm className="[&_.ant-form-item]:!mb-4 [&_.ant-form-item-label]:!pb-1.5" onFinish={login}>
              <AppFormItem label="登录账号" name="account" rules={[{ required: true, message: '请输入登录账号' }]}>
                <AppInput prefix={<UserOutlined />} autoComplete="username" placeholder="请输入手机号或管理员账号" />
              </AppFormItem>
              <AppFormItem label="密码" name="password" rules={[{ required: true, min: 8, message: '密码至少 8 位' }]}>
                <AppPasswordInput prefix={<LockOutlined />} autoComplete="current-password" placeholder="请输入登录密码" />
              </AppFormItem>
              <Button className="mt-1 !h-10 !rounded-xl !font-semibold" block type="primary" htmlType="submit" loading={loading}>
                安全登录 <ArrowRightOutlined className="ml-1" />
              </Button>
            </AppForm>
          ) : (
            <AppForm className="[&_.ant-form-item]:!mb-3.5 [&_.ant-form-item-label]:!pb-1.5" onFinish={register}>
              <AppFormItem label="企业/店铺名称" name="tenantName" rules={[{ required: true, min: 2, message: '请输入至少 2 个字符' }]}>
                <AppInput prefix={<ShopOutlined />} placeholder="请输入商户名称" />
              </AppFormItem>
              <AppFormItem label="手机号" name="phone" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^\+?[1-9]\d{7,14}$/, message: '请输入有效手机号' }]}>
                <AppInput prefix={<MobileOutlined />} autoComplete="tel" placeholder="用于登录和接收业务通知" />
              </AppFormItem>
              <AppFormItem label="登录密码" name="password" rules={[{ required: true, min: 8, message: '至少 8 位' }]}>
                <AppPasswordInput prefix={<LockOutlined />} autoComplete="new-password" placeholder="至少 8 位" />
              </AppFormItem>
              <AppFormItem label="确认密码" name="confirm" dependencies={['password']} rules={[{ required: true, message: '请再次输入' }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('两次密码不一致')); } })]}>
                <AppPasswordInput prefix={<LockOutlined />} placeholder="再次输入" />
              </AppFormItem>
              <AppFormItem label="图形验证码" required>
                <div className="flex items-stretch gap-2">
                  <Form.Item name="captchaCode" noStyle rules={[{ required: true, len: 4, message: '请输入 4 位验证码' }]}>
                    <AppInput prefix={<SafetyCertificateOutlined />} maxLength={4} className="flex-1" placeholder="验证码" />
                  </Form.Item>
                  <button type="button" onClick={loadCaptcha} title="点击刷新验证码" className="w-[116px] shrink-0 self-stretch overflow-hidden rounded-[10px] border border-violet-100 bg-violet-50 p-0 transition hover:border-violet-300" style={{ minHeight: 36 }}>
                    {captcha && <img src={captcha.image} alt="图形验证码" className="block h-full w-full object-fill" />}
                  </button>
                </div>
              </AppFormItem>
              <Button className="!h-10 !rounded-xl !font-semibold" block type="primary" htmlType="submit" loading={loading}>
                注册并创建商户 <ArrowRightOutlined className="ml-1" />
              </Button>
              <p className="mb-0 mt-2 text-center text-[11px] text-gray-400">注册即表示同意服务条款与隐私政策</p>
            </AppForm>
          )}
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
