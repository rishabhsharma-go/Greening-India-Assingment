import { DataSource, DataSourceOptions } from 'typeorm';
import { runSeeders, SeederOptions } from 'typeorm-extension';
import { AppDataSource } from './common/db/data-source';
import MainSeeder from './common/db/seeds/main.seeder';
import { Logger } from '@nestjs/common';

const logger = new Logger('Seeder');

const options: DataSourceOptions & SeederOptions = {
  ...AppDataSource.options,
  seeds: [MainSeeder],
};

const dataSource = new DataSource(options);

dataSource
  .initialize()
  .then(async () => {
    logger.log('Database initialized for seeding...');
    await runSeeders(dataSource);
    logger.log('Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Error during seeding:', error);
    process.exit(1);
  });
