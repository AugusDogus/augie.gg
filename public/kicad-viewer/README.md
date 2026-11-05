# KiCad viewer vendor bundle

The board viewer on the home page: a board's 3D model, PCB, and schematic in
three tabs. The site frames `embed.html` only after someone asks to explore a
board, so nothing here loads with the page.

## Vendored

Copied unmodified from [Backplane](https://github.com/BackplaneWorks/Backplane)
(`apps/web/public/kicad-viewer`, commit `7e4564d1da454c0bc4917e2ea08c426013f2be0f`),
which vendors the browser viewer artifacts of
[KiCAD-Prism](https://github.com/krishna-swaroop/KiCAD-Prism) at commit
`50a4812c7c05aebcc8dda28c64c9382c9fce719d`. `ecad-viewer.manifest.json`
records the ECAD bundle's own upstream and adapter commits.

- `ecad-viewer.js` and `parser.worker.js`: Prism's native KiCad PCB and
  schematic viewers, built from
  [ecad-viewer](https://github.com/Huaqiu-Electronics/ecad-viewer) (the
  manifest's `upstreamCommit`), which grew out of
  [KiCanvas](https://github.com/theacodes/kicanvas).
- `3d-viewer.js`, plus `three/` (Three.js r161 and the add-ons it imports):
  Prism's 3D viewer, after Don McCurdy's
  [three-gltf-viewer](https://github.com/donmccurdy/three-gltf-viewer).
- `model-appearance.js`, `schematic-sizing.js`, and `native-touch.js`:
  Backplane's adapters, not upstream viewer code. They finish the GLB's
  soldermask and lighting, give the schematic a sharp high-density canvas, and
  map pinch and pan onto Prism's camera, all without modifying the bundle.

Left out because this viewer never loads them: `glyph-full.js` (CJK glyphs,
for boards with CJK text), the STEP viewer and OpenCascade (`occt/`), the
Draco and Basis decoders (the GLB is meshopt compressed), Backplane's
postMessage runtime, its canvas presentation and mobile properties adapters,
and Three.js's OrbitControls.

## Licenses

Each work keeps its own license, and these files stay with the vendored files
when they are updated:

- KiCAD-Prism: Apache-2.0 (`UPSTREAM-LICENSE.txt`).
- ecad-viewer: MIT, Copyright (c) 2024 深圳华秋电子有限公司
  (`ECAD-VIEWER-LICENSE.md`), for `ecad-viewer.js` and `parser.worker.js`.
- KiCanvas: MIT, (c) 2022 Alethea Katherine Flowers (`KICANVAS-LICENSE.md`),
  whose code ecad-viewer builds on and the bundle still carries. Its notice
  also names the works KiCanvas includes, such as Earcut and the Newstroke
  font.
- three-gltf-viewer: MIT, Copyright (c) 2023 Don McCurdy
  (`THREE-GLTF-VIEWER-LICENSE.txt`), for `3d-viewer.js`.
- Backplane: MIT, Copyright (c) 2026 T3 Tools Inc. (`BACKPLANE-LICENSE.txt`),
  for `model-appearance.js`, `schematic-sizing.js`, and `native-touch.js`, and
  for what `embed.js` adapts from Backplane's runtime and canvas presentation.
- Three.js: MIT (`three/LICENSE`).
- Inter: SIL Open Font License (`inter-OFL.txt`).

The bundles' own "Bundled license information" comments cover only the
libraries bundled into them (JSZip with pako, Comlink, and Immutable), not
ecad-viewer or KiCanvas, which is why their notices are here.

## This site's own

`embed.html` and `embed.js` replace Backplane's runtime. The page passes the
board's files as same-origin URLs:

```
embed.html?model=/work/<slug>/board.glb&pcb=/work/<slug>/<name>.kicad_pcb&schematic=/work/<slug>/<name>.kicad_sch
```

The schematic is a single root sheet. The GLB is a `kicad-cli pcb export glb`
export with Backplane's flags and layer names, compressed with meshopt; the 3D
viewer needs `EXT_meshopt_compression` and `KHR_mesh_quantization`, which
Prism's loader decodes locally. `next.config.js` serves the KiCad files as
text, so they go out compressed.

`embed.js` takes over the 3D viewer's camera and drawing (an opening view that
matches the board's poster, one slow turn unless motion is reduced, and frames
drawn only while something moves), sets every view on the site's ground, and
fits the PCB and schematic clear of the controls, after Backplane's canvas
presentation adapter. The board poster is a capture of that opening view at
1280 by 800 at 2x, with the controls hidden and motion reduced, so the model
fades in over it without a jump; render it again whenever the model or the
opening view changes. `inter-latin.woff2` is the site's own Inter, for the
controls.

`embed.js` is plain JavaScript checked by TypeScript (`// @ts-check`, against
`tsconfig.viewer.json`, as part of `bun run typecheck`). Prism ships no types,
so the internals it reaches are declared as small shapes at the top of the
file and checked where they first come from Prism.
