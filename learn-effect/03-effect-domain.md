---
url: https://craft-ts.github.io/craft/learn-effect/03-effect-domain.md
---
# 3. Put the domain in Effect

**Goal:** define typed business failures and services without making the Craft
component know how they are provided.

## Typed failures are values

Effect's tagged errors map naturally to Craft's exception channel:

```typescript
import { Context, Data, Effect } from 'effect';

export class UserNotFound extends Data.TaggedError('UserNotFound')<{
  readonly userId: string;
}> {}

export class Unauthorized extends Data.TaggedError('Unauthorized')<{
  readonly reason: string;
}> {}

type User = {
  readonly id: string;
};

type UserRepository = {
  readonly find: (userId: string) => Effect.Effect<User | undefined>;
};

export class UserRepositoryService extends Context.Service<
  UserRepositoryService,
  UserRepository
>()('app/UserRepository') {}

export const loadUser = Effect.fnUntraced(function* (userId: string) {
  const repository = yield* UserRepositoryService;
  const user = yield* repository.find(userId);
  if (!user) return yield* new UserNotFound({ userId });
  return user;
});
```

The program has the shape `Effect<User, UserNotFound, UserRepositoryService>`.
`yield* UserRepositoryService` gets the repository from the Effect context;
`yield* repository.find(userId)` then runs the `Effect` returned by its method.
`UserNotFound` is a business outcome that the UI can handle. An unexpected
defect raised by `Effect.die` remains a technical error; it is not turned into a
business exception.

`Data.TaggedError` creates a **yieldable error** in Effect v4, so this is the
idiomatic form inside `Effect.gen`:

```typescript
if (!user) return yield * new UserNotFound({ userId });
```

The explicit equivalent is `yield* Effect.fail(new UserNotFound({ userId }))`;
there is no `Effect.failed` constructor. At the Craft boundary, yield the
effect through `runEffect(...)` instead of yielding the error instance directly.

## Define an Effect service

Use `Context.Service` for the contract and a `Layer` for the implementation:

```typescript
import { Context, Effect, Layer } from 'effect';

type AccessPolicy = {
  readonly decide: (
    userId: string,
  ) => Effect.Effect<AccessDecision, UserNotFound>;
};

export class AccessPolicyService extends Context.Service<
  AccessPolicyService,
  AccessPolicy
>()('app/AccessPolicyService') {}

export const AccessPolicyLive = Layer.sync(AccessPolicyService)(() => ({
  decide: (userId) => findAccessDecision(userId),
}));

export const checkUserAccess = Effect.fnUntraced(function* (userId: string) {
  const policy = yield* AccessPolicyService;
  return yield* policy.decide(userId);
});
```

The component calls `checkUserAccess`; it does not call `AccessPolicyService`
and does not know which Layer implements it.

When a Craft factory genuinely needs a service member, narrow it explicitly with
`effectService` rather than resolving an untracked value:

```typescript
import { effectService } from '@craft-ts/effect';

const { decide } =
  yield * effectService(AccessPolicyService, ({ decide }) => ({ decide }));
```

Prefer exposing a domain operation such as `checkUserAccess` to a component. The
selector form is useful for a Craft service or adapter that deliberately owns
the boundary and wants the graph to record only the members it uses.

## Derive Craft state from the Effect service

`craftComputed` stays synchronous: it derives a Craft reader. Let
`queryEffect` execute the Effect operation, then derive a display value from the
query resource:

```typescript
import { craftComputed } from '@craft-ts/core';
import { queryEffect } from '@craft-ts/effect';

const accessQuery =
  yield *
  queryEffect('accessQuery', {
    params: () => 'user-ada',
    loader: ({ params }) => checkUserAccess(params),
  });

const accessLabel = craftComputed('accessLabel', function* () {
  return (yield* accessQuery.value())?.label ?? 'Loading…';
});
```

The chain is: `queryEffect` runs `checkUserAccess`, the active `Layer` provides
`AccessPolicyService`, and `accessLabel` reacts to the query's Craft value. The
computed does not call the Effect service or start an Effect itself.

## Declare a synchronous member

That last sentence used to be a hard rule: no Effect at all inside `params`,
`craftComputed(...)` or `craftMethod(...)`. Those run on Craft's **synchronous**
driver, which completes on one tick and cannot wait — and `Effect<A, E, R>` does
not say whether running it will suspend.

It is worse than it looks for a service member. A `Layer` closes over the
member's dependencies when it builds the service, so a member that calls the
network and a member that adds two numbers *both* surface as `R = never`:

```ts
import { Context, Effect, Layer } from 'effect';
import { SyncOp } from '@craft-ts/effect';

export type CartLine = {
  readonly sku: string;
  readonly qty: number;
  readonly unitCents: number;
};

export type CartPricingShape = {
  // Asynchronous: `R` is `never` and it still goes to the network — the Layer
  // closed over the transport at construction. Nothing in the type says so.
  readonly fetchCatalog: (
    skus: readonly string[],
  ) => Effect.Effect<ReadonlyMap<string, number>>;

  // Synchronous: `SyncOp` in `R` is the whole difference.
  readonly lineTotal: (line: CartLine) => Effect.Effect<number, never, SyncOp>;
  readonly formatPrice: (cents: number) => Effect.Effect<string, never, SyncOp>;
};

export class CartPricing extends Context.Service<
  CartPricing,
  CartPricingShape
>()('learn-effect/CartPricing') {}

export const CartPricingLive = Layer.sync(CartPricing)(() => ({
  fetchCatalog: Effect.fnUntraced(function* (skus: readonly string[]) {
    yield* Effect.sleep('50 millis');
    return new Map(skus.map((sku) => [sku, 1_000]));
  }),

  // The shape already declares these synchronous, so the implementations need
  // no ceremony: Effect<A, E, never> is assignable to Effect<A, E, SyncOp>.
  lineTotal: (line) => Effect.succeed(line.qty * line.unitCents),
  formatPrice: (cents) => Effect.succeed(`${(cents / 100).toFixed(2)} €`),
}));
```

The information does not exist in the type, so you write it there. `SyncOp` is a
phantom requirement — never provided, no runtime cost — and `R` is the one
channel Effect accumulates across composition. An Effect that requires `SyncOp`
is one its author declares never suspends.

Requirements union through `Effect.gen`, so the declaration propagates on its
own. A standalone program that only calls declared-synchronous members inherits
the marker; one that calls nothing marked spells it out with `yield* SyncOp`:

```ts
/**
 * `R` is inferred here: `CartPricing` from the tag, `SyncOp` from the members.
 * Composition propagates the declaration — nothing to maintain by hand.
 */
export const cartTotalLabel = Effect.fnUntraced(function* (
  lines: readonly CartLine[],
) {
  const pricing = yield* CartPricing;

  let cents = 0;
  for (const line of lines) {
    cents += yield* pricing.lineTotal(line);
  }

  return yield* pricing.formatPrice(cents);
});

/** No marked call to inherit from, so the marker is spelled out. */
export const cartWeight = Effect.fnUntraced(function* (
  lines: readonly CartLine[],
) {
  yield* SyncOp;
  return lines.reduce((total, line) => total + line.qty * 250, 0);
});
```

`CartPricing` in `R` is not a problem: the level in force satisfies it, exactly
as it does for a loader. The only thing checked is that `SyncOp` is among the
requirements.

## Use it: computedEffect, then syncEffect

For a derived value, reach for `computedEffect` — the Effect counterpart of
`craftComputed`. The factory reads Craft dependencies and **returns** the
Effect; the adapter runs it in place, so you get a plain reactive value:

```ts
import { craftComponent, p } from '@craft-ts/component';
import { state } from '@craft-ts/core';
import { computedEffect } from '@craft-ts/effect';

export const CartTotal = craftComponent(
  'LearnEffectCartTotal',
  {},
  function* () {
    const lines = yield* state('lines', [
      { sku: 'sku-1', qty: 2, unitCents: 1_000 },
      { sku: 'sku-2', qty: 1, unitCents: 1_000 },
    ] as CartLine[]);

    // The factory RETURNS the Effect; `computedEffect` runs it in place.
    const totalLabel = computedEffect('totalLabel', function* () {
      return cartTotalLabel(yield* lines());
    });

    return { totalLabel };
  },
  ({ totalLabel }) => [p(totalLabel)],
);
```

Anything nobody declared synchronous is refused at the call, before anything
runs:

```ts
const catalogProgram = Effect.gen(function* () {
  const pricing = yield* CartPricing;
  return yield* pricing.fetchCatalog(['sku-1']);
});

export function cartSummary() {
  // ✅ declared synchronous — `SyncOp` is in its requirements.
  const weightLabel = computedEffect('weightLabel', () => cartWeight([]));

  // ❌ `fetchCatalog` suspends and nobody declared otherwise: a computation
  //    cannot run it. Use queryEffect.
  const catalogLabel = computedEffect(
    'catalogLabel',
    // @ts-expect-error NotDeclaredSynchronous
    () => catalogProgram,
  );

  return { weightLabel, catalogLabel };
}
```

For a synchronous Effect exposed as a callable method, use `methodEffect`, the
Effect counterpart of `craftMethod`. For lower-level positions such as a
`params` factory or a `state` updater, `syncEffect(...)` is the same door,
opened by hand:

```typescript
queryEffect('shippingQuote', {
  params: function* () {
    return yield* syncEffect(cartWeightGrams(yield* lines()));
  },
  loader: ({ params }) => quoteShipping(params),
});
```

The relationship mirrors the asynchronous side: `computedEffect` is to
`methodEffect` what `queryEffect` is to `asyncProcessEffect` — a value or method
with no resource lifecycle. `syncEffect` remains the lower-level escape hatch.

::: tip Three lines of defence

`SyncOp` is a claim, not a proof — nothing stops a body from declaring itself
synchronous and awaiting anyway. Three mechanisms check it, and none is
redundant:

1. **the type** — `computedEffect` and `syncEffect(...)` refuse an Effect nobody
   declared, at the call site;
2. **`craft-ts/sync-effect-body`** — reads the body, every branch at once, and
   rejects a declared-synchronous body that yields something async. A unit test
   cannot do this: it only proves the inputs it was given;
3. **the runtime** — both run through `Effect.runSyncExitWith`, which
   cannot suspend. A broken declaration throws `CraftEffectNotSynchronous`
   immediately, at the first call, instead of freezing the UI.

:::

Keep asynchronous work where it belongs: a loader. `SyncOp` opens one narrow,
explicit door for business calculations, not a way around the adapters.

## Run a standalone Effect

For a low-level bridge, `runEffect` lets a Craft generator yield an Effect while
preserving its typed error channel:

```typescript
import { Effect } from 'effect';
import { runEffect } from '@craft-ts/effect';

const name = yield * runEffect(Effect.succeed('Ada'));
```

Use the adapters in the next chapters for application data. They resolve the
Effect requirement `R` through the nearest `provideLayer(...)` and keep loading,
value and exception state in the Craft resource.

## Install the bridge once

The bridge teaches Craft how to execute a yielded Effect. Install it during app
bootstrap, not in every loader:

```typescript
import { provideAppInitializer } from '@craft-ts/core';
import { installCraftEffectBridge } from '@craft-ts/effect';

export const appConfig = craftAppConfig({
  providers: [
    provideAppInitializer(() => {
      installCraftEffectBridge();
    }),
  ],
});
```

In tests, call `installCraftEffectBridge()` in `beforeEach` and dispose the
returned function in `afterEach`.

## What you gained

An Effect domain with typed failures, explicit service requirements and swappable
Layers. The next step puts that program behind a reactive `queryEffect`.

[← 2. Derive UI state](/learn-effect/02-derive)

[4. Load data with Effect →](/learn-effect/04-load-data)
