import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectsTable1712739600002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "projects" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "name" character varying NOT NULL, 
            "description" character varying, 
            "owner_id" uuid NOT NULL, 
            "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
            CONSTRAINT "PK_projects" PRIMARY KEY ("id")
        )`);
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_owner"`,
    );
    await queryRunner.query(`DROP TABLE "projects"`);
  }
}
