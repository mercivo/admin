import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Tenant } from '../site/tenant.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, @InjectRepository(User) private readonly users: Repository<User>, @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'replace-this-secret',
    });
  }

  async validate(payload: { sub: string; account: string; role: 'system_admin' | 'admin' | 'editor' | 'viewer'; tenantId: string | null; siteId: string | null }) {
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || user.status !== 'active') throw new UnauthorizedException('账号已失效');
    if (user.tenantId) {
      const tenant = await this.tenants.findOne({ where: { id: user.tenantId } });
      if (!tenant || tenant.status !== 'active') throw new UnauthorizedException('商户已停用');
      if (tenant.expiresAt && tenant.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('当前套餐已到期');
    }
    const tenantPermissions = user.tenantId ? (await this.tenants.findOne({ where: { id: user.tenantId } }))?.permissions || [] : [];
    const permissions = user.role === 'admin' ? tenantPermissions : (user.permissions || []).filter(key => tenantPermissions.includes(key));
    return { userId: payload.sub, account: payload.account, role: user.role, tenantId: payload.tenantId, siteId: payload.siteId, permissions };
  }
}
