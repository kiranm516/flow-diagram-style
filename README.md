# flow-diagram-style

An [agent skill](https://agentskills.io) for Claude and GitHub Copilot that
draws system, architecture and pipeline diagrams in one consistent house style:
left-to-right flow, flat boxes coloured by role, dashed groups with monospace
titles, and thin orthogonal edges with inline verb labels.

You (or your AI assistant) describe **what** is in the diagram in a short YAML
spec. The renderer decides **how** it looks and **where** everything goes, then exports
SVG, PNG, or an editable draw.io diagram (works in draw.io, LeanIX and
Confluence).

![Example diagram](example.png)

## Why

- **Consistent:** every diagram uses the same roles, colours, fonts and spacing,
  no matter who (or which model) wrote it.
- **No hand layout:** the engine (built on [ELK](https://eclipse.dev/elk/))
  tries many layouts and keeps the one with the fewest crossings, the fewest
  lines through boxes and labels, and the largest readable text.
- **Editable output:** the draw.io export contains real shapes and connectors,
  so you can tweak the result instead of redrawing it.
- **Works offline:** `flow-diagram.html` is a single file with everything
  embedded. Nothing is uploaded, and it runs fine where code execution is
  blocked.

## Example

This spec produced the diagram above:

```yaml
title: Temporal Connector Sync
direction: right

groups:
  connector: {label: Connector Namespace}
  workflows: {label: Connector Workflows, parent: connector}
  front:     {label: Front Namespace}

nodes:
  tclient:    {label: Temporal Client, role: client, group: connector}
  slack:      {label: SlackSyncWorkflow, role: workflow, group: workflows}
  activities: {label: Connector Activities, role: activity, group: connector}
  temporal:   {label: Temporal Service, role: service}
  external:   {label: External APIs, role: external}
  gcs:        {label: Google Cloud Storage, role: storage}
  core:       {label: Core System, role: core}
  # ...

edges:
  - [tclient, temporal, Launches Workflows]   # [from, to, label]
  - [temporal, workflows, Dispatches Tasks]   # an edge may point at a group
  - [external, activities, Fetch Data]
  - [activities, gcs, Store Data]
  # ...
```

The full file is [`example.yaml`](example.yaml).

### Themes

Roles decide what a box means; the theme only decides the paint. Six themes are
built in: `classic`, `tint`, `teal`, `mono`, `okabe` (safe for colour-blind
readers) and `midnight` (dark).

![The six themes](themes.png)

## Installation

Pick a skills folder for your assistant:

| Assistant      | Just for you (every project) | For one project (shared with the team) |
|----------------|------------------------------|----------------------------------------|
| Claude Code    | `~/.claude/skills/`          | `.claude/skills/`                      |
| GitHub Copilot | `~/.copilot/skills/`         | `.github/skills/`                      |

Copilot also reads the Claude folders, so if you use both assistants, one copy
in a Claude folder serves both. Copilot uses the skill in VS Code agent mode, the
Copilot CLI and the Copilot cloud agent.

### Just for you

Clone the repo, so you can update it with `git pull` later:

```bash
git clone https://github.com/kiranm516/flow-diagram-style.git ~/.claude/skills/flow-diagram-style
```

### For one project

Copy the files in without the repo's git history. A plain clone would create a
repo inside your repo, which git doesn't commit properly: teammates, and
Copilot's cloud agent, would get an empty folder.

```bash
git clone --depth 1 https://github.com/kiranm516/flow-diagram-style.git .claude/skills/flow-diagram-style
rm -rf .claude/skills/flow-diagram-style/.git
git add .claude/skills/flow-diagram-style && git commit -m "Add flow-diagram-style skill"
```

### Optional: rendering files

The default flow (opening the HTML tool) needs only Node 18+. If you also
want the assistant to write `.svg` and `.drawio` files directly, install the
renderer's dependencies once:

```bash
npm install --prefix ~/.claude/skills/flow-diagram-style/src
```

Don't commit `src/node_modules` in a project install. Each person runs this
themselves.

### Claude apps (claude.ai, desktop)

Zip the repo folder (without `src/node_modules`) and upload it under
**Settings → Capabilities → Skills**.

### Without an assistant

Open [`flow-diagram.html`](flow-diagram.html) in any browser. No install needed.

## Updating

Your diagrams live in your own projects (`diagrams/*.yaml`), not in the skill
folder, so updating never touches them.

**Just for you** (cloned):

```bash
git -C ~/.claude/skills/flow-diagram-style pull
```

**For one project** (copied): replace the folder with a fresh copy and commit it.

```bash
rm -rf .claude/skills/flow-diagram-style
git clone --depth 1 https://github.com/kiranm516/flow-diagram-style.git .claude/skills/flow-diagram-style
rm -rf .claude/skills/flow-diagram-style/.git
git add -A .claude/skills/flow-diagram-style && git commit -m "Update flow-diagram-style skill"
```

**Claude apps:** download the latest version, zip it again, and upload it under
**Settings → Capabilities → Skills**, replacing the old one.

**Afterwards:**
- If you installed the rendering dependencies, run the `npm install --prefix …/src`
  command again in case they changed.
- Start a new assistant session so it reads the new `SKILL.md`.
- If you keep a copy of `flow-diagram.html` elsewhere (bookmarked, or shared on
  a drive), replace it with the new one. Your last spec in the browser is kept
  as long as the file stays at the same path.

## Usage

### Ask your assistant

Once the skill is installed, ask Claude or Copilot (in agent mode) for a diagram
in plain words:

> Draw an architecture diagram of our checkout flow: the web app calls the Order
> API, which publishes to Kafka; the fulfilment workers consume it and write to
> Postgres. I need it in Confluence.

The assistant saves the spec as a `.yaml` file (by default under `diagrams/`)
and opens it in the HTML tool, so you decide the final look before exporting.
If it can't run commands, it gives you the spec to paste into the tool instead.
The tool is where you take over:

```text
 assistant writes            browser opens               you adjust                 you export
 diagrams/checkout.yaml  ->  flow-diagram.html#spec=…  ->  theme, direction,      ->  draw.io, PNG,
                                                           layout, the YAML itself     SVG, image
                                                                  |
                                                     Save spec -> back into diagrams/checkout.yaml
```

To change the diagram later, save your edits over the `.yaml` first. The
assistant then works from your version.

### The HTML tool

Open `flow-diagram.html` directly, or with a spec preloaded:

```bash
node src/open.mjs diagrams/checkout.yaml          # opens your browser
node src/open.mjs diagrams/checkout.yaml --print  # just prints the link
```

`open.mjs` needs only Node 18+, with no `npm install`. The spec travels inside
the link itself, so nothing is uploaded and no server is involved.

| Control                  | What it does                                                             |
|--------------------------|--------------------------------------------------------------------------|
| Editor (left)            | Edit the YAML; the diagram re-renders as you type (or Ctrl/Cmd + Enter)  |
| Open / drag a file       | Load a `.yaml` spec                                                      |
| Save spec                | Download the current spec as `.yaml`                                     |
| Copy link                | Copy a link containing the spec (see below)                              |
| Theme, direction, sizing | Restyle or re-lay out; your choice is written into the YAML              |
| ‹ Layout n/6 ›           | Step through the best alternative layouts; your pick is saved as `layout: n` |
| Copy for draw.io         | Click a draw.io, LeanIX or Confluence draw.io canvas and press Ctrl+V    |
| Copy image               | Paste into Teams, PowerPoint or a Confluence page                        |
| PNG / SVG                | Download an image (PNG is 2× for sharp slides)                           |
| .drawio                  | Download a file for File → Import in draw.io                             |
| Actual size              | Toggle between fit-to-window and 100%                                    |

Your last spec and theme are remembered in the browser. A link from
**Copy link** points at the tool on your machine. To share a diagram with
someone else, send them the link; they paste it into the editor of their own
copy of `flow-diagram.html`, and it loads.

### Command line

For automation, or when you want files without the browser:

```bash
npm install --prefix src   # once
node src/flowdiag.mjs diagrams/checkout.yaml out/checkout
# -> out/checkout.svg, out/checkout.drawio
```

Add `--report` to print the scores of the runner-up layouts.

## Spec reference

| Key         | Values                                                      | Default |
|-------------|-------------------------------------------------------------|---------|
| `title`     | Diagram name, used for file names                           |         |
| `direction` | `right`, `down`, `auto` (tries both)                         | `right` |
| `frame`     | `[width, height]` to fit, e.g. a slide                      | `[1600, 900]` |
| `sizing`    | `role` (same role, same width), `group`, `all`, `fit`        | `role`  |
| `theme`     | `classic`, `tint`, `teal`, `mono`, `okabe`, `midnight`       | `classic` |
| `layout`    | Use the Nth best layout (set by the tool's ‹ › buttons)     | `1`     |
| `groups`    | `id: {label, parent?, direction?}`; nesting up to 2 levels  |         |
| `nodes`     | `id: {label, role, group?, col?}`; `\n` in a label wraps it  |         |
| `edges`     | `[from, to, Label]`; `from` and `to` may be groups           |         |

Every node needs a `role` and every edge needs a label:

| Role       | Use for                                          |
|------------|--------------------------------------------------|
| `client`   | SDK, client or UI that starts the work           |
| `service`  | Central orchestrator, hub or bus                 |
| `member`   | Components inside a highlighted subsystem        |
| `workflow` | Definitions, jobs or handlers in a family        |
| `activity` | Units that do the actual work                    |
| `external` | Third-party systems outside your control         |
| `storage`  | Data stores, queues, APIs that hold data         |
| `core`     | System of record or final destination            |

[`SKILL.md`](SKILL.md) has the writing rules and tips for steering the layout
(for example, what to change when a diagram is too wide or its lines cross).

## Development

```text
SKILL.md              instructions the assistant reads
example.yaml          example spec (also the HTML tool's starting content)
flow-diagram.html     built offline tool (generated, but committed)
src/engine.mjs        layout search, scoring, SVG and draw.io output
src/flowdiag.mjs      command-line renderer
src/open.mjs          opens the HTML tool with a spec preloaded
src/tool.template.html  HTML tool source
src/build.mjs         bundles the template, engine, libraries and fonts
src/test.mjs          layout regression test; fixtures in src/test/
```

```bash
cd src
npm install
npm test              # compare layout scores with src/test/scores.json
npm run build         # rebuild ../flow-diagram.html
```

The HTML tool's "Spec reference" panel is copied from the YAML block in
`SKILL.md` at build time, so edit it there and rebuild.

If you change layout or scoring on purpose, render the test specs and look at
them, then accept the new scores with `node test.mjs --update`. To try other
score weights without editing code, set `FLOWDIAG_WEIGHTS`, for example
`FLOWDIAG_WEIGHTS='{"detour":0.05}' node flowdiag.mjs spec.yaml out`.
