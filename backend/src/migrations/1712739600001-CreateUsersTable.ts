import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1712739600001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')`,
    );
    await queryRunner.query(`CREATE TABLE "users" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "name" character varying NOT NULL, 
            "email" character varying NOT NULL, 
            "password" character varying NOT NULL, 
            "role" "public"."users_role_enum" NOT NULL DEFAULT 'user',
            "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
            CONSTRAINT "UQ_email" UNIQUE ("email"), 
            CONSTRAINT "PK_users" PRIMARY KEY ("id")
        )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
