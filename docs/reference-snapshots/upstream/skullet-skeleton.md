# Skullet

Smart skeleton states for React, Vue, Svelte, and vanilla JavaScript.

Wrap what you'd render once your data arrives. While it loads, skullet lays that
content out unseen and draws a skeleton over it: a bar for every line of text,
a block for every image, control and button. The skeleton takes exactly the
space the content will, so nothing moves when it arrives.

## Installation

```shell
pnpm i skullet
```

## Usage

### React

Pass your data and render from it. It's loading while `data` is `null`:

```tsx
import { Skeleton } from "skullet/react";

<Skeleton data={user} sample={SAMPLE_USER}>
  {(user) => <Card user={user} />}
</Skeleton>;
```

Or toggle it yourself, with plain children:

```tsx
<Skeleton loading={!user}>
  <Card user={user} />
</Skeleton>
```

| Prop           | Type                     | Description                                                   |
| -------------- | ------------------------ | ------------------------------------------------------------- |
| `data`         | `T \| null \| undefined` | Loading while empty; passed to `children` once it isn't.      |
| `sample`       | `T`                      | Stands in for `data` to draw the very first skeleton.         |
| `loading`      | `boolean`                | Shows the skeleton, even over `data` — say, while refetching. |
| `id`           | `string`                 | Remembers the skeleton's shape across visits under this key.  |
| `label`        | `string`                 | Read to screen readers while loading.                         |
| `skeleton`     | `ReactNode`              | Shown while loading instead of the measured skeleton.         |
| `error`        | `ReactNode`              | Shown instead of the content when set.                        |
| `empty`        | `boolean`                | Shows `emptyMessage`, or the content if there's none.         |
| `emptyMessage` | `ReactNode`              |                                                               |
| `onReveal`     | `() => void`             | Called once content has come in over a skeleton.              |

### Vue

```vue
<template>
  <Skeleton :data="user" :sample="SAMPLE_USER">
    <template #default="{ data }">
      <Card :user="data" />
    </template>
  </Skeleton>
</template>

<script setup>
import { Skeleton } from "skullet/vue";
</script>
```

Slots: `default` (with `{ data }`), `skeleton`, `empty`, `error` (with `{ error }`).
`onReveal` is a `reveal` event.

### Svelte

```svelte
<script>
  import { Skeleton } from "skullet/svelte";
</script>

<Skeleton data={user} sample={SAMPLE_USER}>
  {#snippet children(user)}
    <Card {user} />
  {/snippet}
</Skeleton>
```

Snippets: `children(data)`, `skeleton`, `emptyMessage`, `errorMessage(error)`.
`onReveal` is `onreveal`.

`data` can be a promise: it loads until the promise settles, then shows its
value, or its error. A SvelteKit `load` can return one unawaited, so it streams:

```svelte
<Skeleton data={data.user} sample={SAMPLE_USER}>
  {#snippet children(user)}
    <Card {user} />
  {/snippet}
</Skeleton>
```

### Vanilla

```ts
import { Reveal } from "skullet";

const reveal = new Reveal(document.getElementById("card"), { id: "profile" });

reveal.load(renderCard(SAMPLE_USER));
// once loaded
reveal.show(renderCard(user));
// a later reload: drawn from the card last shown
reveal.load();
```

### Suspense (React and Vue)

A Suspense boundary whose fallback is a measured skeleton:

```tsx
import { SkeletonSuspense } from "skullet/react";

<SkeletonSuspense skeleton={<Quote quote={SAMPLE_QUOTE} />}>
  <LoadedQuote /> {/* calls use(promise) */}
</SkeletonSuspense>;
```

Vue's wraps `<Suspense>`, with the sample in the `skeleton` slot:

```vue
<SkeletonSuspense>
  <LoadedQuote />
  <template #skeleton>
    <Quote :quote="SAMPLE_QUOTE" />
  </template>
</SkeletonSuspense>
```

### Web component

For plain HTML, or a framework without a wrapper:

```html
<skullet-reveal id="profile" loading label="Loading profile">
  <div class="card">…sample markup…</div>
</skullet-reveal>

<script type="module">
  import "skullet/element";

  document.getElementById("profile").show(await renderProfile());
</script>
```

With `loading`, its children are measured into a skeleton; `show()` reveals the
content, and a `reveal` event follows. Its `id` keys its remembered shape.

## Provider

`SkulletProvider` sets skullet up for everything inside it, per render — so a
nonce can differ per request. React, Vue and Svelte each export one.

```tsx
import { SkulletProvider } from "skullet/react";

<SkulletProvider
  nonce={nonce} // on the inline script and stylesheets, for a Content Security Policy
  mode="system" // or "light" / "dark"
  theme={theme} // below
  text={{ top: "ascender", bottom: "descender" }} // where each line of text is drawn
  reveal="smart" // or "together" / "sequence" / "sweep"
  debug // the overlay, below
>
  <App />
</SkulletProvider>;
```

### Theming

A theme is colours for light and dark, plus how skeletons look and move:

```ts
const theme = {
  light: { base: "rgb(0 0 0 / 0.07)", highlight: "rgb(255 255 255 / 0.6)" },
  dark: {
    base: "rgb(255 255 255 / 0.08)",
    highlight: "rgb(255 255 255 / 0.1)",
  },
  animation: "shimmer", // "group-shimmer", "pulse" or "none"
  speed: "slow", // or "fast" — shimmer 4s / 2s, pulse 2.4s / 1.2s
  radius: "6px", // lines of text and boxes; images and chips keep their own
  text: { top: "ascender", bottom: "descender" },
};
```

- `speed` is set per animation: a shimmer loops in 4s or 2s, a pulse in 2.4s
  or 1.2s. A shimmer keeps the pace it has across a 1280px screen on any
  width, so a wide monitor doesn't make it race.
- `shimmer` sweeps one highlight across the whole page; `group-shimmer` gives
  each skeleton a sweep of its own; `pulse` fades every skeleton softly in and out.
  Each keeps one phase across the page.
- Every option is a custom property underneath — `--skullet-base`,
  `--skullet-highlight`, `--skullet-radius`, `--skullet-animation`, `--skullet-speed`,
  `--skullet-text-top` and `--skullet-text-bottom` — so any part of a page can set
  its own, and plain CSS can set them without a provider. Vanilla JavaScript
  has `applyTheme(theme, mode)`, and `themeVariables(theme, mode)` returns
  them for a style attribute.

The docs have a theme creator to try them in.

### Lines of text

Each line of text gets a bar between two of the type's own lines, measured
from the font: a top of `ascender`, `cap-height` or `x-height`, and a bottom of
`baseline` or `descender`. The default, `ascender` to `descender`, takes in
hanging letters like g, p and y.

```tsx
<SkulletProvider text={{ top: "x-height", bottom: "baseline" }}>
```

Or in CSS, anywhere — they're inherited, so a section can differ:

```css
.compact {
  --skullet-text-top: x-height;
  --skullet-text-bottom: baseline;
}
```

### Reveals

How content replaces its skeleton, set with `reveal` on the provider:

- `together` crossfades skeleton and content whole.
- `sequence` brings each piece in where its skeleton was, top to bottom.
- `sweep` carries the content in behind one diagonal front at the shimmer's
  slant and pace — giving way to a crossfade for a reveal over about a screen
  and a half, or if frames drop mid-way.
- `smart` (the default) decides for each reveal as it lands: at once for
  someone mid-gesture or a load under 150ms (a skeleton is held back that long,
  so a fast load never flashes one); a quick crossfade for a refetch; whole for
  something small; otherwise in sequence — rows and cards as units, in screen
  order, smaller text a beat behind, off-screen content at once.

Or pass a `RevealSpec` of your own: an order, an entrance, a wipe, timing. The
built-ins are written with it, and exported to build on.

### Accessibility

A loading reveal is `aria-busy`; its skeleton is hidden from screen readers
and `inert`, server-rendered too. Pass `label` to have something read in its
place: `label="Loading profile"`. Everything holds still under
`prefers-reduced-motion`.

### Debugging

Pass `debug` to the provider, or add `?skullet-debug` to the URL: every reveal
is outlined with where its skeleton came from, then whether the content moved
anything when it arrived. Its x-ray shows the content each skeleton was
measured from.

## Where the skeleton's shape comes from

Skullet uses the best it has, in this order:

1. The data on screen, when you force `loading` over it.
2. The data it last showed under the same `id`, so a reload is exact.
3. The shape remembered from a previous visit.
4. Your `sample`.
5. Plain children, rendered without their data.
6. A few generic lines, with a warning in development.

In development, skullet warns when a skeleton and its content differ in size,
and when data-driven content has no `sample` it logs one for you to paste, with
your data's keys and lengths and every value replaced.

Remembered shapes keep layout, never content: text is replaced with filler,
and media sources and form values are dropped. Clear them on sign-out:

```ts
import { forgetShapes } from "skullet";

forgetShapes();
```

## Hints

- `skullet-block` draws an element as one block.
- `skullet-ignore` draws nothing for an element.
- In React, a component with a static `Skeleton` is rendered as that instead:

```tsx
Avatar.Skeleton = () => <SkeletonBox width={40} height={40} radius="50%" />;
```

## Placeholder boxes

```tsx
import { SkeletonBox } from "skullet/react";

<SkeletonBox width="60%" height="1em" radius="0.25em" />;
```

Numbers are read as pixels. In vanilla JavaScript, `createSkeletonBox(options)`
returns the element.

## Server rendering

A server-rendered skeleton is measured before the page first paints: a small
inline script follows each one, so the first paint already shows the skeleton —
no flash of content, and no change when the page hydrates. With JavaScript
off, each line of text is struck through with a bar instead.

On React 19 the stylesheet is rendered into the page for you. With anything
else, import it once:

```ts
import "skullet/styles.css";
```

## Testing

Skullet runs in jsdom and happy-dom. With no layout there's nothing to
measure, so every reveal is instant and content is in the document as soon as
its data is. While loading, the sample's text sits in an `aria-hidden`
skeleton: query by role, which skips it, rather than by text.

## Notes

- Every skeleton on the page shimmers in one stream, however late it mounts.
- An image never holds anything else back: each one still loading keeps a skeleton
  of its own until it has loaded and decoded, then the two crossfade.
- Fades and the shimmer respect `prefers-reduced-motion`.
- Give images a size (`width` and `height`, or an `aspect-ratio`); one that only
  gets it on load moves once it does, and the development warning names it.
- Under a `SkulletProvider`, the server-render script is sent once a page; without
  one, every skeleton carries its own copy.
