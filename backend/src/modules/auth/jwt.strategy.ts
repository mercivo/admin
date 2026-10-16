import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Tenant } from '../site/tenant.entity';
import { Plan } from '../system/plan.entity';
import { migrateFinanceWorkflowPermissions, withPermissionParents } from '../system/permission-catalog';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'replace-this-secret',
    });
  }

  async validate(payload: { sub: string; account: string; role: 'system_admin' | 'admin' | 'member'; tenantId: string | null; siteId: string | null }) {
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || user.status !== 'active') throw new UnauthorizedException('账号已失效');
    let tenant: Tenant | null = null;
    if (user.tenantId) {
      tenant = await this.tenants.findOne({ where: { id: user.tenantId } });
      if (!tenant || tenant.status !== 'active') throw new UnauthorizedException('商户已停用');
      if (tenant.expiresAt && tenant.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('当前套餐已到期');
      if (tenant.permissionsCustomized) {
        const permissions = migrateFinanceWorkflowPermissions(tenant.permissions || []);
        if (!this.samePermissions(tenant.permissions || [], permissions)) {
          tenant.permissions = permissions;
          await this.tenants.save(tenant);
        }
      }
      if (!tenant.permissionsCustomized) {
        const plan = await this.plans.findOne({ where: { code: tenant.plan, enabled: true } });
        if (plan) {
          const permissions = withPermissionParents(migrateFinanceWorkflowPermissions(plan.permissions || []));
          if (!this.samePermissions(tenant.permissions || [], permissions)) {
            tenant.permissions = permissions;
            await this.tenants.save(tenant);
          }
        }
      }
    }
    const tenantPermissions = tenant?.permissions || [];
    const permissions = user.role === 'admin' ? tenantPermissions : migrateFinanceWorkflowPermissions(user.permissions || []).filter(key => tenantPermissions.includes(key));
    return { userId: payload.sub, account: payload.account, role: user.role, tenantId: payload.tenantId, siteId: payload.siteId, permissions };
  }
  private samePermissions(left: string[], right: string[]) {
    return left.length === right.length && left.every(permission => right.includes(permission));
  }
}
