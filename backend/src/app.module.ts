import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import databaseConfig from "./config/database.config";
import jwtConfig from "./config/jwt.config";
import redisConfig from "./config/redis.config";
import { SeoModule } from "./modules/seo/seo.module";
import { PageModule } from "./modules/page/page.module";
import { ProductModule } from "./modules/product/product.module";
import { SitemapModule } from "./modules/sitemap/sitemap.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ProductCategoryModule } from "./modules/product-category/product-category.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { StorefrontModule } from "./modules/storefront/storefront.module";
import { WorkspaceModule } from "./modules/workspace/workspace.module";
import { SiteModule } from "./modules/site/site.module";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { ThrottlerGuard } from "@nestjs/throttler";
import { SystemModule } from "./modules/system/system.module";
import { CustomerModule } from "./modules/customer/customer.module";
import { PlanPermissionsGuard } from "./common/guards/plan-permissions.guard";
import { Tenant } from "./modules/site/tenant.entity";
import { CloudStorageModule } from "./common/storage/cloud-storage.module";
import { join } from "path";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { SalesModule } from "./modules/sales/sales.module";
import { PurchaseModule } from "./modules/purchase/purchase.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { TranslationModule } from "./modules/translation/translation.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig],
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const database =
          configService.get<Record<string, unknown>>("database") || {};
        return {
          type: "mysql" as const,
          ...database,
          autoLoadEntities: true,
          migrations: [join(__dirname, "migrations", "*.{ts,js}")],
          // Schema changes are owned by the dedicated migration job. Starting an
          // API revision must never race the job or mutate a database implicitly.
          migrationsRun: false,
          synchronize: process.env.DB_SYNCHRONIZE === "true",
        };
      },
    }),
    CacheModule.register({ isGlobal: true, ttl: 300000, max: 10000 }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    SeoModule,
    PageModule,
    ProductModule,
    SitemapModule,
    AuthModule,
    ProductCategoryModule,
    DashboardModule,
    StorefrontModule,
    WorkspaceModule,
    SiteModule,
    SystemModule,
    CustomerModule,
    InventoryModule,
    SalesModule,
    PurchaseModule,
    FinanceModule,
    TranslationModule,
    CloudStorageModule,
    TypeOrmModule.forFeature([Tenant]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PlanPermissionsGuard },
  ],
})
export class AppModule {}
