# AGENT.md

## Project summary

- `app/`: Next.js App Router entrypoints, route handlers, and page-level section folders
- `app/home/sections/`: Home page UI broken into focused, reusable page sections
- `app/api/`: Route handlers for server-side mutations and data entry points
- `components/`: Shared presentation components used across pages
- `components/ui/`: Primitive UI building blocks. Prefer using them instead of tailwind utilities directly.
- `lib/`: Shared utilities, data access helpers, fonts, and domain types
- `lib/entities/`: TypeORM entity definitions
- `lib/types/`: Shared TypeScript contracts for page data and component props
- `migrations/`: TypeORM migration files
- `scripts/`: Small operational scripts such as local database sync
- `public/`: Static assets

## Naming conventions

- Page folders use lowercase route names such as `home`
- Page-only building blocks live in `sections/` under the route folder
- Shared components use descriptive filenames such as `navigation.tsx` and `footer.tsx`
- UI primitives live under `components/ui/`
- Shared library files stay flat under `lib/` unless grouped by responsibility
- Entities use `*.entity.ts` to make the ORM layer easy to scan

## Stubs

- The project is a template. Make sure to rename `projectname` with the new project name
- Update `package.json` and `tsconfig.json` files with the new project name

## TypeORM notes

- The datasource singleton lives in `lib/db.ts`
- Entities are registered from `lib/entities/`
- Route handlers and server components should import data helpers from `lib/` rather than talking to the datasource directly when possible
