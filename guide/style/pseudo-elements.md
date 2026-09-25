---
url: https://craft-ts.github.io/craft/guide/style/pseudo-elements.md
---
# Pseudo-elements and animations

A component sheet can style what used to need a hand-written selector —
`::before`, `::placeholder`, `@keyframes`, `transition` — with the same typed
vocabulary as the rest of the sheet.

## Pseudo-elements

```ts
import {
  bg,
  blockSize,
  craftStyles,
  cssString,
  defineStateAxis,
  display,
  inlineSize,
  palette,
  pseudo,
  radii,
  radius,
  unit,
  when,
} from '@craft-ts/style';

export const status = defineStateAxis('status', ['failed']);

export const indicator = craftStyles('indicator', {
  root: [
    display.inlineFlex,
    pseudo.before([
      // Without `content`, ::before is never generated — a type error here.
      pseudo.content.empty,
      display.block,
      inlineSize(unit.rem(0.5)),
      blockSize(unit.rem(0.5)),
      radius(radii.full),
      bg(palette.accent.info),
      when(status.failed, [
        pseudo.content.text(cssString('⚠')),
        bg(palette.accent.danger),
      ]),
    ]),
  ],
});
```

`pseudo.before([...])` is an item of a class, and nests like `when(...)`. The
emitter always puts the pseudo-element **last** in the selector, where CSS
requires it, whatever the nesting order: `when(status.failed, [pseudo.before(...)])`
and `pseudo.before([when(status.failed, ...)])` both give
`.x[data-status='failed']::before`.

Available: `pseudo.before`, `pseudo.after`, `pseudo.placeholder`,
`pseudo.marker`, `pseudo.selection`, `pseudo.backdrop`.

### `content` is required, and typed

`::before` and `::after` are not generated without a `content`, and nothing
they declare applies. Rather than a decoration that silently disappears, it is
a type error:

```ts
pseudo.before([display.block]);
// ~~~~~~~~~ ERROR_a_generated_pseudo_element_needs_content
```

The content itself comes from `pseudo.content`:

| helper                                   | CSS                    |
| ---------------------------------------- | ---------------------- |
| `pseudo.content.empty`                   | `content: ""`          |
| `pseudo.content.none`                    | `content: none`        |
| `pseudo.content.text(cssString('→'))`    | `content: "→"`         |
| `pseudo.content.counter(ident('step'))`  | `content: counter(step)` |

The check reads the top level of the block: a `content` placed only under a
`when(...)` leaves the base scenario without one, which is the same bug.

### Pseudo-classes are axes

There is no `pseudo.hover`. `:hover`, `:focus-visible` or `:disabled` are
**states**, and a state is an axis (`interaction.hover`, `defineStateAxis`).
That is what puts it in the variant contract, the visual matrix and the
contrast proof — a hand-written `:hover` would be invisible to all three.

## Keyframes and animations

```ts
import { animate, easing, keyframes, rotate } from '@craft-ts/style';

export const spin = keyframes('spin', {
  from: [rotate(unit.deg(0))],
  to: [rotate(unit.deg(360))],
});

export const spinner = craftStyles('spinner', {
  root: [
    ...animate(spin, {
      duration: unit.ms(800),
      easing: easing.linear,
      iterations: 'infinite',
    }),
  ],
});
```

`keyframes(name, steps)` returns a **token**; `animate(token, options)` plays
it. An animation cannot point at keyframes that do not exist. The steps are
`from`, `to` or percentages, and each step holds declarations from the
generated table.

`animate` writes longhands (`animation-name`, `animation-duration`, …), so a
variant can change the duration alone. It is not called `animation` because
that name is the generated shorthand helper.

## Transitions

```ts
import { prop, transitions } from '@craft-ts/style';

export const button = craftStyles('button', {
  root: [
    ...transitions([prop.backgroundColor, prop.color], {
      duration: unit.ms(150),
      easing: easing.easeOut,
    }),
  ],
});
```

The properties are named from the table (`prop.backgroundColor`). There is no
`all`: `transition: all` animates whatever a later variant happens to change,
layout included, and nobody decided that.

`easing` holds the keywords (`linear`, `ease`, `easeIn`, `easeOut`,
`easeInOut`, `stepStart`, `stepEnd`) and two constructors,
`easing.cubicBezier(x1, y1, x2, y2)` and `easing.steps(count, position)`.

## Reduced motion

You write none of it. Under `prefers-reduced-motion: reduce`, the
[global foundation](./foundation.md) collapses every animation and transition
of the document to an instant.
