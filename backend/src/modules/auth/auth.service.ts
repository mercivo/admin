import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import Redis from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes, randomInt } from 'crypto';
import { Site } from '../site/site.entity';
import { Tenant } from '../site/tenant.entity';
import { User } from './user.entity';
import { LoginDto, RegisterDto } from './auth.dto';
import { hashPassword, verifyPassword } from './password.util';
import { TRIAL_PERMISSIONS } from '../system/permission-catalog';
import { DictType } from '../dict/dict-type.entity';
import { Plan } from '../system/plan.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Site) private readonly sites: Repository<Site>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @Inject('CAPTCHA_REDIS') private readonly captchaRedis: Redis,
  ) {}

  async captcha() {
    const captchaId = randomBytes(18).toString('hex');
    const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');
    await this.captchaRedis.set(`captcha:${captchaId}`, code, 'EX', 300);
    const noise = Array.from({ length: 7 }, (_, i) => `<line x1="${randomInt(130)}" y1="${randomInt(46)}" x2="${randomInt(130)}" y2="${randomInt(46)}" stroke="hsl(${i * 47} 55% 70%)"/>`).join('');
    const chars = [...code].map((char, i) => `<text x="${18 + i * 27}" y="34" transform="rotate(${randomInt(-12, 13)} ${18 + i * 27} 34)">${char}</text>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="46" viewBox="0 0 140 46"><rect width="140" height="46" rx="8" fill="#f3f1ff"/>${noise}<g font-family="monospace" font-size="25" font-weight="700" fill="#4f46e5">${chars}</g></svg>`;
    return { captchaId, image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, expiresIn: 300, ...(process.env.AUTH_CAPTCHA_DEBUG_ENABLED === 'true' ? { debugCode: code } : {}) };
  }

  async register(dto: RegisterDto) {
    const expected = await this.captchaRedis.getdel(`captcha:${dto.captchaId}`);
    if (!expected || expected.toUpperCase() !== dto.captchaCode.trim().toUpperCase()) throw new BadRequestException('验证码错误或已过期');
    if (await this.users.exist({ where: { phone: dto.phone } })) throw new ConflictException('该手机号已注册');
    const passwordHash = await hashPassword(dto.password);
    const suffix = dto.phone.replace(/\D/g, '').slice(-8);
    const trialPlan = await this.plans.findOne({ where: { code: 'trial', enabled: true } });
    const trial = trialPlan || { code: 'trial', maxProducts: 20, maxAgents: 0, maxMembers: 1, maxSites: 1, features: {}, permissions: TRIAL_PERMISSIONS };
    const result = await this.dataSource.transaction(async (manager) => {
      const tenant = await manager.save(Tenant, manager.create(Tenant, { slug: `tenant-${suffix}-${Date.now().toString(36)}`, name: dto.tenantName.trim(), status: 'active', plan: trial.code, maxProducts: trial.maxProducts, maxAgents: trial.maxAgents, maxMembers: trial.maxMembers, maxSites: trial.maxSites, features: trial.features || {}, permissions: trial.permissions || [], permissionsCustomized: false, expiresAt: new Date(Date.now() + 14 * 86400000) }));
      const site = await manager.save(Site, manager.create(Site, { tenantId: tenant.id, slug: `site-${suffix}-${Date.now().toString(36)}`, name: `${dto.tenantName} 独立站`, status: 'draft', defaultLanguage: 'zh', defaultCurrency: 'CNY', publishedVersionId: null }));
      await manager.save(DictType, manager.create(DictType, { tenantId: tenant.id, siteId: site.id, typeId: 'category', label: '商品分类', icon: '📦' }));
      const user = await manager.save(User, manager.create(User, { tenantId: tenant.id, siteId: site.id, phone: dto.phone, username: null, passwordHash, role: 'admin', status: 'active', lastLoginAt: null }));
      return { tenant, site, user };
    });
    return this.issueToken(result.user, result.tenant);
  }

  async login(dto: LoginDto) {
    const account = dto.account.trim();
    const user = await this.users.findOne({ where: [{ phone: account }, { username: account }] });
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) throw new UnauthorizedException('账号或密码错误');
    if (user.status !== 'active') throw new UnauthorizedException('账号已被停用');
    const tenant = user.tenantId ? await this.tenants.findOne({ where: { id: user.tenantId } }) : null;
    if (tenant?.status === 'suspended') throw new UnauthorizedException('商户已被停用，请联系平台管理员');
    if (tenant?.expiresAt && tenant.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('当前套餐已到期，请联系平台管理员续费');
    user.lastLoginAt = new Date();
    await this.users.save(user);
    return this.issueToken(user, tenant);
  }

  async switchSite(userId: string, tenantId: string, siteId: string) {
    const [user, tenant, site] = await Promise.all([
      this.users.findOne({ where: { id: userId, tenantId, status: 'active' } }),
      this.tenants.findOne({ where: { id: tenantId, status: 'active' } }),
      this.sites.findOne({ where: { id: siteId, tenantId } }),
    ]);
    if (!user || !tenant || !site) throw new UnauthorizedException('无权访问该站点');
    user.siteId = site.id;
    await this.users.save(user);
    return this.issueToken(user, tenant);
  }

  private async issueToken(user: User, tenant: Tenant | null) {
    const tenantPermissions = tenant?.permissions || [];
    const effectivePermissions = user.role === 'admin'
      ? tenantPermissions
      : (user.permissions || []).filter(permission => tenantPermissions.includes(permission));
    const account = user.phone || user.username || user.id;
    const payload = { sub: user.id, account, role: user.role, tenantId: user.tenantId || '', siteId: user.siteId || '' };
    return { accessToken: await this.jwt.signAsync(payload), user: { userId: user.id, account, role: user.role, tenantId: payload.tenantId, siteId: payload.siteId }, tenant: tenant ? { id: tenant.id, name: tenant.name, plan: tenant.plan, status: tenant.status, expiresAt: tenant.expiresAt, permissions: effectivePermissions } : null };
  }
}
