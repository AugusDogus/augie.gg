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
  schematic viewers.
- `3d-viewer.js`, plus `three/` (Three.js r161 and the add-ons it imports):
  Prism's 3D viewer.
- `model-appearance.js`, `schematic-sizing.js`, and `native-touch.js`:
  Backplane's adapters, not upstream viewer code. They finish the GLB's
  soldermask and lighting, give the schematic a sharp high-density canvas, and
  map pinch and pan onto Prism's camera, all without modifying the bundle.

KiCAD-Prism is Apache-2.0 licensed (`UPSTREAM-LICENSE.txt`); its bundled
third-party notices remain in the generated artifacts. Three.js is MIT
(`three/LICENSE`). Inter is under the SIL Open Font License (`inter-OFL.txt`).
Keep this attribution with the vendored files when updating them.

Left out because this viewer never loads them: `glyph-full.js` (CJK glyphs,
for boards with CJK text), the STEP viewer and OpenCascade (`occt/`), the
Draco and Basis decoders (the GLB is meshopt compressed), Backplane's
postMessage runtime, its canvas presentation and mobile properties adapters,
and Three.js's OrbitControls.

## This site's own

`embed.html` and `embed.js` replace Backplane's runtime. The page passes the
board's files as same-origin URLs:

```
embed.html?model=/work/<slug>/board.glb&pcb=/work/<slug>/<name>.kicad_pcb&schematic=/work/<slug>/<name>.kicad_sch
```

The schematic is a single root sheet. The GLB is a `kicad-cli pcb export glb`
export with Backplane's flags and layer names, compressed with meshopt; the 3D
viewer needs `EXT_meshopt_compression` and `KHR_mesh_quantization`, which
Prism's loader decodes locally.

`embed.js` takes over the 3D viewer's camera and drawing (an opening view, one
slow turn unless motion is reduced, and frames drawn only while something
moves), sets every view on the site's ground, and fits the PCB and schematic
clear of the controls, after Backplane's canvas presentation adapter.
`inter-latin.woff2` is the site's own Inter, for the controls.
