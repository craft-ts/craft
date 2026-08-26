---
url: https://craft-ts.github.io/craft/guide/i18n/tokens.md
---
# Tokens

A token is the unit that makes a message parameter typed. It carries a **name**
(the parameter key), a **kind**, an optional **guard**, and a **formatter** that
receives the active locale.

## The shipped tokens

They are semantic, not stylistic, and every one of them formats through `Intl`,
so the output follows the locale rather than a hand-written rule:

```ts
import {
  compactNumber,
  dateLong,
  dateShort,
  dateTime,
  integer,
  money,
  number,
  percent,
  relativeTime,
} from '@craft-ts/i18n';

const price = money('price', undefined, { currency: 'EUR' });
const ratio = percent('ratio', undefined, { maximumFractionDigits: 1 });
const placedAt = dateLong('placedAt');
const lastSync = relativeTime('lastSync', undefined, { unit: 'day' });
```

| factory                              | parameter type   | formats as                    |
| ------------------------------------ | ---------------- | ----------------------------- |
| `number`, `integer`, `compactNumber` | `number`         | decimal, no fraction, compact |
| `percent`                            | `number`         | `0.125` → `12.5 %`            |
| `money`                              | `number`         | currency, `EUR` by default    |
| `dateShort`, `dateLong`, `dateTime`  | `Date \| number` | date and date-time styles     |
| `relativeTime`                       | `number`         | `-2` → `2 days ago`           |

Each is a factory: `factory(name, adapter?, options?)`. The **name** is what the
params object will be keyed by, so the same factory serves any number of
parameters — `money('amount')` and `money('refund')` are two different tokens.

`percent` takes a ratio, not a percentage: `0.125`, not `12.5`. That is `Intl`'s
convention and the token does not second-guess it.

## Your own token

Business vocabulary does not belong in a shared library. `defineToken` builds
one, and it looks exactly like a shipped token at the call site:

```ts
import { defineToken } from '@craft-ts/i18n';

type OrderStatus = 'paid' | 'pending' | 'refunded';

export const orderStatus = defineToken({
  name: 'status',
  kind: 'order-status',
  tokenId: 'app.order-status',
  // The guard is what keeps an arbitrary string out of the params type.
  validate: (value: unknown): value is OrderStatus =>
    value === 'paid' || value === 'pending' || value === 'refunded',
  format: (value: OrderStatus, context) =>
    context.locale.startsWith('fr')
      ? { paid: 'Payée', pending: 'En attente', refunded: 'Remboursée' }[value]
      : { paid: 'Paid', pending: 'Pending', refunded: 'Refunded' }[value],
});
```

The `validate` guard is what keeps an arbitrary string out of the params type: a
message that interpolates this token accepts `'paid' | 'pending' | 'refunded'`
and nothing else. Without it, the parameter widens and the token stops earning
its place.

`format` receives the value and a context carrying `locale` and, when the
runtime was given one, `timeZone`. Keep the branching on `context.locale`
coarse — a language prefix, not a full locale match — unless you genuinely have
per-region wording.

## A family of tokens

When the same formatting rule serves several parameter names and options,
`defineTokenFactory` builds the factory instead of the token:

```ts
import { defineTokenFactory } from '@craft-ts/i18n';

// One factory, many parameter names: `duration('elapsed')`, `duration('ttl')`.
export const duration = defineTokenFactory<
  'duration',
  number,
  { readonly unit?: Intl.RelativeTimeFormatUnit }
>({
  kind: 'duration',
  format: (options) => (value: number, context) =>
    new Intl.NumberFormat(context.locale, {
      style: 'unit',
      unit: options?.unit ?? 'minute',
    }).format(value),
});
```

That is exactly how `number`, `money` and the rest are built; there is no
privileged path for the shipped ones.

Conventionally these live in `src/i18n/project-tokens.ts`, which is where
`craft create` puts them and what the generated agent skill points at.

## Next

* [The runtime](./runtime.md) — spending a catalogue built from these.
