---
url: https://craft-ts.github.io/craft/guide/i18n/effect.md
---
# i18n with Effect

`@craft-ts/i18n-effect` is an **adapter, and only an adapter**. It exposes three
things — a service tag, a `Layer`, and one function — over a runtime you built
the ordinary way. `@craft-ts/i18n` itself never imports Effect, and plain
component code should keep calling `t` directly.

## The Layer

```ts
import { Effect } from 'effect';
import { provideI18nRuntime, translateEffect } from '@craft-ts/i18n-effect';

const runtime = createI18nRuntime({ locales, defaultLocale: 'en-US' });

// One Layer, built from the runtime the rest of the app already uses.
export const i18nLayer = provideI18nRuntime(runtime);
```

`provideI18nRuntime(runtime)` returns `Layer.Layer<I18nEffectService>`. It wraps
the runtime you already have, so there is exactly one active locale in the
process — the Effect side does not get its own.

## Bind the locales once

`translateEffect` has no value parameter carrying the locales, so TypeScript has
nothing to infer them from. Called bare, its key parameter resolves to `never`
and **even a valid key is rejected**. Bind them once, in the same file as the
Layer:

```ts
import type { TranslationKey, TranslationParams } from '@craft-ts/i18n';

type AppLocales = typeof locales;

/**
 * `translateEffect` has no value parameter carrying the locales, so TypeScript
 * cannot infer them: called bare, its key parameter resolves to `never` and
 * even a valid key is rejected. Bind them once, here, and every call site gets
 * the closed key union back.
 */
export const t = <Key extends TranslationKey<AppLocales[number]>>(
  key: Key,
  ...params: keyof TranslationParams<
    AppLocales[number],
    Key & string
  > extends never
    ? [params?: TranslationParams<AppLocales[number], Key & string>]
    : [params: TranslationParams<AppLocales[number], Key & string>]
) => translateEffect<AppLocales, Key>(key, ...params);
```

From there, `t` has the closed key union and the typed params back. Passing the
type arguments at every call site —
`translateEffect<typeof locales, 'order.total'>(…)` — works too, and is what
this wrapper spares you.

## `translateEffect`

```ts
// Same keys, same params, same string as runtime.t — but as an Effect that
// declares I18nEffectService in its requirements.
const summary = Effect.gen(function* () {
  const total = yield* t('order.total', { amount: 1234.5 });
  const items = yield* t('order.items', { count: 2 });
  return `${total} ${items}`;
});
```

The signature is `translateEffect(key, params) =>
Effect.Effect<string, never, I18nEffectService>`. Same closed key union, same
typed params, same string as `runtime.t` — the snippet above is checked against
`runtime.t` in the docs test suite rather than trusted.

The error channel is `never` on purpose: a translation that reaches this point
cannot fail on a bad key or a bad parameter, because neither compiles. What
*can* fail is the locale not being loaded, and that is a defect in the app's
startup, which is why it throws `I18nRuntimeError` rather than becoming a typed
failure every call site would have to handle.

## When to reach for it

Use `translateEffect` **inside an Effect program** — a domain service building a
message, a server handler rendering an email. In a component, `t` is the shorter
and framework-independent path, and reaching for Effect just to format a string
adds a requirement to the program for nothing.

See also the [Effect adapters](../advanced/effect.md) page for the rest of the
`@craft-ts/*-effect` family.
