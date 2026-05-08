import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const isDev = process.env.NODE_ENV !== 'production';
  const useSQLite = process.env.USE_SQLITE === 'true' || isDev;

  if (useSQLite) {
    return {
      type: 'better-sqlite3' as const,
      database: process.env.SQLITE_DB_PATH || './rolsito.dev.db',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: false,
    };
  }

  return {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USER || 'rolsito',
    password: process.env.DB_PASSWORD || 'rolsito123',
    database: process.env.DB_NAME || 'rolsito',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  };
});
