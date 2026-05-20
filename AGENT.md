# AGENT.md

## Project summary

- `app/`: Next.js App Router entrypoints and route-level pages
- `app/consumption/`: Session comparison page for bill and usage calculations
- `components/`: Shared presentation components used across pages
- `components/ui/`: Primitive UI building blocks. Prefer using them instead of tailwind utilities directly.
- `lib/`: Shared utilities, fonts, seeded session data, and calculation helpers
- `public/`: Static assets

## Naming conventions

- Page folders use lowercase route names such as `consumption`
- Shared components use descriptive filenames such as `navigation.tsx` and `footer.tsx`
- UI primitives live under `components/ui/`
- Shared library files stay flat under `lib/` unless grouped by responsibility

## Product notes

- The source product brief lives in `PROJECT_PROMPT.md`
- Session history is persisted in browser `localStorage`
- OCR runs in the browser and must always allow manual correction before committing a reading
- Calculations should stay deterministic and easy to inspect; avoid hiding billing logic inside UI components
