---
name: flow-diagram-style
description: Draw system/architecture flow diagrams in the house style (left-to-right, role-colored flat boxes, dashed monospace-titled groups, thin gray orthogonal edges with inline verb labels). Use whenever asked for a flow, architecture, pipeline or system diagram, including ones headed for draw.io, LeanIX, Confluence, slides or Teams.
---

# Flow diagrams in the house style

You write a short **YAML spec** describing *what* is in the diagram. The
renderer decides *how* it looks and *where* things go. Never write coordinates,
colors, fonts, SVG, Mermaid or draw.io XML yourself.

## How the spec becomes a diagram
Always finish in the interactive tool, `flow-diagram.html` in this skill's folder,
so the user can adjust the diagram before exporting it. Don't produce finished
image files unless they ask for them.

1. **Save the spec** as a `.yaml` file: an existing spec the user points to, else
   `diagrams/<title-in-kebab-case>.yaml` in the current project.
2. **Open it in the tool.** If you can run commands:
   `node <skill>/src/open.mjs diagrams/<name>.yaml`
   This opens the browser with the spec loaded. It needs Node 18+ but no
   `npm install`, and nothing is uploaded. If the browser can't be opened (e.g.
   a remote or cloud session), it prints a link instead: pass it on.
   If you can't run commands, show the YAML in a code block and tell the user to
   open `flow-diagram.html` and paste it in (or use **Open** to load the `.yaml`).
3. **Tell the user what they can do there**, in a line or two:
   - Change the theme, direction and box sizing from the toolbar. Their choices
     are written into the YAML.
   - Use ‹ › to step through the best alternative layouts.
   - Export:
     - **Copy for draw.io** → click a draw.io / LeanIX / Confluence draw.io canvas and press Ctrl+V.
     - **Copy image** → paste into Teams or PowerPoint.
     - **PNG / SVG** → Confluence pages and slides.
   - **Save spec** to keep their edits.
4. **Before changing that diagram again,** ask the user to save over the `.yaml`
   if they edited it in the tool, and work from that file.

Only when the user asks for files (or for automation): run
`npm install --prefix <skill>/src` once, then
`node <skill>/src/flowdiag.mjs diagrams/<name>.yaml out/<name>` → `.svg` + `.drawio`.

## Spec format
```yaml
title: Order Fulfilment       # used for file names
direction: right              # right (default) | down | auto
frame: [1600, 900]            # optional: slide/screen to fit; layout keeps text largest
sizing: role                  # role (default): same role -> same width, all boxes same height
                              # group: same role in same group | all: one size | fit: per label
theme: classic                # classic | tint | teal | mono | okabe | midnight (see themes.png)
layout: 2                     # optional: use the Nth best layout (set by the tool's ‹ › buttons)

groups:
  checkout: {label: Checkout Service}
  fulfil:   {label: Fulfilment}                     # direction: auto (default) | down | right
  workers:  {label: Workers, parent: checkout}      # nesting, max 2 levels

nodes:
  web:  {label: Web App, role: client}
  api:  {label: Order API, role: activity, group: checkout}
  pick: {label: "Pick\nItems", role: member, group: fulfil}   # \n wraps

edges:
  - [web, api, Place Order]       # [from, to, label]
  - [api, fulfil, Start Fulfilment]   # an edge may point at a group
```
Optional per node: `col: 0..n` pins left-to-right column order (only when the
automatic order is wrong). See `example.yaml` / `example.png` for a full one.

## Roles
| role       | use for                                         | look (classic)     |
|------------|-------------------------------------------------|--------------------|
| `client`   | SDK/client/UI that initiates work               | light blue         |
| `service`  | central orchestrator / hub / bus                | purple, white text |
| `member`   | components inside a highlighted subsystem       | light pink         |
| `workflow` | definitions, jobs, handlers listed as a family  | dark slate, white  |
| `activity` | the units that do the actual work               | gray, white text   |
| `external` | third-party systems outside your control        | green              |
| `storage`  | data stores, queues, APIs that hold/accept data | peach              |
| `core`     | the system of record / final destination        | navy, white text   |

Every node needs a role and every edge a label; the renderer rejects specs without them.
At most ~6 roles per diagram; one role = one meaning.

## Themes
Colour never changes meaning: the role decides the slot, the theme decides the paint.
Leave `theme` out unless the user asks; they can also switch it in the tool.
- `classic` — the reference style (note: white-on-light-purple hub is low contrast)
- `tint` — soft tints + same-hue text, two bold anchors; matches Confluence/Atlassian UI
- `teal` — 2026 trend palette (Transformative Teal family) on warm off-white
- `mono` — greyscale, one indigo accent on the hub, dashed outline = external
- `okabe` — Okabe-Ito hues; safest for colour-blind readers and greyscale printing
- `midnight` — dark canvas for dark slide decks

## Writing rules
- Node labels: Title Case, ≤ 3 words per line; wrap with `\n` beyond ~18 characters.
- Edge labels: short verb phrase in Title Case ("Dispatches Tasks"). Every edge has one.
- One edge per real interaction; draw two edges if both directions matter.
- ≤ ~15 nodes and ≤ ~15 edges; split bigger systems into several diagrams.
- Declare nodes in rough reading order (left to right); the layout respects it when it can.
- Ids are short snake_case and unique across groups and nodes.

## Steering the layout
The renderer tries every combination of direction, group folding, placement and
spacing (16 layouts for a typical spec, more with `direction: auto`) and keeps the
best score: crossings, lines through boxes, bends, label fit, and text size when
fitted into `frame`. A group whose members form a chain may be **folded** (stacked
top-to-bottom inside its box). When the user reports a problem:
- "Almost right" → have them try ‹ › in the tool first; it saves their pick as `layout: N`.
- "Too wide" → `direction: down` on the longest chain group, or `frame: [1200, 900]`.
- "Tangled / crossing lines" → reorder nodes to match the flow; pin `col` on 1–2 nodes.
- "Text overflows" → shorten or `\n`-wrap the label.
- "Wrong colour" → change the role, never add colours.
