import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRolesTable1712739600007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "roles" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "name" character varying NOT NULL, 
            "slug" character varying NOT NULL, 
            CONSTRAINT "UQ_role_name" UNIQUE ("name"),
            CONSTRAINT "UQ_role_slug" UNIQUE ("slug"),
            CONSTRAINT "PK_roles" PRIMARY KEY ("id")
        )`);

    await queryRunner.query(`INSERT INTO "roles" ("name", "slug") VALUES ('User', 'user'), ('Admin', 'admin')`);

    await queryRunner.query(`ALTER TABLE "users" ADD "role_id" uuid`);

    await queryRunner.query(`
        UPDATE "users" 
        SET "role_id" = (SELECT "id" FROM "roles" WHERE "slug" = "users"."role"::text)
    `);

    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_user_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`CREATE INDEX "IDX_user_role_id" ON "users" ("role_id")`);

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')`);
    await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."users_role_enum" DEFAULT 'user'`);

    await queryRunner.query(`
        UPDATE "users" 
        SET "role" = (SELECT "slug"::"public"."users_role_enum" FROM "roles" WHERE "id" = "users"."role_id")
    `);

    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_user_role"`);
    await queryRunner.query(`DROP INDEX "IDX_user_role_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role_id"`);

    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
