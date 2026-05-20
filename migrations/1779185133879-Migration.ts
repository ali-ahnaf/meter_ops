import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1779185133879 implements MigrationInterface {
    name = 'Migration1779185133879'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "posts" ("id" varchar PRIMARY KEY NOT NULL, "slug" text NOT NULL, "title" text NOT NULL, "excerpt" text NOT NULL, "category" text NOT NULL, "publishedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_54ddf9075260407dcfdd7248577" UNIQUE ("slug"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "email" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"))`);
        await queryRunner.query(`CREATE TABLE "subscribers" ("id" varchar PRIMARY KEY NOT NULL, "email" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_1a7163c08f0e57bd1c9821508b1" UNIQUE ("email"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "subscribers"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "posts"`);
    }

}
