import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'seo_platform',
  charset: 'utf8mb4',
  timezone: '+00:00',
  extra: {
    charset: 'utf8mb4_unicode_ci',
    ...(process.env.DB_SOCKET_PATH ? { socketPath: process.env.DB_SOCKET_PATH } : {}),
  },
  pool: {
    max: 10,
  },
}));
