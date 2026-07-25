---
name: TanStack Start root config context
description: How to provide a global homepage/CMS config context to every page in TanStack Start without breaking the root route.
---

# TanStack Start root config context

## Rule

Provide app-wide configuration (e.g., the homepage CMS config) from the **root route's `shellComponent`** using `useLoaderData({ from: '__root__' })`, then wrap `{children}` in a React context provider.

## Why

In this version of the project, adding a `component` to `createRootRoute` caused a runtime `NotFoundError` on `__root__`. The root route was already configured with `shellComponent`, and using `shellComponent` as the layout provider preserved the existing route-tree behavior while still making the loader data available to all pages.

## How to apply

- Keep `createRootRoute` with `loader`, `head`, and `shellComponent`.
- Import `useLoaderData` from `@tanstack/react-router`.
- In `RootDocument`, read `const { homepage } = useLoaderData({ from: '__root__' })` and wrap the body contents in `<HomepageConfigProvider value={homepage ?? defaults}>`. Defaults are required because `useLoaderData` can be `undefined` during early SSR/hydration.
- Don't rely on `Route.useLoaderData` or a separate `component` option for the root route unless you verify it works in the current TanStack Start version.
