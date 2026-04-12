import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditAndSoftDeleteColumns1712739600004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "deleted_at" TIMESTAMP`);

    await queryRunner.query(
      `ALTER TABLE "projects" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "deleted_at" TIMESTAMP`,
    );

    await queryRunner.query(`ALTER TABLE "tasks" ADD "deleted_at" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "deleted_at"`);

    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "updated_at"`);

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updated_at"`);
  }
}
