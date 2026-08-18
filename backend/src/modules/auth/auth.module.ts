import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Site } from '../site/site.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { Tenant } from '../site/tenant.entity';
import { Plan } from '../system/plan.entity';
import Redis from 'ioredis';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([Site, Tenant, User, Plan]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'replace-this-secret',
        signOptions: { expiresIn: 7 * 24 * 60 * 60 },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    AuthService,
    { provide: 'CAPTCHA_REDIS', inject: [ConfigService], useFactory: (config: ConfigService) => new Redis({ host: config.get<string>('redis.host') || 'localhost', port: config.get<number>('redis.port') || 6379, lazyConnect: false, maxRetriesPerRequest: 2 }) },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
