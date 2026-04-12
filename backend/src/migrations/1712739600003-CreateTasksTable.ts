import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTasksTable1712739600003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum" AS ENUM('todo', 'in_progress', 'done')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_priority_enum" AS ENUM('low', 'medium', 'high')`,
    );

    await queryRunner.query(`CREATE TABLE "tasks" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "title" character varying NOT NULL, 
            "description" character varying, 
            "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'todo', 
            "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'medium', 
            "project_id" uuid NOT NULL, 
            "creator_id" uuid NOT NULL,
            "assignee_id" uuid, 
            "due_date" date, 
            "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
            CONSTRAINT "PK_tasks" PRIMARY KEY ("id")
        )`);

    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_creator" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_assignee" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_assignee"`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_creator"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_project"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
  }
}
