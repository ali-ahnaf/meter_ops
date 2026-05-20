# template-nextjs

A reusable Next.js starter built for fast product iteration with TypeORM and a lightweight local database setup.

This template gives you a clean App Router structure, a simple persistence layer, and a project layout that is easy for both humans and AI coding agents to understand and extend.

## Use Case

This app is designed to be used by an AI agent almost entirely for vibe coding.

The structure is intentionally straightforward so an agent can quickly understand where UI, server logic, and data models live, then make changes with minimal setup friction. It works well for rapid prototyping, internal tools, experimental products, and early-stage MVPs where speed and iteration matter more than heavy platform complexity.

## Highlights

- Next.js App Router structure under `app/`
- Page-specific UI grouped in `app/<page>/sections`
- Shared UI components in `components/`
- Shared server and utility code in `lib/`
- TypeORM entities in `lib/entities`
- Database configuration in `lib/db.ts`
- SQLite by default for quick local setup
- A layout that is easy to navigate, extend, and refactor

## Tech Stack

- Next.js
- React
- TypeScript
- TypeORM
- SQLite

## Project Structure

```text
app/              Next.js routes and page entry points
app/<page>/sections/  Page-specific UI sections
components/       Shared UI components
lib/              Shared utilities, server code, and data access
lib/entities/     TypeORM entities
lib/db.ts         TypeORM datasource configuration
```

## Quick Start

1. Install dependencies.
2. Copy the environment file.
3. Sync the database schema.
4. Start the development server.

```bash
npm install
cp .env.example .env
npm run db:sync
npm run dev
```

Then open `http://localhost:3000`.

## Database Workflow

Use `db:sync` for the fastest local iteration loop:

```bash
npm run db:sync
```

Use migrations when you want schema changes to be versioned and repeatable:

```bash
npm run db:migrate:generate
npm run db:migrate:run
```

`db:sync` is ideal for bootstrapping and experimentation. Migrations are a better fit when the schema needs to be shared, reviewed, or deployed across environments.

## Why This Template

This starter is optimized for clarity over cleverness. The goal is to make it easy to:

- ship quickly
- onboard new contributors
- let AI agents safely make targeted changes
- evolve from a prototype into a more structured application

## Typical Workflow

1. Start with a page in `app/`.
2. Build page-specific sections inside `app/<page>/sections`.
3. Move reusable UI into `components/`.
4. Add entities in `lib/entities`.
5. Sync locally with `npm run db:sync`.
6. Introduce migrations when the data model starts to stabilize.
