import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import { SeoModule } from './modules/seo/seo.module';
import { PageModule } from './modules/page/page.module';
import { ProductModule } from './modules/product/product.module';
import { SitemapModule } from './modules/sitemap/sitemap.module';
import { AuthModule } from './modules/auth/auth.module';
import { LeadModule } from './modules/lead/lead.module';
import { DictModule } from './modules/dict/dict.module';
import { AgentModule } from './modules/agent/agent.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { ChatModule } from './modules/chat/chat.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { SiteModule } from './modules/site/site.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SystemModule } from './modules/system/system.module';
import { CustomerModule } from './modules/customer/customer.module';
import { OpportunityModule } from './modules/opportunity/opportunity.module';
import { PlanPermissionsGuard } from './common/guards/plan-permissions.guard';
import { Tenant } from './modules/site/tenant.entity';
import { OutreachModule } from './modules/outreach/outreach.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: process.env.DB_SYNCHRONIZE === 'true' || process.env.NODE_ENV !== 'production',
        charset: 'utf8mb4',
        timezone: '+00:00',
      }),
    }),
    CacheModule.register({ isGlobal: true, ttl: 300000, max: 10000 }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    SeoModule,
    PageModule,
    ProductModule,
    SitemapModule,
    AuthModule,
    LeadModule,
    DictModule,
    AgentModule,
    DashboardModule,
    StorefrontModule,
    ChatModule,
    WorkspaceModule,
    SiteModule,
    SystemModule,
    CustomerModule,
    OpportunityModule,
    OutreachModule,
    TypeOrmModule.forFeature([Tenant]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PlanPermissionsGuard },
  ],
})
export class AppModule { }
