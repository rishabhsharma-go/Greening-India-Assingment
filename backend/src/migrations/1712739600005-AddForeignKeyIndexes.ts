import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddForeignKeyIndexes1712739600005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_projects_owner_id" ON "projects" ("owner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_projects_deleted_at" ON "projects" ("deleted_at")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_tasks_project_id" ON "tasks" ("project_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tasks_creator_id" ON "tasks" ("creator_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tasks_assignee_id" ON "tasks" ("assignee_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tasks_deleted_at" ON "tasks" ("deleted_at")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_users_deleted_at" ON "users" ("deleted_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_deleted_at"`);
    await queryRunner.query(`DROP INDEX "IDX_tasks_deleted_at"`);
    await queryRunner.query(`DROP INDEX "IDX_tasks_assignee_id"`);
    await queryRunner.query(`DROP INDEX "IDX_tasks_creator_id"`);
    await queryRunner.query(`DROP INDEX "IDX_tasks_project_id"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_deleted_at"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_owner_id"`);
  }
}
