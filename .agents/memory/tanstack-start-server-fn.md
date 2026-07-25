---
name: TanStack Start server function API
description: Correct chaining API for createServerFn in the version installed (@tanstack/react-start 1.167.x)
---

The correct chain is:

```ts
createServerFn({ method: 'POST' })
  .inputValidator(zodSchema)   // NOT .validator()
  .handler(async ({ data }) => { ... })
```

**Why:** `.validator()` does not exist on `ServerFnBuilder` in this version. The type definition exposes `inputValidator` on the `ServerFnValidator` interface. Using `.validator()` throws at runtime: "(intermediate value)(...).validator is not a function".

**How to apply:** Any time you write a new server function with input validation, use `.inputValidator()` for the schema step.
