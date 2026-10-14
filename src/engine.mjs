// flowdiag engine — runs in the browser and in Node. No imports: dependencies are injected.
//   const eng = createEngine({ ELK, measure });
//   const { best, alts, report } = await eng.layout(spec);   // alts: top distinct layouts, best first
//   eng.toSVG(best, { fontCSS })  -> SVG string (house style)
//   eng.toDrawio(best)            -> .drawio file (mxfile XML, editable shapes)
//   eng.toDrawioModel(best)       -> <mxGraphModel> only (paste into draw.io / LeanIX)
//
// Pipeline: spec -> ELK graph (labels NOT given to ELK) -> search over layouts
// (direction, folded groups, placement, spacing) -> place labels ourselves -> score -> best.

// Role -> corner radius. The role list itself; colours live in THEMES.
export const ROLES = { client: 6, service: 6, member: 6, workflow: 6, activity: 2, external: 2, storage: 2, core: 6 };

// ---------- colour themes ----------
// Each theme: canvas colours + one entry per role {fill, text, stroke?, dash?, r}.
// Rule of thumb used throughout: tinted fill + same-hue dark text, or bold fill + white text;
// at most two bold "anchors" (service = hub, core = destination) so the eye lands there first.
const mk = (canvas, roles) => ({ canvas, roles: Object.fromEntries(Object.entries(roles).map(([k, v]) => [k, { r: ROLES[k], ...v }])) });
export const THEMES = {
  classic: mk({ bg: "#FFFFFF", edge: "#6B7280", edgeText: "#374151", groupStroke: "#9CA3AF", groupText: "#111827" }, {
    client:   { fill: "#DCEEFB", text: "#111827" },
    service:  { fill: "#A78BFA", text: "#FFFFFF" },
    member:   { fill: "#FCE4EC", text: "#111827" },
    workflow: { fill: "#3E5577", text: "#FFFFFF" },
    activity: { fill: "#6B6B6B", text: "#FFFFFF" },
    external: { fill: "#5BD075", text: "#111827" },
    storage:  { fill: "#FBC59A", text: "#111827" },
    core:     { fill: "#1F3557", text: "#FFFFFF" },
  }),
  // Atlassian/Radix-style: soft tints, same-hue text and hairline border; two bold anchors.
  tint: mk({ bg: "#FFFFFF", edge: "#626F86", edgeText: "#44546F", groupStroke: "#B3B9C4", groupText: "#172B4D" }, {
    client:   { fill: "#E9F2FF", text: "#09326C", stroke: "#85B8FF" },
    service:  { fill: "#6E5DC6", text: "#FFFFFF" },
    member:   { fill: "#FFECF8", text: "#50253F", stroke: "#F797D2" },
    workflow: { fill: "#F3F0FF", text: "#352C63", stroke: "#B8ACF6" },
    activity: { fill: "#F1F2F4", text: "#2C3E5D", stroke: "#B3B9C4" },
    external: { fill: "#DCFFF1", text: "#164B35", stroke: "#7EE2B8" },
    storage:  { fill: "#FFF3EB", text: "#702E00", stroke: "#FEC195" },
    core:     { fill: "#172B4D", text: "#FFFFFF" },
  }),
  // 2026 trend palette: WGSN/Coloro Transformative Teal + Wax Paper, Fresh Purple, Cocoa, Green Glow,
  // on a Pantone "Cloud Dancer"-style warm off-white canvas.
  teal: mk({ bg: "#F0EEE9", edge: "#6E6760", edgeText: "#3F3A35", groupStroke: "#B5ADA3", groupText: "#2B2420" }, {
    client:   { fill: "#F6EDCB", text: "#3B3220", stroke: "#DCCB92" },
    service:  { fill: "#6B3FA0", text: "#FFFFFF" },
    member:   { fill: "#D3EAE7", text: "#0B3B3C", stroke: "#8FC6C0" },
    workflow: { fill: "#0F5E63", text: "#FFFFFF" },
    activity: { fill: "#6B4A3E", text: "#FFFFFF" },
    external: { fill: "#D4EC7A", text: "#253005" },
    storage:  { fill: "#F0D5C6", text: "#4A2214", stroke: "#DDA98C" },
    core:     { fill: "#0B2E33", text: "#FFFFFF" },
  }),
  // Linear/Vercel-style monochrome: role shown by shade, one accent for the hub, dashed = outside.
  mono: mk({ bg: "#FFFFFF", edge: "#71717A", edgeText: "#3F3F46", groupStroke: "#A1A1AA", groupText: "#18181B" }, {
    client:   { fill: "#F4F4F5", text: "#18181B", stroke: "#D4D4D8" },
    service:  { fill: "#4F46E5", text: "#FFFFFF" },
    member:   { fill: "#FFFFFF", text: "#18181B", stroke: "#A1A1AA" },
    workflow: { fill: "#27272A", text: "#FAFAFA" },
    activity: { fill: "#52525B", text: "#FFFFFF" },
    external: { fill: "#FFFFFF", text: "#3F3F46", stroke: "#71717A", dash: true },
    storage:  { fill: "#E4E4E7", text: "#18181B" },
    core:     { fill: "#09090B", text: "#FFFFFF" },
  }),
  // Okabe-Ito hues (colour-vision-deficiency safe), as tints with the pure hue as border.
  okabe: mk({ bg: "#FFFFFF", edge: "#666666", edgeText: "#333333", groupStroke: "#999999", groupText: "#1A1A1A" }, {
    client:   { fill: "#DDF0FB", text: "#0B3A57", stroke: "#56B4E9" },
    service:  { fill: "#0072B2", text: "#FFFFFF" },
    member:   { fill: "#F7E6F0", text: "#5A2343", stroke: "#CC79A7" },
    workflow: { fill: "#00785A", text: "#FFFFFF" },
    activity: { fill: "#4D4D4D", text: "#FFFFFF" },
    external: { fill: "#FAF5C2", text: "#3D3800", stroke: "#C9BC1C" },
    storage:  { fill: "#FBEBCB", text: "#5C3F00", stroke: "#E69F00" },
    core:     { fill: "#B34E00", text: "#FFFFFF" },
  }),
  // Dark canvas for slides / dark-mode decks.
  midnight: mk({ bg: "#0E1117", edge: "#8B95A7", edgeText: "#C9D1D9", groupStroke: "#3B4252", groupText: "#E6EDF3" }, {
    client:   { fill: "#16263D", text: "#DCEBFF", stroke: "#3B82F6" },
    service:  { fill: "#6A4BE0", text: "#FFFFFF" },
    member:   { fill: "#2E1A2A", text: "#FBE3F1", stroke: "#E879B9" },
    workflow: { fill: "#1F2B3D", text: "#E6EDF3", stroke: "#4B6B9A" },
    activity: { fill: "#2D333B", text: "#E6EDF3", stroke: "#545D68" },
    external: { fill: "#0F2E24", text: "#D1FAE5", stroke: "#34D399" },
    storage:  { fill: "#33240F", text: "#FDEBC8", stroke: "#F59E0B" },
    core:     { fill: "#E6EDF3", text: "#0E1117" },
  }),
};
export function themeOf(name) {
  const t = THEMES[String(name || "classic").toLowerCase()];
  if (!t) throw new Error(`unknown theme "${name}" (use ${Object.keys(THEMES).join(", ")})`);
  return t;
}

export const THEME = {
  sans: "Inter", mono: "JetBrains Mono",
  sansStack: "Inter, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  monoStack: "'JetBrains Mono', Consolas, 'DejaVu Sans Mono', Menlo, monospace",
  nodeSize: 17, labelSize: 14.5, groupSize: 16, corner: 10,
};
const SZ = { padX: 28, padY: 18, minW: 170, minH: 64, lineH: 23, groupTop: 54, groupPad: 26, labelH: 20 };

// Approximate Inter widths; the browser build passes a real canvas measure instead.
export function approxMeasure(s, size, kind) {
  if (kind === "mono") return [...s].length * 0.6 * size;
  let w = 0;
  for (const c of s) {
    if ("iljI|.,:;'!".includes(c)) w += 0.28;
    else if ("ftr ".includes(c)) w += 0.36;
    else if ("mwMW".includes(c)) w += 0.86;
    else if (c >= "A" && c <= "Z") w += 0.68;
    else w += 0.56;
  }
  return w * size;
}

// Layout score weights (lower total wins). detour = path length beyond the straight
// Manhattan distance between an edge's ends, i.e. how far it wanders around the diagram.
export const WEIGHTS = { crossings: 30, through: 80, bends: 2.5, length: 1 / 300, detour: 0.02, fit: 200, titleHits: 60 };

export function createEngine({ ELK, measure = approxMeasure, weights = {} }) {
  const K = { ...WEIGHTS, ...weights };
  const T = THEME;
  const lines = (s) => String(s).split("\n");
  const sansW = (s, size) => measure(s, size, "sans");
  const titleW = (s) => measure(s, T.groupSize, "mono");
  const labelW = (s) => Math.round(sansW(s, T.labelSize) + 16);
  const titleRect = (g) => ({ x: g.x + (g.titleDx ?? 14), y: g.y + 20, w: titleW(g.title) + 12, h: 24 });
  // Slide each group title along the top border to the leftmost spot no edge crosses.
  function placeTitles(E, groups) {
    const S = E.flatMap((e) => segs(e.pts));
    for (const g of groups) {
      const w = titleW(g.title) + 12;
      for (let dx = 14; dx + w + 14 <= g.width; dx += 10) {
        g.titleDx = dx;
        if (!S.some((sg) => segHitsRect(sg, titleRect(g)))) break;
      }
      if (S.some((sg) => segHitsRect(sg, titleRect(g)))) g.titleDx = 14;
    }
  }

  // ---------- spec helpers ----------
  function validate(spec) {
    if (!spec || typeof spec !== "object") throw new Error("spec must be a YAML mapping");
    themeOf(spec.theme);
    const ids = new Set();
    for (const id of Object.keys(spec.groups || {})) ids.add(id);
    for (const id of Object.keys(spec.nodes || {})) { if (ids.has(id)) throw new Error(`id "${id}" used for both a group and a node`); ids.add(id); }
    for (const [id, n] of Object.entries(spec.nodes || {})) {
      if (n.group && !spec.groups?.[n.group]) throw new Error(`node "${id}": unknown group "${n.group}"`);
      if (!n || typeof n !== "object") throw new Error(`node "${id}": expected {label, role}`);
      if (!ROLES[n.role]) throw new Error(`node "${id}": ${n.role ? `unknown role "${n.role}"` : "missing role"} (use ${Object.keys(ROLES).join(", ")})`);
    }
    for (const [id, g] of Object.entries(spec.groups || {})) if (g.parent && !spec.groups[g.parent]) throw new Error(`group "${id}": unknown parent "${g.parent}"`);
    return normEdges(spec).map((e) => {
      if (!ids.has(e.from) || !ids.has(e.to)) throw new Error(`edge ${e.from} -> ${e.to}: unknown id`);
      if (!e.label.trim()) throw new Error(`edge ${e.from} -> ${e.to}: missing label (use [from, to, Verb Phrase])`);
      return e;
    });
  }
  function normEdges(spec) {
    return (spec.edges || []).map((e, i) => {
      const [from, to, label] = Array.isArray(e) ? e : [e.from, e.to, e.label];
      return { i, from: String(from), to: String(to), label: label == null ? "" : String(label) };
    });
  }
  const parentOf = (spec, id) => spec.nodes?.[id] ? (spec.nodes[id].group || null) : (spec.groups?.[id]?.parent || null);
  const isLeafGroup = (spec, g) => !Object.values(spec.groups || {}).some((x) => x.parent === g);
  function foldCandidates(spec, edges) {
    return Object.keys(spec.groups || {}).filter((g) => {
      if (!isLeafGroup(spec, g)) return false;
      if (String(spec.groups[g].direction || "auto").toLowerCase() !== "auto") return false;
      return edges.some((e) => parentOf(spec, e.from) === g && parentOf(spec, e.to) === g);
    });
  }
  const perp = (d) => (d === "RIGHT" ? "DOWN" : "RIGHT");

  // ---------- spec -> ELK ----------
  function rootOptions(cfg) {
    const o = {
      "elk.algorithm": "layered", "elk.direction": cfg.direction,
      "elk.hierarchyHandling": "INCLUDE_CHILDREN", "elk.edgeRouting": "ORTHOGONAL",
      "elk.json.edgeCoords": "ROOT", "elk.json.shapeCoords": "ROOT",
      "elk.layered.nodePlacement.strategy": cfg.placement,
      "elk.layered.considerModelOrder.strategy": cfg.modelOrder,
      "elk.layered.thoroughness": "25",
      "elk.layered.spacing.nodeNodeBetweenLayers": String(cfg.layerGap),
      "elk.layered.spacing.edgeNodeBetweenLayers": "24",
      "elk.layered.spacing.edgeEdgeBetweenLayers": "16",
      "elk.spacing.nodeNode": String(cfg.nodeGap), "elk.spacing.edgeNode": "24", "elk.spacing.edgeEdge": "16",
      "elk.layered.compaction.postCompaction.strategy": "EDGE_LENGTH",
      "elk.separateConnectedComponents": "true",
      "elk.aspectRatio": String(cfg.aspect),
      "elk.padding": "[top=28,left=28,bottom=28,right=28]",
    };
    if (cfg.partition) o["elk.partitioning.activate"] = "true";
    return o;
  }
  // Box sizes. Natural size fits the label; then "similar" nodes are harmonized:
  //   sizing: role  (default) same role -> same width; every box the same height
  //   sizing: group           same role within the same group -> same width; same height
  //   sizing: all             every box the same size
  //   sizing: fit             each box fits its own label
  function nodeSizes(spec) {
    const mode = String(spec.sizing || "role").toLowerCase();
    const snap = (v) => Math.ceil(v / 10) * 10;
    const nat = {};
    for (const [id, nd] of Object.entries(spec.nodes || {})) {
      const ls = lines(String(nd.label ?? id));
      nat[id] = {
        w: snap(Math.max(SZ.minW, Math.max(...ls.map((l) => sansW(l, T.nodeSize))) + 2 * SZ.padX)),
        h: snap(Math.max(SZ.minH, ls.length * SZ.lineH + 2 * SZ.padY)),
        key: mode === "all" ? "*" : mode === "group" ? `${nd.role}|${nd.group || ""}` : mode === "fit" ? id : String(nd.role),
      };
    }
    const maxW = {};
    for (const n of Object.values(nat)) maxW[n.key] = Math.max(maxW[n.key] || 0, n.w);
    const allH = Math.max(0, ...Object.values(nat).map((n) => n.h));
    const out = {};
    for (const [id, n] of Object.entries(nat)) out[id] = { w: maxW[n.key], h: mode === "fit" ? n.h : allH };
    return out;
  }

  function buildGraph(spec, edges, cfg) {
    const groups = spec.groups || {}, nodes = spec.nodes || {};
    const el = {};
    const root = { id: "__root", children: [], edges: [], layoutOptions: rootOptions(cfg) };
    el.__root = root;
    const gdir = {};
    for (const [g, gs] of Object.entries(groups)) {
      const want = String(gs.direction || "auto").toLowerCase();
      gdir[g] = want === "down" ? "DOWN" : want === "right" ? "RIGHT" : cfg.folds.includes(g) ? perp(cfg.direction) : cfg.direction;
    }
    const folded = new Set(Object.keys(groups).filter((g) => gdir[g] !== cfg.direction && isLeafGroup(spec, g)));
    const todo = Object.keys(groups);
    while (todo.length) {
      const before = todo.length;
      for (let k = todo.length - 1; k >= 0; k--) {
        const id = todo[k], g = groups[id];
        const parent = g.parent ? el[g.parent] : root;
        if (!parent) continue;
        const tw = titleW(g.label || id) + 44;
        const n = {
          id, children: [], edges: [], ports: [], kind: "group", title: String(g.label || id), parentId: g.parent || null,
          layoutOptions: {
            "elk.padding": `[top=${SZ.groupTop},left=${SZ.groupPad},bottom=${SZ.groupPad},right=${SZ.groupPad}]`,
            "elk.nodeSize.constraints": "[MINIMUM_SIZE]", "elk.nodeSize.minimum": `(${Math.round(tw)}, 60)`,
            "elk.layered.spacing.nodeNodeBetweenLayers": String(cfg.layerGap),
            "elk.layered.spacing.edgeNodeBetweenLayers": "24",
            "elk.spacing.nodeNode": String(cfg.nodeGap), "elk.spacing.edgeNode": "24", "elk.spacing.edgeEdge": "16",
          },
        };
        if (folded.has(id)) Object.assign(n.layoutOptions, {
          "elk.hierarchyHandling": "SEPARATE_CHILDREN", "elk.direction": gdir[id], "elk.algorithm": "layered",
          "elk.edgeRouting": "ORTHOGONAL", "elk.portConstraints": "FREE",
          "elk.layered.spacing.nodeNodeBetweenLayers": String(Math.round(cfg.layerGap * 0.6)),
        });
        parent.children.push(n); el[id] = n; todo.splice(k, 1);
      }
      if (todo.length === before) throw new Error("group parent cycle");
    }
    const sizes = nodeSizes(spec);
    for (const [id, nd] of Object.entries(nodes)) {
      const role = nd.role;
      const label = String(nd.label ?? id);
      const ls = lines(label);
      const { w, h } = sizes[id];
      const n = { id, width: w, height: h, kind: "node", role, label, parentId: nd.group || null, layoutOptions: {} };
      if (nd.col !== undefined) n.layoutOptions["elk.partitioning.partition"] = String(nd.col);
      (nd.group ? el[nd.group] : root).children.push(n);
      el[id] = n;
    }
    const meta = {};
    const runOf = (id) => { const p = spec.nodes?.[id] ? parentOf(spec, id) : null; return p && folded.has(p) ? p : "__root"; };
    for (const e of edges) {
      const rs = runOf(e.from), rt = runOf(e.to);
      const add = (c, id, s, t, order) => { c.edges.push({ id, sources: [s], targets: [t] }); meta[id] = { orig: e.i, order }; };
      if (rs === rt) { add(el[rs], `e${e.i}`, e.from, e.to, 1); continue; }
      let s = e.from, t = e.to;
      if (rs !== "__root") { const p = `${rs}__o${e.i}`; el[rs].ports.push({ id: p, width: 1, height: 1 }); add(el[rs], `e${e.i}a`, e.from, p, 0); s = p; }
      if (rt !== "__root") { const p = `${rt}__i${e.i}`; el[rt].ports.push({ id: p, width: 1, height: 1 }); add(el[rt], `e${e.i}c`, p, e.to, 2); t = p; }
      add(root, `e${e.i}b`, s, t, 1);
    }
    return { root, meta };
  }

  // ---------- geometry ----------
  function walk(root) {
    const nodes = [], groups = [], raw = [];
    (function rec(n) { for (const e of n.edges || []) raw.push(e); for (const c of n.children || []) { (c.kind === "group" ? groups : nodes).push(c); rec(c); } })(root);
    return { nodes, groups, raw };
  }
  const sectionPts = (e) => (e.sections || []).flatMap((s) => [s.startPoint, ...(s.bendPoints || []), s.endPoint]);
  function simplify(pts) {
    const out = [];
    for (const p of pts) {
      const q = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
      const l = out[out.length - 1];
      if (l && Math.abs(l.x - q.x) < 0.5 && Math.abs(l.y - q.y) < 0.5) continue;
      out.push(q);
    }
    for (let i = out.length - 2; i > 0; i--) {
      const a = out[i - 1], b = out[i], c = out[i + 1];
      if ((Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5) || (Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5)) out.splice(i, 1);
    }
    return out;
  }
  function mergedEdges(laid, meta, edges) {
    const parts = {};
    for (const r of walk(laid).raw) { const m = meta[r.id]; (parts[m.orig] ||= []).push({ order: m.order, pts: sectionPts(r) }); }
    return edges.map((e) => ({ ...e, pts: simplify((parts[e.i] || []).sort((a, b) => a.order - b.order).flatMap((p) => p.pts)) }));
  }
  const segs = (pts) => pts.slice(1).map((p, i) => [pts[i], p]);
  const segLen = ([a, b]) => Math.hypot(b.x - a.x, b.y - a.y);
  function cross([p, q], [r, s]) {
    const d = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
    if (Math.abs(d) < 1e-9) return false;
    const t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / d;
    const u = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d;
    return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
  }
  const rectHit = (a, b, m = 0) => a.x < b.x + b.w + m && a.x + a.w > b.x - m && a.y < b.y + b.h + m && a.y + a.h > b.y - m;
  function segHitsRect([a, b], r) {
    return Math.max(a.x, b.x) > r.x && Math.min(a.x, b.x) < r.x + r.w && Math.max(a.y, b.y) > r.y && Math.min(a.y, b.y) < r.y + r.h;
  }

  // ---------- labels ----------
  function placeLabels(E, nodes, groups) {
    const nodeRects = nodes.map((n) => ({ x: n.x, y: n.y, w: n.width, h: n.height }));
    const titles = groups.map(titleRect);
    const placed = [];
    let cost = 0;
    const order = E.filter((e) => e.label).map((e) => {
      const w = labelW(e.label), h = SZ.labelH;
      const total = segs(e.pts).reduce((s, sg) => s + segLen(sg), 0) || 1;
      const cands = [];
      let run = 0;
      for (const sg of segs(e.pts)) {
        const [a, b] = sg, len = segLen(sg), horiz = Math.abs(a.y - b.y) < 0.5, need = horiz ? w + 18 : h + 22;
        if (len >= need) for (const t of [0.5, 0.3, 0.7, 0.2, 0.8]) {
          const along = len * t;
          if (along < need / 2 || len - along < need / 2) continue;
          const cx = a.x + (b.x - a.x) * t, cy = a.y + (b.y - a.y) * t;
          cands.push({ x: cx - w / 2, y: cy - h / 2, w, h, pref: (horiz ? 0 : 6) + 14 * Math.abs((run + along) / total - 0.5) + (t === 0.5 ? 0 : 2) });
        }
        run += len;
      }
      for (const sg of segs(e.pts)) {
        const [a, b] = sg; if (segLen(sg) < 18) continue;
        const horiz = Math.abs(a.y - b.y) < 0.5, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        if (horiz) for (const dy of [-h / 2 - 5, h / 2 + 5]) cands.push({ x: cx - w / 2, y: cy + dy - h / 2, w, h, pref: 45 });
        else for (const dx of [w / 2 + 6, -w / 2 - 6]) cands.push({ x: cx + dx - w / 2, y: cy - h / 2, w, h, pref: 45 });
      }
      if (!cands.length) {
        const sg = segs(e.pts).reduce((m, s) => (segLen(s) > segLen(m) ? s : m));
        const cx = (sg[0].x + sg[1].x) / 2, cy = (sg[0].y + sg[1].y) / 2;
        cands.push({ x: cx - w / 2, y: cy - h / 2, w, h, pref: 120 });
      }
      return { e, cands };
    }).sort((a, b) => a.cands.length - b.cands.length);
    for (const { e, cands } of order) {
      let best = null;
      for (const c of cands) {
        let k = c.pref;
        for (const r of nodeRects) if (rectHit(c, r, 4)) k += 400;
        for (const r of titles) if (rectHit(c, r, 2)) k += 150;
        for (const p of placed) if (rectHit(c, p, 6)) k += 400;
        for (const o of E) if (o !== e) for (const s of segs(o.pts)) if (segHitsRect(s, c)) k += 35;
        if (!best || k < best.k) best = { ...c, k };
      }
      e.lab = best; placed.push(best); cost += best.k;
    }
    return cost;
  }

  // ---------- scoring ----------
  function score(laid, E, nodes, groups, frame) {
    const W = laid.width, H = laid.height, S = E.map((e) => segs(e.pts));
    let crossings = 0, bends = 0, length = 0, detour = 0, through = 0, titleHits = 0;
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) for (const a of S[i]) for (const b of S[j]) if (cross(a, b)) crossings++;
    for (const e of E) {
      bends += Math.max(0, e.pts.length - 2);
      const p0 = e.pts[0], pn = e.pts[e.pts.length - 1];
      detour -= Math.abs(pn.x - p0.x) + Math.abs(pn.y - p0.y);
      for (const sg of segs(e.pts)) {
        length += segLen(sg); detour += segLen(sg);
        for (const n of nodes) if (n.id !== e.from && n.id !== e.to && segHitsRect(sg, { x: n.x + 2, y: n.y + 2, w: n.width - 4, h: n.height - 4 })) through++;
      }
    }
    placeTitles(E, groups);
    const labelCost = placeLabels(E, nodes, groups);
    for (const g of groups) { const r = titleRect(g); for (const e of E) for (const sg of segs(e.pts)) if (segHitsRect(sg, r)) titleHits++; }
    const fit = Math.min(frame[0] / W, frame[1] / H);
    const total = crossings * K.crossings + through * K.through + bends * K.bends + length * K.length + detour * K.detour
      - Math.log(fit) * K.fit + titleHits * K.titleHits + labelCost;
    return { total: +total.toFixed(1), crossings, through, bends, detour: Math.round(detour), labelCost: Math.round(labelCost), titleHits, fit: +fit.toFixed(2), W: Math.round(W), H: Math.round(H) };
  }

  // ---------- search ----------
  const subsets = (arr) => arr.reduce((r, x) => r.concat(r.map((s) => [...s, x])), [[]]);
  async function layout(spec, { onProgress, maxAlts = 6 } = {}) {
    const edges = validate(spec);
    const elk = new ELK();
    const want = String(spec.direction || "right").toUpperCase();
    const dirs = want === "AUTO" ? ["RIGHT", "DOWN"] : [want === "DOWN" ? "DOWN" : "RIGHT"];
    const frame = Array.isArray(spec.frame) ? spec.frame.map(Number) : [1600, 900];
    const hasCols = Object.values(spec.nodes || {}).some((n) => n.col !== undefined);
    const maxLab = Math.max(80, ...edges.filter((e) => e.label).map((e) => labelW(e.label)));
    const foldSets = subsets(foldCandidates(spec, edges)).slice(0, 16);
    const cfgs = [];
    for (const direction of dirs) for (const folds of foldSets)
      for (const placement of ["NETWORK_SIMPLEX", "BRANDES_KOEPF"]) for (const modelOrder of ["NODES_AND_EDGES", "NONE"])
        for (const layerGap of [Math.round(maxLab * 0.55 + 30), Math.round(maxLab + 40)])
          cfgs.push({ direction, folds, placement, modelOrder, layerGap, nodeGap: 40, aspect: frame[0] / frame[1], partition: hasCols });
    const found = [], report = [];
    for (let k = 0; k < cfgs.length; k++) {
      const cfg = cfgs[k];
      await onProgress?.(k + 1, cfgs.length);
      let built, laid;
      try { built = buildGraph(spec, edges, cfg); laid = await elk.layout(built.root); }
      catch (err) { report.push({ cfg, error: String(err?.message || err).slice(0, 160) }); continue; }
      const { nodes, groups } = walk(laid);
      const E = mergedEdges(laid, built.meta, edges);
      if (E.some((e) => e.pts.length < 2)) { report.push({ cfg, error: "edge without route" }); continue; }
      const s = score(laid, E, nodes, groups, frame);
      report.push({ cfg, s });
      found.push({ W: laid.width, H: laid.height, E, nodes, groups, s, cfg, theme: spec.theme || "classic" });
    }
    if (!found.length) throw new Error("no layout succeeded: " + (report[0]?.error || "unknown"));
    report.sort((a, b) => (a.s?.total ?? 1e9) - (b.s?.total ?? 1e9));
    // alts: the best few *different* layouts (many configs produce the same picture), best first
    const alts = [], seen = new Set();
    for (const r of found.sort((a, b) => a.s.total - b.s.total)) {
      const key = `${r.s.total}|${r.s.W}|${r.s.H}`;
      if (!seen.has(key) && alts.length < maxAlts) { seen.add(key); alts.push(r); }
    }
    return { best: alts[0], alts, report };
  }

  // ---------- SVG ----------
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function roundedPath(pts, r) {
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i - 1], c = pts[i], n = pts[i + 1];
      const l1 = Math.hypot(c.x - p.x, c.y - p.y), l2 = Math.hypot(n.x - c.x, n.y - c.y), rr = Math.min(r, l1 / 2, l2 / 2);
      const a = { x: c.x - ((c.x - p.x) / l1) * rr, y: c.y - ((c.y - p.y) / l1) * rr };
      const b = { x: c.x + ((n.x - c.x) / l2) * rr, y: c.y + ((n.y - c.y) / l2) * rr };
      d += ` L${a.x},${a.y} Q${c.x},${c.y} ${b.x},${b.y}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L${last.x},${last.y}`;
  }
  function toSVG(best, { fontCSS = "", theme } = {}) {
    const { E, nodes, groups } = best;
    const { canvas: C, roles: R } = themeOf(theme ?? best.theme);
    const W = Math.ceil(best.W), H = Math.ceil(best.H), o = [];
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
    o.push(`<defs>${fontCSS ? `<style>${fontCSS}</style>` : ""}<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M1.5,1.5 L8.5,5 L1.5,8.5" fill="none" stroke="${C.edge}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`);
    o.push(`<rect width="100%" height="100%" fill="${C.bg}"/>`);
    for (const g of groups) o.push(`<rect x="${g.x}" y="${g.y}" width="${g.width}" height="${g.height}" fill="none" stroke="${C.groupStroke}" stroke-width="1.4" stroke-dasharray="6 5"/>`);
    for (const e of E) o.push(`<path d="${roundedPath(e.pts, T.corner)}" fill="none" stroke="${C.edge}" stroke-width="1.4" marker-end="url(#arr)"/>`);
    for (const g of groups) {
      const r = titleRect(g);
      o.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h - 2}" fill="${C.bg}"/>`);
      o.push(`<text x="${r.x + 6}" y="${r.y + 11}" dy="0.35em" font-family="${esc(T.monoStack)}" font-size="${T.groupSize}" fill="${C.groupText}">${esc(g.title)}</text>`);
    }
    for (const e of E) if (e.lab) {
      const l = e.lab;
      o.push(`<rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" fill="${C.bg}"/>`);
      o.push(`<text x="${l.x + l.w / 2}" y="${l.y + l.h / 2}" dy="0.35em" text-anchor="middle" font-family="${esc(T.sansStack)}" font-size="${T.labelSize}" fill="${C.edgeText}">${esc(e.label)}</text>`);
    }
    for (const n of nodes) {
      const r = R[n.role], ls = lines(n.label), y0 = n.y + n.height / 2 - ((ls.length - 1) * SZ.lineH) / 2;
      o.push(`<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="${r.r}" fill="${r.fill}"${r.stroke ? ` stroke="${r.stroke}" stroke-width="1.2"${r.dash ? ' stroke-dasharray="5 4"' : ""}` : ""}/>`);
      ls.forEach((t, i) => o.push(`<text x="${n.x + n.width / 2}" y="${y0 + i * SZ.lineH}" dy="0.35em" text-anchor="middle" font-family="${esc(T.sansStack)}" font-size="${T.nodeSize}" fill="${r.text}">${esc(t)}</text>`));
    }
    o.push("</svg>");
    return o.join("\n");
  }

  // ---------- draw.io ----------
  const xa = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\n/g, "&#10;");
  const htmlLabel = (s) => lines(s).map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")).join("<br>");
  const f2 = (v) => Math.round(v * 100) / 100;
  function toDrawioModel(best, { theme } = {}) {
    const { E, nodes, groups } = best;
    const { canvas: C, roles: R } = themeOf(theme ?? best.theme);
    const abs = {};
    for (const g of groups) abs[g.id] = g;
    for (const n of nodes) abs[n.id] = n;
    const cid = (id) => "c_" + id.replace(/[^A-Za-z0-9_-]/g, "_");
    const cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
    const geom = (x) => {
      const p = x.parentId ? abs[x.parentId] : null;
      return `<mxGeometry x="${f2(x.x - (p ? p.x : 0))}" y="${f2(x.y - (p ? p.y : 0))}" width="${f2(x.width)}" height="${f2(x.height)}" as="geometry"/>`;
    };
    for (const g of groups) {
      const style = `rounded=0;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;fillColor=none;dashed=1;dashPattern=6 5;strokeColor=${C.groupStroke};strokeWidth=1.4;verticalAlign=top;align=left;spacingLeft=${g.titleDx ?? 14};spacingTop=12;fontFamily=${T.mono},Consolas,Courier New,monospace;fontSize=${T.groupSize};fontColor=${C.groupText};labelBackgroundColor=${C.bg};`;
      cells.push(`<mxCell id="${cid(g.id)}" value="${xa(g.title)}" style="${style}" vertex="1" parent="${g.parentId ? cid(g.parentId) : "1"}">${geom(g)}</mxCell>`);
    }
    for (const n of nodes) {
      const r = R[n.role];
      const style = `rounded=1;absoluteArcSize=1;arcSize=${r.r * 2};whiteSpace=wrap;html=1;fillColor=${r.fill};strokeColor=${r.stroke || "none"};${r.stroke ? "strokeWidth=1.2;" : ""}${r.dash ? "dashed=1;dashPattern=5 4;" : ""}fontFamily=${T.sans},Segoe UI,Helvetica,Arial,sans-serif;fontSize=${T.nodeSize};fontColor=${r.text};`;
      cells.push(`<mxCell id="${cid(n.id)}" value="${xa(htmlLabel(n.label))}" style="${style}" vertex="1" parent="${n.parentId ? cid(n.parentId) : "1"}">${geom(n)}</mxCell>`);
    }
    const rel = (p, b) => {
      const clamp = (v) => Math.min(1, Math.max(0, v));
      return { x: f2(clamp((p.x - b.x) / b.width)), y: f2(clamp((p.y - b.y) / b.height)) };
    };
    for (const e of E) {
      const s = abs[e.from], t = abs[e.to], p0 = e.pts[0], pn = e.pts[e.pts.length - 1];
      const ex = rel(p0, s), en = rel(pn, t);
      const style = `edgeStyle=none;rounded=1;arcSize=${T.corner * 2};html=1;endArrow=open;endFill=0;endSize=8;startArrow=none;strokeColor=${C.edge};strokeWidth=1.4;fontFamily=${T.sans},Segoe UI,Helvetica,Arial,sans-serif;fontSize=${T.labelSize};fontColor=${C.edgeText};labelBackgroundColor=${C.bg};exitX=${ex.x};exitY=${ex.y};exitDx=0;exitDy=0;exitPerimeter=0;entryX=${en.x};entryY=${en.y};entryDx=0;entryDy=0;entryPerimeter=0;`;
      const pts = e.pts.slice(1, -1).map((p) => `<mxPoint x="${f2(p.x)}" y="${f2(p.y)}"/>`).join("");
      // label position: fraction along the path (draw.io: -1..1) + offset to our placed centre
      let lx = 0, off = { x: 0, y: 0 };
      if (e.lab) {
        const c = { x: e.lab.x + e.lab.w / 2, y: e.lab.y + e.lab.h / 2 };
        const S = segs(e.pts), total = S.reduce((a, sg) => a + segLen(sg), 0) || 1;
        let run = 0, bestD = Infinity, bestF = 0.5, bestP = c;
        for (const sg of S) {
          const [a, b] = sg, L = segLen(sg) || 1;
          const t = Math.max(0, Math.min(1, ((c.x - a.x) * (b.x - a.x) + (c.y - a.y) * (b.y - a.y)) / (L * L)));
          const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, d = Math.hypot(c.x - q.x, c.y - q.y);
          if (d < bestD) { bestD = d; bestF = (run + t * L) / total; bestP = q; }
          run += L;
        }
        lx = f2(bestF * 2 - 1); off = { x: f2(c.x - bestP.x), y: f2(c.y - bestP.y) };
      }
      cells.push(`<mxCell id="e_${e.i}" value="${xa(e.label)}" style="${style}" edge="1" parent="1" source="${cid(e.from)}" target="${cid(e.to)}"><mxGeometry x="${lx}" relative="1" as="geometry">${pts ? `<Array as="points">${pts}</Array>` : ""}<mxPoint x="${off.x}" y="${off.y}" as="offset"/></mxGeometry></mxCell>`);
    }
    return `<mxGraphModel dx="0" dy="0" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="${Math.ceil(best.W)}" pageHeight="${Math.ceil(best.H)}" math="0" shadow="0" background="${C.bg}"><root>${cells.join("")}</root></mxGraphModel>`;
  }
  const toDrawio = (best, name = "Flow", opts = {}) =>
    `<mxfile host="flowdiag" type="device"><diagram id="flowdiag" name="${xa(name)}">${toDrawioModel(best, opts)}</diagram></mxfile>`;

  return { layout, toSVG, toDrawio, toDrawioModel };
}
