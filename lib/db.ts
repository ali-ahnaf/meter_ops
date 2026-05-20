import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DataSource } from "typeorm";
import { PostEntity, SubscriberEntity, UserEntity } from "./entities";
import { Migration1779185133879 } from "../migrations/1779185133879-Migration";

const entities = [PostEntity, SubscriberEntity, UserEntity];
const migrations = [Migration1779185133879];

function resolveDatabasePath() {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  const bundledDatabasePath = path.join(process.cwd(), "projectname.sqlite");
  if (fs.existsSync(bundledDatabasePath)) {
    return bundledDatabasePath;
  }

  if (process.env.HOME) {
    return path.join(process.env.HOME, "projectname.sqlite");
  }

  return path.join(os.tmpdir(), "projectname.sqlite");
}

function createAppDataSource() {
  return new DataSource({
    type: "better-sqlite3",
    database: resolveDatabasePath(),
    entities,
    migrations,
    synchronize: false,
    logging: false,
  });
}

export const AppDataSource = createAppDataSource();
let initializationPromise: Promise<DataSource> | undefined;

export async function initializeDatabase() {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  initializationPromise ??= AppDataSource.initialize()
    .then((dataSource) => {
      return dataSource.runMigrations().then(() => dataSource);
    })
    .then((dataSource) => {
      initializationPromise = undefined;
      return dataSource;
    })
    .catch((error) => {
      initializationPromise = undefined;
      throw error;
    });

  return initializationPromise;
}

export const postRepo = () => AppDataSource.getRepository(PostEntity);
export const subscriberRepo = () => AppDataSource.getRepository(SubscriberEntity);
export const userRepo = () => AppDataSource.getRepository(UserEntity);

export default AppDataSource;
