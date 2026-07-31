import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env['DATABASE_HOST'] ?? 'localhost',
  port: parseInt(process.env['DATABASE_PORT'] ?? '5432', 10),
  database: process.env['DATABASE_NAME'] ?? 'buslanka_dev',
  username: process.env['DATABASE_USER'] ?? 'buslanka',
  password: process.env['DATABASE_PASSWORD'] ?? 'changeme_dev',
  ssl: process.env['DATABASE_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: process.env['NODE_ENV'] === 'development' ? ['query', 'error'] : ['error'],
  entities: [path.resolve(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.resolve(__dirname, './migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
  extra: {
    max: parseInt(process.env['DATABASE_POOL_SIZE'] ?? '10', 10),
  },
};

// Used by TypeORM CLI (migration:run, migration:generate)
const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
