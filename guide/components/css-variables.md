---
url: https://craft-ts.github.io/craft/guide/components/css-variables.md
---
# Typed CSS variables

A component's styling API is a set of **typed custom properties** declared with
[`cssVars`](../style/define.md#the-theme) in its sheet. Each one has a kind — a
colour, a length, a percentage — and a typed initial value, registered with
`@property`. None is "required": a variable nobody sets keeps its initial value,
and one nobody reads is reported by the architecture rule `no-dangling-css-vars`.

```ts
import {
  bg,
  color,
  craftStyles,
  cssVars,
  defineStateAxis,
  inlineSize,
  kind,
  p,
  palette,
  radius,
  set,
  space,
  unit,
  when,
} from '@craft-ts/style';

const inherited = { inherits: true };

/** The card's public variables. Each has a typed initial value. */
export const cardVars = cssVars('tokenCard', {
  ink: kind.color(palette.text.strong, inherited),
  bg: kind.color(palette.surface.raised, inherited),
  radius: kind.length(unit.px(16), inherited),
});

/** A caller picks a look; without one, every variable keeps its initial value. */
export const cardLook = defineStateAxis('cardLook', ['alert']);

export const card = craftStyles('tokenCard', {
  root: [
    p(space(4)),
    color(cardVars.ink),
    bg(cardVars.bg),
    radius(cardVars.radius),
    when(cardLook.alert, [
      set(cardVars.ink, palette.accent.danger),
      set(cardVars.bg, palette.surface.sunken),
    ]),
  ],
});

/** A panel exposes its own variable and forwards it to the card inside it. */
export const panelVars = cssVars('cardPanel', {
  ink: kind.color(palette.accent.info, inherited),
});

export const panel = craftStyles('cardPanel', {
  root: [p(space(4)), set(cardVars.ink, panelVars.ink)],
});

/** A registered percentage, written at runtime and interpolable. */
export const meterVars = cssVars('cardMeter', {
  value: kind.percentage(unit.pct(0)),
});

export const meter = craftStyles('cardMeter', {
  fill: [inlineSize(meterVars.value), bg(cardVars.ink)],
});
```

```ts
import { article, craftComponent, div, type Input } from '@craft-ts/component';
import { state } from '@craft-ts/core';
import { assign, unit } from '@craft-ts/style';
import { card, meter, meterVars, panel } from './card.style';

const Card = craftComponent(
  'Card',
  {},
  (props: { readonly progress: Input<number> }) =>
    article({ class: card.root }, [
      'Card',
      div({
        class: meter.fill,
        style: function* () {
          return assign(meterVars.value, unit.pct(yield* props.progress()));
        },
      }),
    ]),
);

const Page = craftComponent('Page', {}, function* () {
  const alertProgress = yield* state('alertProgress', 20);
  const panelProgress = yield* state('panelProgress', 80);
  return [
    // Per instance: a variant sets the variables it changes.
    Card({ progress: alertProgress, 'data-cardLook': 'alert' }),
    // Forwarded: the panel's variable becomes the card's ink.
    div({ class: panel.root }, [Card({ progress: panelProgress })]),
  ];
});
```

## Per instance: a variant sets what it changes

A caller does not hand a component raw values. It picks a variant — here
`data-cardLook` — and the sheet sets the variables that variant changes with
`set(...)`. The others keep their initial value. The set of looks is therefore
closed and enumerable, which is what lets the [visual matrix](/guide/style/variants)
capture every one of them.

## Inherited: a parent sets, descendants read

`{ inherits: true }` is for a variable set once on a wrapper and read below it —
a theme, or a card that tints whatever it contains. The default, `false`, is for
a variable an element both sets and reads on itself.

## Forwarded: a parent re-exposes a child's variable

A parent that wants its own API writes `set(child, parent)`: the panel above
declares `panelVars.ink` and forwards it to `cardVars.ink`. A caller overrides
the panel's variable in its own sheet, and the card follows without the panel
knowing how the card is built.

## At runtime: `assign`

A value known only at runtime — a progress, a position, a colour picked by the
user — is written on the element with `assign(variable, value)`, the only thing
`style:` accepts. The sheet reads it like any other variable. Because the
variable is registered with its kind, the browser can interpolate it: a
`transition` on `width` driven by a percentage variable animates.

## `@property` is emitted, not written

Every variable declared with `cssVars` is emitted as an `@property` block by the
build plugin, with its syntax, its `inherits` flag and its initial value. You
never write one by hand. Two rules follow from the registration:

- an initial value must be computationally independent — `unit.px(16)`, not
  `unit.rem(1)` — or the browser drops the whole registration; the architecture
  suite catches it;
- a prefix belongs to one sheet: `cssVars` throws when two sheets declare the
  same prefix.
