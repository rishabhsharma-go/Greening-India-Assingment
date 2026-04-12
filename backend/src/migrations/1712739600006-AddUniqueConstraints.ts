import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraints1712739600006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add unique constraint to projects (owner + name)
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "UQ_project_name_owner" UNIQUE ("owner_id", "name")`,
    );

    // Add unique constraint to tasks (project + title)
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "UQ_task_title_project" UNIQUE ("project_id", "title")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "UQ_task_title_project"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "UQ_project_name_owner"`,
    );
  }
}
