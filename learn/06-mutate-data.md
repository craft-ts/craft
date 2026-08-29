---
url: https://craft-ts.github.io/craft/learn/06-mutate-data.md
---
# 6. Write server data

**Goal:** create a task on the server, and make the list update before the
request even comes back.

## The mutation primitive

`mutation` is `query`'s counterpart for writes. Same shape, triggered explicitly.

```ts
import { CraftHttpClient, craftService, mutation } from '@craft-ts/core';

export const { TaskWrites } = craftService(
  { name: 'TaskWrites', providedIn: 'function' },
  function* () {
    const createTask = yield* mutation('createTask', {
      method: (payload: { title: string }) => payload,
      loader: function* ({ params }) {
        return yield* CraftHttpClient.post(({ response }) => ({
          url: '/api/tasks',
          payload: params,
          success: response<Task>(),
        }));
      },
    });

    return { createTask };
  },
);
```

`method` is the entry point: it takes what the caller passes and returns what
the loader receives as `params`. It is also where you can reject input before any
request happens (see below).

## Making the list react

The interesting part is not the mutation, it's wiring it to the query. That's an
insertion — `insertReactOnMutation`:

```ts
import {
  CraftHttpClient,
  craftService,
  insertReactOnMutation,
  mutation,
  query,
} from '@craft-ts/core';

export const { TaskSync } = craftService(
  { name: 'TaskSync', providedIn: 'function' },
  function* () {
    const createTask = yield* mutation('createTask', {
      method: (payload: { title: string }) => payload,
      loader: function* ({ params }) {
        return yield* CraftHttpClient.post(({ response }) => ({
          url: '/api/tasks',
          payload: params,
          success: response<Task>(),
        }));
      },
    });

    const tasksQuery = yield* query(
      'tasksQuery',
      {
        params: () => ({ done: false }),
        loader: function* () {
          return yield* CraftHttpClient.get(({ response }) => ({
            url: '/api/tasks',
            success: response<Task[]>(),
          }));
        },
      },
      insertReactOnMutation(createTask, {
        reload: { onMutationResolved: true },
      }),
    );

    return { createTask, tasksQuery };
  },
);
```

The query now reloads itself whenever `createTask` succeeds. No subscription, no
event bus, no manual `refetch()` call at the call site.

## Optimistic updates

Reloading costs a round-trip. `optimisticPatch` applies the change immediately
and reverts it if the mutation fails:

```typescript
insertReactOnMutation(renameTask, {
  optimisticPatch: {
    title: ({ mutationParams }) => mutationParams.title,
  },
  reload: { onMutationException: true },
});
```

While `renameTask` is in flight, `tasksQuery.value()` already shows the new
title. If it throws, the query reloads to get the truth back.

## Rejecting bad input

You rarely want to send a request you know will fail. Return a `craftException`
from `method` and the loader never runs:

```typescript
import { craftException } from '@craft-ts/core';

const createTask = yield* mutation('createTask', {
  method: (payload: { title: string }) =>
    payload.title.trim().length === 0
      ? craftException({ _tag: 'TITLE_REQUIRED' }, { received: payload.title })
      : payload,
  loader: /* … */,
});

yield* createTask.mutate({ title: '  ' });
createTask.hasException(); // true
createTask.exceptions().params?.TITLE_REQUIRED;
```

Note the shape: `exceptions()` is split by **origin** — `params` for what your
`method` rejected, `loader` for what the request produced. Both are typed from
the codes you declared, so the compiler knows `TITLE_REQUIRED` exists and that
`TITLE_TOO_LONG` doesn't.

### Or let a schema do it

Hand-written guards get long as soon as there are several fields. Declare a
schema instead and the primitive validates the argument for you:

```typescript
import { z } from 'zod';

const CreateTaskSchema = z.object({
  title: z.string().trim().min(1).max(80),
});

const createTask = yield* mutation('createTask', {
  methodSchema: CreateTaskSchema,
  method: (payload) => payload, // already validated and typed by the schema
  loader: /* … */,
});
```

`methodSchema` validates what `mutate(...)` receives, and `method` then gets the
schema's **output** value — so a coercion or a `.trim()` in the schema is
reflected in the type.

Any library implementing `StandardSchemaV1` works — Zod, Valibot, ArkType, or
a hand-written `{ '~standard': … }` object; Effect Schema works too, after one
[`Schema.toStandardSchemaV1`](/guide/state/schema-validation#effect-schema)
call. None of them becomes a dependency of `@craft-ts`. Queries have the same
hooks for their reactive params (`paramsSchema`) and their result
(`loaderSchema`).

**Use a schema** when the shape itself is the rule, **a `craftException` from
`method`** when the rule is business logic — "this title already exists in the
current project" is not something a schema can know. See
[Schema validation](/guide/state/schema-validation).

::: tip Exceptions as values
A craft *exception* is a value you declared and expect to handle. An *error* is
the unexpected kind. Keeping the two apart is what makes the exhaustiveness
checks later possible — see [Exceptions](/guide/concepts/exceptions).
:::

## What you gained

A write path that owns its loading and failure state, and a declarative link
between writes and reads.

[← 5. Load server data](/learn/05-load-data)

[7. Put state in the URL →](/learn/07-url-state)
