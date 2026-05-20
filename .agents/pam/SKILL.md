---
name: pam
description: Use this skill when editing UI files in this repository, especially files in app/, components/, and app/globals.css. Follow the project's Next.js App Router structure, shared UI primitives, Tailwind styling patterns, performance-minded rendering decisions, and smooth, restrained animation guidance.
---

# PAM UI Skill

Use this skill for any visual or interaction-focused change in this repo, including:

- Files under `app/**` that render pages, layouts, or route-level sections
- Files under `components/**`, especially shared presentation components
- `components/ui/**` primitives and their variants
- `app/globals.css` and other styling-focused edits

## Repo-specific rules

- Respect the App Router structure already in place.
- Keep page-specific UI inside route `sections/` folders when the component is not broadly reusable.
- Prefer shared primitives from `components/ui/` before introducing one-off button, link, or card patterns.
- Preserve the existing warm, editorial visual language unless the task explicitly asks for a redesign.
- Keep `lib/` for shared logic and types, not presentational markup.

## Next.js conventions

- Default to Server Components. Add `"use client"` only when the component truly needs client-side state, effects, browser APIs, or event-heavy interactions.
- Keep the client boundary small. Move static shells and content back to server-rendered components whenever possible.
- Use `next/link` for internal navigation.
- Use `next/image` for content images or decorative assets when it improves loading, sizing, or responsiveness.
- Keep layout concerns close to the route or component that owns them instead of creating broad abstractions too early.
- Prefer semantic HTML first: `header`, `main`, `section`, `nav`, `footer`, `article`, `button`, and proper heading order.

## Performance and implementation guidance

- Avoid unnecessary re-renders by keeping components focused and passing only the props they need.
- Do not add client hooks or state for purely static presentation.
- Prefer CSS and Tailwind transitions over JavaScript-driven animation when possible.
- Load-heavy effects, large shadows, and aggressive blurs should be used sparingly.
- Reuse existing tokens, spacing rhythms, and border treatments before inventing new ones.
- Keep DOM depth reasonable and avoid wrapper divs that do not add layout or semantic value.
- Make responsive behavior intentional at mobile, tablet, and desktop breakpoints.
- Split large components into small and reusable components.

## Styling guidance

- Use Tailwind utilities consistently with the existing codebase.
- Prefer design tokens and CSS variables already established in `app/globals.css`.
- When introducing new colors or surface treatments, add them deliberately and keep them compatible with the current palette.
- Favor readable line lengths, strong contrast, and clear visual hierarchy.
- If a component pattern is repeated, consider improving or extending a shared primitive rather than duplicating classes.

## Animation guidance

- Motion should support clarity, hierarchy, and delight, not distract from content.
- Prefer subtle entrance, hover, focus, and state-transition animations.
- Keep durations short, usually around `150ms` to `300ms`, with smooth easing.
- Animate transform and opacity before layout-affecting properties.
- Avoid animation loops unless the design explicitly benefits from them.
- Respect reduced-motion expectations. If adding meaningful animation, provide a graceful low-motion fallback.
- Staggering is fine for grouped content, but keep it understated.

## Editing checklist

- Confirm whether the UI belongs in `app/home/sections/`, `components/`, or `components/ui/`.
- Check whether the change can stay server-rendered.
- Reuse existing primitives and styles before adding new patterns.
- Ensure the result works cleanly across mobile and desktop.
- Keep motion polished and restrained.
- Leave the code simpler, clearer, or more reusable than you found it.
