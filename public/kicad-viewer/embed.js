// @ts-check
/**
 * The board viewer augie.gg frames: a board's 3D model, PCB, and schematic in
 * three tabs. The page around it names the files as same-origin URLs:
 *
 *   embed.html?model=/work/x/board.glb&pcb=/work/x/x.kicad_pcb&schematic=/work/x/x.kicad_sch
 *
 * The 3D view is KiCAD-Prism's <ecad-3d-viewer>, finished by Backplane's model
 * appearance adapter; the PCB and schematic are Prism's <ecad-viewer>. Every
 * vendored file stays as shipped: this adapts them at runtime, as Backplane's
 * runtime does, without its postMessage protocol. What it takes from
 * Backplane's runtime and canvas presentation is MIT (BACKPLANE-LICENSE.txt).
 */

/** The site's ground, under every view, so the poster and the model meet without a seam. */
const GROUND = "#0a1317";
/** Each zoom step, in or out. */
const ZOOM_STEP = 1.25;
/** The opening view: from the jacks' side, a little to the left, looking down. */
const HOME = { azimuth: 35, elevation: 30, fov: 30 };
/** One slow turn after the model appears, unless motion is reduced. */
const TURN_MS = 24000;
/**
 * The opening view's margins, as fractions of the frame's width and height:
 * the board poster's framing, which the model matches as it fades in over it.
 */
const MARGIN = { x: 0.08, y: 0.12 };
/** How long the model takes to make room for the controls, where they reach past those margins. */
const MAKE_ROOM_MS = 700;
/** The schematic's paper, a step above the ground. */
const PAPER = "#0f1a1f";
/**
 * The schematic's rules, by the names Prism gives the items: the sheet's
 * frame and title block lines and boxes, and the section boxes drawn on it.
 * They keep at least a device pixel wide; text, stroked too, keeps its own
 * weight, where a pixel-wide stroke would fill small letters in at 1x.
 */
const RULES = new Set(["Line", "Rect", "Rectangle"]);
/**
 * The schematic in the site's colors instead of on white paper: KiCad's own
 * scheme (green wires, red symbols, teal text, blue notes) lifted to read on
 * the ground.
 */
const SCHEMATIC_COLORS = {
  background: GROUND,
  worksheet: "#8a9ca3",
  wire: "#5fcf8e",
  junction: "#5fcf8e",
  bus: "#7da2ff",
  bus_junction: "#7da2ff",
  component_outline: "#e08b7d",
  component_body: "#122228",
  pin: "#e08b7d",
  pin_name: "#7ccad5",
  pin_number: "#c99088",
  reference: "#8fd6df",
  value: "#8fd6df",
  fields: "#c9a0d8",
  hidden: "#4d6870",
  label_local: "#e8eef0",
  label_global: "#e08b7d",
  label_hier: "#d8b65e",
  no_connect: "#7da2ff",
  note: "#9db5ff",
  sheet: "#e08b7d",
  sheet_background: "#0e1c22",
  sheet_fields: "#c9a0d8",
  sheet_filename: "#d8b65e",
  sheet_label: "#7ccad5",
  sheet_name: "#7ccad5",
  anchor: "#7da2ff",
  aux_items: "#e8eef0",
  brightened: "#ff8ad8",
  cursor: "#f2f6f7",
  grid: "#22343b",
  grid_axes: "#7da2ff",
  shadow: "#8fe3f080",
  erc_error: "#ff6b6bcc",
  erc_warning: "#f2c94ccc",
  dnp_marker: "#ff6b6bd9",
};

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

// Prism's bundles log their progress (resizes, project loads, tab changes) on
// every open. This frame's own console, set before any of them loads, keeps
// warnings and errors only; the vendored files stay as shipped.
console.log = () => undefined;
console.debug = () => undefined;

/**
 * @template T
 * @typedef {{ ok: true, value: T } | { ok: false, error: string }} Result
 */

/** @template T @param {T} value @returns {Result<T>} */
const ok = (value) => ({ ok: true, value });
/** @param {string} error @returns {Result<never>} */
const fail = (error) => ({ ok: false, error });

/**
 * @typedef {{ kind: "none" }
 *   | { kind: "loading", text: string }
 *   | { kind: "error", text: string, retry: (() => void) | null }} Status
 * @typedef {{ top: number, right: number, bottom: number, left: number }} Insets
 * @typedef {"pcb" | "schematic"} DocumentKind
 * @typedef {{ distance: number, shift: { x: number, y: number } }} Framing
 *   A camera distance and lens shift (fractions of the frame).
 */

/**
 * One tab's view.
 * @typedef {object} View
 * @property {() => void} show
 * @property {() => void} hide
 * @property {(direction: "in" | "out") => void} zoom
 * @property {() => void} reset
 * @property {(event: KeyboardEvent) => boolean} key Whether the view used the key.
 */

/*
 * Prism's internals this page reaches, as far as it uses them. The bundles
 * ship no types, so these follow their sources: three-gltf-viewer's Viewer
 * for the 3D view, and KiCanvas's viewers for the PCB and schematic. Each is
 * checked where it first comes from Prism.
 */

/**
 * The viewer behind Prism's <ecad-3d-viewer>.
 * @typedef {object} ModelViewer
 * @property {ModelCamera} defaultCamera
 * @property {import("three").WebGLRenderer} renderer
 * @property {import("three").WebGLRenderer} axesRenderer For an axes inset this page never shows.
 * @property {import("three").Object3D} content The model, centered on the origin.
 * @property {import("three").Scene} scene
 * @property {{ bgColor: string, exposure: number }} state
 * @property {unknown} controls Whichever controls Prism resizes with the frame.
 * @property {(time: number) => void} animate Prism's loop, which asks for each next frame through this property.
 * @property {() => void} updateBackground
 * @property {() => void} updateLights
 * @property {() => void} resize
 * @property {() => void} render
 */

/**
 * Prism's perspective camera, as far as this page moves it.
 * @typedef {object} ModelCamera
 * @property {number} fov
 * @property {number} near
 * @property {number} far
 * @property {number} aspect
 * @property {import("three").Vector3} position
 * @property {import("three").Quaternion} quaternion
 * @property {import("three").Vector3} up
 * @property {(target: import("three").Vector3) => void} lookAt
 * @property {(fullWidth: number, fullHeight: number, x: number, y: number, width: number, height: number) => void} setViewOffset
 * @property {() => void} updateProjectionMatrix
 */

/**
 * Prism's <ecad-viewer>.
 * @typedef {HTMLElement & {
 *   ready: Promise<unknown>,
 *   replaceSources(request: { revisionKey: string, sources: { filename: string, content: string }[] }): Promise<unknown>,
 *   setActive(active: boolean): void,
 *   resize(): void,
 *   setViewportInsets(insets: Partial<Insets> | undefined): void,
 * }} DocumentElement
 */

/**
 * A KiCanvas color.
 * @typedef {object} Color
 * @property {{ from_css(css: string): Color }} constructor
 * @property {() => [number, number, number, number]} to_array
 */

/**
 * A KiCanvas box, in world units.
 * @typedef {object} BBox
 * @property {new (x: number, y: number, width: number, height: number) => BBox} constructor
 */

/**
 * KiCanvas's board or schematic viewer, inside <ecad-viewer>.
 * @typedef {object} DocumentViewer
 * @property {{
 *   background_color: Color,
 *   gl?: WebGL2RenderingContext,
 *   line(...shape: unknown[]): void,
 *   start_bbox(): void,
 *   end_bbox(item: object): unknown,
 *   end_layer(): unknown,
 * }} renderer
 *   Painting an item strokes each of its lines with `line`, between
 *   `start_bbox` and `end_bbox`, which is handed the item; `end_layer` hands
 *   back each layer it has just recorded.
 * @property {{ background: Color }} theme
 * @property {{ camera: { zoom: number, center: { x: number, y: number, set(x: number, y: number): void }, bbox: BBox } }} viewport
 * @property {{ width: number, height: number, items(): Iterable<object> }} drawing_sheet
 *   The page, in millimeters, and what KiCad draws on it.
 * @property {() => { by_name(name: string): { visible: boolean } | undefined }} create_layer_set
 * @property {() => void} zoom_fit_top_item
 * @property {() => void} paint
 * @property {() => void} draw
 */

/**
 * A layer KiCanvas's 2D renderer, which draws the schematic, has recorded.
 * @typedef {object} CanvasLayer
 * @property {string} name
 * @property {unknown[]} commands
 */

/**
 * A fill or stroke in a 2D layer.
 * @typedef {object} DrawCommand
 * @property {Path2D} path
 * @property {string | null} fill A CSS color.
 * @property {string | null} stroke A CSS color.
 * @property {number} stroke_width In world units.
 * @property {(context: CanvasRenderingContext2D) => void} render
 */

/** @param {unknown} value @returns {value is CanvasLayer} */
function isCanvasLayer(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "commands" in value &&
    Array.isArray(value.commands)
  );
}

/** @param {unknown} value @returns {value is DrawCommand} */
function isDrawCommand(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    "path" in value &&
    "fill" in value &&
    "stroke" in value &&
    "stroke_width" in value &&
    "render" in value
  );
}

/** @param {unknown} value @returns {value is ModelViewer} */
function isModelViewer(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    "defaultCamera" in value &&
    "renderer" in value &&
    "content" in value &&
    "state" in value
  );
}

/** @param {HTMLElement} element @returns {element is DocumentElement} */
function isDocumentElement(element) {
  return (
    "replaceSources" in element &&
    "setViewportInsets" in element &&
    "setActive" in element
  );
}

/** @param {unknown} value @returns {value is DocumentViewer} */
function isDocumentViewer(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    "viewport" in value &&
    "renderer" in value &&
    "zoom_fit_top_item" in value &&
    "create_layer_set" in value
  );
}

/**
 * An element the viewer's own markup always has.
 * @param {ParentNode} root
 * @param {string} selector
 * @returns {HTMLElement}
 */
function part(root, selector) {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLElement))
    throw new Error(
      `embed.html has no ${selector}, which the viewer needs to start.`,
    );
  return element;
}

/**
 * A file named by the page around the viewer; only this site's own files open.
 * @param {URLSearchParams} params
 * @param {string} name
 * @returns {Result<URL>}
 */
function sameOriginUrl(params, name) {
  const value = params.get(name);
  if (value === null)
    return fail(`The viewer was opened without a ${name} file.`);
  /** @type {URL} */
  let url;
  try {
    url = new URL(value, location.href);
  } catch {
    return fail(`The ${name} address isn't a URL: ${value}`);
  }
  if (url.origin !== location.origin)
    return fail(`The viewer only opens files from ${location.host}.`);
  return ok(url);
}

function readBoard() {
  const params = new URLSearchParams(location.search);
  const model = sameOriginUrl(params, "model");
  if (!model.ok) return model;
  const pcb = sameOriginUrl(params, "pcb");
  if (!pcb.ok) return pcb;
  const schematic = sameOriginUrl(params, "schematic");
  if (!schematic.ok) return schematic;
  return ok({
    model: model.value,
    pcb: pcb.value,
    schematic: schematic.value,
  });
}

/**
 * Status in a view: nothing, a loading line, or an error with a way to try
 * again. It is a live region, so it changes only when what it says does, and
 * screen readers hear each line once.
 * @param {HTMLElement} panel
 * @param {Status} status
 */
function setStatus(panel, status) {
  const box = part(panel, ".status");
  const said = status.kind === "none" ? "" : `${status.kind}: ${status.text}`;
  if (box.dataset.said === said) return;
  box.dataset.said = said;
  box.replaceChildren();
  if (status.kind === "none") return;
  const message = document.createElement("div");
  message.className = "message glass";
  const text = document.createElement("span");
  text.textContent = status.text;
  if (status.kind === "loading") {
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    spinner.setAttribute("aria-hidden", "true");
    message.append(spinner, text);
  } else {
    message.dataset.tone = "error";
    message.append(text);
    if (status.retry !== null) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "retry";
      retry.textContent = "Try again";
      retry.addEventListener("click", status.retry);
      message.append(retry);
    }
  }
  box.append(message);
}

/**
 * A file's bytes.
 * @param {URL} url
 * @param {string} what
 * @returns {Promise<Result<Blob>>}
 */
async function fetchBlob(url, what) {
  /** @type {Response} */
  let response;
  try {
    response = await fetch(url);
  } catch {
    return fail(
      `The ${what} didn't load. Check your connection and try again.`,
    );
  }
  if (!response.ok)
    return fail(
      `The ${what} didn't load (HTTP ${response.status}). Try again, or reload the page.`,
    );
  try {
    return ok(await response.blob());
  } catch {
    return fail(
      `The ${what} stopped loading partway. Check your connection and try again.`,
    );
  }
}

/** A URL's file name, as KiCad wrote it; a malformed escape stays as it came. @param {URL} url */
function fileName(url) {
  const last = url.pathname.split("/").at(-1) ?? "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

/** @param {URL} url @param {string} what @returns {Promise<Result<string>>} */
async function fetchText(url, what) {
  const blob = await fetchBlob(url, what);
  return blob.ok ? ok(await blob.value.text()) : blob;
}

/**
 * Imports a module once, as a value: a failed import can be tried again.
 * @template T
 * @param {() => Promise<T>} load
 * @param {string} what
 * @returns {() => Promise<Result<T>>}
 */
function lazyModule(load, what) {
  /** @type {Promise<Result<T>> | null} */
  let pending = null;
  return () => {
    pending ??= load().then(
      (module) => ok(module),
      () => {
        pending = null;
        return fail(
          `The ${what} viewer didn't load. Check your connection and try again.`,
        );
      },
    );
    return pending;
  };
}

const importModelModules = () =>
  Promise.all([
    import("three"),
    import("three/addons/controls/TrackballControls.js"),
    import("./model-appearance.js"),
    import("./3d-viewer.js"),
  ]).then(([three, trackball, appearance]) => ({
    three,
    TrackballControls: trackball.TrackballControls,
    finishBoardModel: appearance.finishBoardModel,
  }));
/** @typedef {Awaited<ReturnType<typeof importModelModules>>} ModelModules */
const loadModelModules = lazyModule(importModelModules, "3D");

const loadDocumentModules = lazyModule(
  () =>
    Promise.all([
      import("./schematic-sizing.js"),
      import("./native-touch.js"),
      import("./ecad-viewer.js"),
    ]).then(([sizing, touch]) => ({
      installSchematicSizing: sizing.installSchematicSizing,
      installNativeTouch: touch.installNativeTouch,
    })),
  "PCB and schematic",
);

/** Whether the browser can draw WebGL at all; the probe's context is released at once. */
function canDrawWebGL() {
  const gl = document.createElement("canvas").getContext("webgl2");
  if (gl === null) return false;
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}

/** @returns {Promise<number>} */
function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/** @param {number} t */
const easeInOut = (t) => 0.5 - Math.cos(Math.PI * t) / 2;
/** @param {number} t */
const easeOut = (t) => 1 - (1 - t) ** 3;

/** How long Prism gets to show a file that is already here before the view gives up on it. */
const SETTLE_MS = 30000;

/** Each view's scripts, by URL: what Prism throws belongs to the view whose scripts it came from. */
const SOURCES = {
  model: /\/kicad-viewer\/(?:3d-viewer\.js|three\/)/,
  document: /\/kicad-viewer\/(?:ecad-viewer\.js|parser\.worker\.js)/,
};

/**
 * The script URLs an uncaught error or rejection in this window came from:
 * its file and stack, or nothing when it carries neither.
 * @param {Event} event
 */
function thrownFrom(event) {
  if (event instanceof ErrorEvent)
    return `${event.filename}\n${event.error instanceof Error ? (event.error.stack ?? "") : ""}`;
  if (event instanceof PromiseRejectionEvent && event.reason instanceof Error)
    return event.reason.stack ?? "";
  return "";
}

/**
 * Prism's work on a file, as a value. Prism reports some failures only as an
 * uncaught error or rejection in this window, and a stall not at all, so a
 * deadline fails it too, as does what is thrown from `source` while it runs;
 * what another view's scripts throw leaves it be. The browser still logs what
 * was thrown.
 * @template T
 * @param {() => Promise<T>} work
 * @param {string} what
 * @param {RegExp} source
 * @returns {Promise<Result<T>>}
 */
function settled(work, what, source) {
  return new Promise((resolve) => {
    /** @param {Result<T>} result */
    const done = (result) => {
      clearTimeout(timer);
      removeEventListener("error", thrown);
      removeEventListener("unhandledrejection", thrown);
      resolve(result);
    };
    /** @param {Event} event */
    const thrown = (event) => {
      if (source.test(thrownFrom(event)))
        done(fail(`${what}: Prism threw while loading`));
    };
    const timer = setTimeout(
      () => done(fail(`${what}: Prism didn't finish in ${SETTLE_MS} ms`)),
      SETTLE_MS,
    );
    addEventListener("error", thrown);
    addEventListener("unhandledrejection", thrown);
    work().then(
      (value) => done(ok(value)),
      () => done(fail(`${what}: Prism rejected the file`)),
    );
  });
}

/** The end of the document Prism is reading, if any. */
let reading = Promise.resolve();

/**
 * Prism's reading of a PCB or schematic, after any other's: the two share its
 * scripts, so only one at a time can tell what it throws apart.
 * @template T
 * @param {() => Promise<T>} work
 * @returns {Promise<T>}
 */
function inTurn(work) {
  const turn = reading.then(work);
  reading = turn.then(
    () => undefined,
    () => undefined,
  );
  return turn;
}

/**
 * A step through Prism's or an adapter's internals that may throw, as a value; the cause goes to the console.
 * @template T
 * @param {() => T} step
 * @param {string} what
 * @returns {Result<T>}
 */
function attempt(step, what) {
  try {
    return ok(step());
  } catch (error) {
    console.error(`Board viewer: ${what} failed`, error);
    return fail(`${what} failed`);
  }
}

/**
 * Prism's <ecad-3d-viewer> on the model, once the model is in its scene.
 * Prism asks its ancestors for a "project" with the model's URL.
 * @param {HTMLElement} host
 * @param {string} src
 * @returns {Promise<Result<HTMLElement>>}
 */
async function mountModel(host, src) {
  const project = Object.assign(new EventTarget(), {
    loaded: Promise.resolve(),
    ov_3d_url: src,
  });
  /** @param {Event} event */
  const provide = (event) => {
    if (
      "context_name" in event &&
      event.context_name === "project" &&
      "callback" in event &&
      typeof event.callback === "function"
    )
      event.callback(project);
  };
  const element = document.createElement("ecad-3d-viewer");
  /** @type {() => Promise<HTMLElement>} */
  const appended = () =>
    new Promise((resolve) => {
      project.addEventListener("3d:viewer:loaded", () => resolve(element), {
        once: true,
      });
      host.append(element);
    });
  host.addEventListener("context-request", provide);
  const mounted = await settled(appended, "3D model", SOURCES.model);
  host.removeEventListener("context-request", provide);
  URL.revokeObjectURL(src);
  if (!mounted.ok) releaseModel(element);
  return mounted;
}

/**
 * Drops a 3D element that won't be shown. Prism's viewer draws every frame
 * for as long as it lives, so its loop ends here and its WebGL contexts go
 * back, and trying again starts clean.
 * @param {HTMLElement} element
 */
function releaseModel(element) {
  element.remove();
  const viewer = modelViewerOf(element);
  if (viewer === null) return;
  viewer.animate = () => undefined;
  for (const renderer of [viewer.renderer, viewer.axesRenderer]) {
    renderer.dispose();
    if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
  }
}

/**
 * An environment for the board: dark below and at the horizon, brightening
 * toward an overhead light, and the same from every side, so the board looks
 * the same all the way round its turn. Radiance by height on a dome, as
 * Three.js prefilters it for reflections.
 * @param {import("three").WebGLRenderer} renderer
 * @param {ModelModules["three"]} three
 */
function overheadLight(renderer, three) {
  const { BackSide, Float32BufferAttribute, Mesh, MeshBasicMaterial } = three;
  const dome = new three.SphereGeometry(1, 64, 32);
  const position = dome.getAttribute("position");
  /** @type {number[]} */
  const colors = [];
  for (let index = 0; index < position.count; index++) {
    const height = position.getY(index);
    const radiance = height > 0 ? 0.05 + 1.95 * height ** 3 : 0.02;
    colors.push(radiance, radiance, radiance);
  }
  dome.setAttribute("color", new Float32BufferAttribute(colors, 3));
  const material = new MeshBasicMaterial({
    side: BackSide,
    vertexColors: true,
  });
  const generator = new three.PMREMGenerator(renderer);
  const target = generator.fromScene(
    new three.Scene().add(new Mesh(dome, material)),
  );
  generator.dispose();
  dome.dispose();
  material.dispose();
  return target.texture;
}

/** The board's own layers in the GLB, by the names Backplane gives them; Three.js adds "_1" to a repeat. */
const LAYER = /_(copper|pad|via|silkscreen|soldermask|pcb)(?:_\d+)?$/i;

/**
 * This page's light and finish over Backplane's (model-appearance.js): a deep
 * green board with white legends and gold pads on the dark ground, the same
 * from every side.
 *
 * Prism lights the model with Three.js's RoomEnvironment, a dim room with a
 * few far brighter light panels, fixed in the world. As the camera goes round,
 * the soldermask's gloss and the gold copper pour under it (the mask is 83%
 * opaque) mirror those panels, and at most angles the board washes out to a
 * pale beige green with a blown highlight; the opening view happens to miss
 * them. Instead the board sits under `overheadLight`, with a quieter gloss,
 * the pour dimmed as it is under resin, and its pads gold, as the board's ENIG
 * finish makes them.
 *
 * The mask and the legends on it are both see-through, and Three.js draws
 * those back to front by their middles, which put the legends under the mask
 * for half the turn. The legends now come after the mask, and the board body
 * is opaque, so neither shows through it from below.
 * @param {ModelViewer} viewer
 * @param {ModelModules["three"]} three
 */
function finishBoard(viewer, three) {
  const { Mesh, MeshPhysicalMaterial, MeshStandardMaterial } = three;
  /** @type {{ layer: string, mesh: import("three").Mesh, material: import("three").MeshStandardMaterial }[]} */
  const surfaces = [];
  viewer.content.traverse((/** @type {import("three").Object3D} */ object) => {
    if (
      !(object instanceof Mesh) ||
      !(object.material instanceof MeshStandardMaterial)
    )
      return;
    const layer = LAYER.exec(object.name)?.[1]?.toLowerCase();
    if (layer !== undefined)
      surfaces.push({ layer, mesh: object, material: object.material });
  });
  const gold = surfaces
    .find(({ layer }) => layer === "copper")
    ?.material.color.clone();
  for (const { layer, mesh, material } of surfaces) {
    if (layer === "soldermask") {
      material.color.multiplyScalar(0.33);
      material.roughness = 0.35;
      if (material instanceof MeshPhysicalMaterial) {
        material.specularIntensity = 0.4;
        material.clearcoat = 0.25;
        material.clearcoatRoughness = 0.2;
      }
      mesh.renderOrder = 1;
    } else if (layer === "silkscreen") {
      mesh.renderOrder = 2;
    } else if (layer === "pcb") {
      material.transparent = false;
      material.opacity = 1;
      material.depthWrite = true;
    } else if (layer === "pad" && gold !== undefined) {
      material.color.copy(gold);
    } else if (layer === "copper") {
      // The vias keep the shared gold.
      const pour = material.clone();
      pour.color.multiplyScalar(0.4);
      pour.roughness = 0.8;
      mesh.material = pour;
    }
    material.needsUpdate = true;
  }
  viewer.scene.environment = overheadLight(viewer.renderer, three);
  viewer.state.exposure = -0.5;
  viewer.updateLights();
}

/**
 * Each mesh's bounding box corners, in the scene: what the opening view fits.
 * @param {import("three").Object3D} content
 * @param {ModelModules["three"]} three
 */
function cornersOf(content, three) {
  const { Box3, Mesh, Vector3 } = three;
  /** @type {import("three").Vector3[]} */
  const corners = [];
  const box = new Box3();
  content.updateMatrixWorld(true);
  content.traverse((/** @type {import("three").Object3D} */ object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.computeBoundingBox();
    box.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z])
          corners.push(new Vector3(x, y, z));
  });
  return corners;
}

/**
 * Takes over the 3D viewer's camera and drawing once the model is in: the
 * opening view, a single slow turn, and frames drawn only while something
 * moves, where Prism draws every frame for as long as it lives.
 * @param {ModelViewer} viewer
 * @param {HTMLElement} panel
 * @param {ModelModules} modules
 */
function stageModel(viewer, panel, modules) {
  const { three, TrackballControls } = modules;
  const { Box3, Matrix4, Quaternion, Vector3 } = three;
  const camera = viewer.defaultCamera;
  const canvas = viewer.renderer.domElement;
  const target = new Vector3();
  const vertical = new Vector3(0, 1, 0);

  // Prism's loop asks for its next frame through this property; an empty one ends it after the frame already queued.
  viewer.animate = () => undefined;
  // Prism also makes a renderer for an axes inset it never shows; give back its context.
  viewer.axesRenderer.forceContextLoss();
  viewer.axesRenderer.dispose();
  viewer.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  viewer.state.bgColor = GROUND;
  viewer.updateBackground();
  finishBoard(viewer, three);

  const size = new Box3()
    .setFromObject(viewer.content)
    .getSize(new Vector3())
    .length();
  camera.fov = HOME.fov;
  camera.near = size / 50;
  camera.far = size * 50;
  // Prism's resize sets the camera's aspect from the frame, which every fit below reads.
  viewer.resize();

  const azimuth = (HOME.azimuth * Math.PI) / 180;
  const elevation = (HOME.elevation * Math.PI) / 180;
  const homeQuaternion = (() => {
    camera.position.set(
      -Math.cos(elevation) * Math.cos(azimuth),
      Math.sin(elevation),
      -Math.cos(elevation) * Math.sin(azimuth),
    );
    camera.up.copy(vertical);
    camera.lookAt(target);
    return camera.quaternion.clone();
  })();

  const corners = cornersOf(viewer.content, three);
  const projection = new Matrix4();
  const toCamera = new Matrix4();
  const eye = new Vector3();
  const unit = new Vector3(1, 1, 1);
  const point = new Vector3();
  const turn = new Quaternion();

  /**
   * Where the model's corners land on screen (-1 to 1 each way), seen from an orientation and distance.
   * @param {import("three").Quaternion} quaternion
   * @param {number} distance
   */
  function extent(quaternion, distance) {
    // The camera's own projection, without its lens shift.
    const top = camera.near * Math.tan((camera.fov * Math.PI) / 360);
    const right = top * camera.aspect;
    projection.makePerspective(
      -right,
      right,
      top,
      -top,
      camera.near,
      camera.far,
    );
    eye.set(0, 0, distance).applyQuaternion(quaternion);
    toCamera.compose(eye, quaternion, unit).invert();
    const box = { left: 1, right: -1, bottom: 1, top: -1 };
    for (const corner of corners) {
      point.copy(corner).applyMatrix4(toCamera).applyMatrix4(projection);
      box.left = Math.min(box.left, point.x);
      box.right = Math.max(box.right, point.x);
      box.bottom = Math.min(box.bottom, point.y);
      box.top = Math.max(box.top, point.y);
    }
    return box;
  }

  /**
   * The distance at which the model, seen from an orientation, spans at most these fractions of the frame.
   * @param {import("three").Quaternion} quaternion
   * @param {{ width: number, height: number }} room
   */
  function distanceFor(quaternion, room) {
    let distance = size * 2;
    // Nearer corners grow faster than farther ones as the camera closes in, so this settles in a few steps.
    for (let step = 0; step < 8; step++) {
      const box = extent(quaternion, distance);
      const over = Math.max(
        (box.right - box.left) / 2 / room.width,
        (box.top - box.bottom) / 2 / room.height,
      );
      distance *= over;
      if (Math.abs(over - 1) < 0.002) break;
    }
    return distance;
  }

  /**
   * The opening view inside insets from the frame's edges, in CSS pixels: the
   * distance that fits the model there (and inside the frame all through its
   * turn), and the lens shift that centers it there.
   * @param {Insets} insets
   * @returns {Framing}
   */
  function framing(insets) {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    const room = {
      width: Math.max(0.2, 1 - (insets.left + insets.right) / width),
      height: Math.max(0.2, 1 - (insets.top + insets.bottom) / height),
    };
    let distance = distanceFor(homeQuaternion, room);
    for (let step = 1; step < 12; step++) {
      turn.setFromAxisAngle(vertical, (step * Math.PI) / 6);
      distance = Math.max(
        distance,
        distanceFor(turn.multiply(homeQuaternion), {
          width: 0.94,
          height: 0.92,
        }),
      );
    }
    const box = extent(homeQuaternion, distance);
    // Where the insets' center sits, from -1 to 1 each way.
    const x = (insets.left - insets.right) / width;
    const y = (insets.bottom - insets.top) / height;
    return {
      distance,
      shift: {
        x: ((box.left + box.right) / 2 - x) / 2,
        y: (y - (box.bottom + box.top) / 2) / 2,
      },
    };
  }

  /**
   * The insets the opening view keeps: the poster's margins, and the controls' where they reach further in.
   * @param {boolean} controls
   * @returns {Insets}
   */
  function clearance(controls) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const margins = {
      left: width * MARGIN.x,
      right: width * MARGIN.x,
      top: height * MARGIN.y,
      bottom: height * MARGIN.y,
    };
    if (!controls) return margins;
    const chrome = chromeInsets();
    return {
      ...margins,
      top: Math.max(margins.top, chrome.top),
      bottom: Math.max(margins.bottom, chrome.bottom),
    };
  }

  /** The opening view as the poster frames it, and clear of the controls. */
  function fits() {
    return {
      poster: framing(clearance(false)),
      home: framing(clearance(true)),
    };
  }

  /** Still at the opening view (or turning through it): a new frame shape refits it. */
  let untouched = true;
  let interacting = false;
  let changed = true;
  let shown = true;
  let frame = 0;
  /** @type {{ start: number | null, duration: number, ease: (t: number) => number, apply: (t: number) => void, spin: boolean } | null} */
  let motion = null;
  /** The lens shift, as fractions of the frame: it centers the model in the room the controls leave. */
  /** @type {Framing["shift"]} */
  let lens = { x: 0, y: 0 };
  let opening = fits();
  let controls = createControls();

  /**
   * Shifts the lens without moving the camera; Three.js would also square the aspect, which Prism set from the frame.
   * @param {Framing["shift"]} shift
   */
  function shiftLens(shift) {
    lens = shift;
    const aspect = camera.aspect;
    camera.setViewOffset(1, 1, shift.x, shift.y, 1, 1);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  /**
   * Between two views, by `t`.
   * @param {Framing} from
   * @param {Framing} to
   * @param {number} t
   * @returns {Framing}
   */
  function blend(from, to, t) {
    return {
      distance: from.distance + (to.distance - from.distance) * t,
      shift: {
        x: from.shift.x + (to.shift.x - from.shift.x) * t,
        y: from.shift.y + (to.shift.y - from.shift.y) * t,
      },
    };
  }

  /**
   * The camera at an orientation, at a view's distance and lens shift.
   * @param {import("three").Quaternion} quaternion
   * @param {Framing} view
   */
  function setView(quaternion, view) {
    place(quaternion, view.distance);
    shiftLens(view.shift);
  }

  /**
   * The camera at an orientation and distance from the target, as the trackball would leave it.
   * @param {import("three").Quaternion} quaternion
   * @param {number} length
   */
  function place(quaternion, length) {
    camera.quaternion.copy(quaternion);
    camera.position
      .set(0, 0, length)
      .applyQuaternion(quaternion)
      .add(controls.target);
    camera.up.set(0, 1, 0).applyQuaternion(quaternion);
  }

  /** Trackball controls as Prism configures them, which Prism resizes with the frame. */
  function createControls() {
    const created = new TrackballControls(camera, canvas);
    created.rotateSpeed = 1;
    created.zoomSpeed = 1.2;
    created.panSpeed = 0.8;
    created.minDistance = size * 0.6;
    created.maxDistance = size * 8;
    created.staticMoving = reducedMotion.matches;
    created.addEventListener("change", () => {
      changed = true;
    });
    created.addEventListener("start", () => {
      interacting = true;
      panel.dataset.dragging = "";
      untouched = false;
      motion = null;
      wake();
    });
    created.addEventListener("end", () => {
      interacting = false;
      delete panel.dataset.dragging;
      wake();
    });
    viewer.controls = created;
    return created;
  }

  /** Fresh controls: a new one carries no momentum. */
  function attachControls() {
    controls.dispose();
    controls = createControls();
  }

  /** @param {number} now */
  function tick(now) {
    frame = 0;
    if (!shown) return;
    if (motion !== null) {
      motion.start ??= now;
      const t = Math.min(1, (now - motion.start) / motion.duration);
      motion.apply(motion.ease(t));
      changed = true;
      if (t === 1) motion = null;
    }
    controls.update();
    const moved = changed;
    if (changed) viewer.render();
    changed = false;
    if (moved || interacting || motion !== null) wake();
  }

  function wake() {
    if (frame === 0 && shown) frame = requestAnimationFrame(tick);
  }

  /**
   * @param {number} duration
   * @param {(t: number) => void} apply
   * @param {(t: number) => number} [ease]
   */
  function animate(duration, apply, ease = easeOut) {
    if (reducedMotion.matches) {
      apply(1);
      motion = null;
      changed = true;
    } else motion = { start: null, duration, ease, apply, spin: false };
    wake();
  }

  /**
   * Turns the camera about the target, by a yaw about the vertical and a pitch about its own right.
   * @param {number} yaw
   * @param {number} pitch
   */
  function orbit(yaw, pitch) {
    untouched = false;
    const from = camera.quaternion.clone();
    const right = new Vector3(1, 0, 0).applyQuaternion(from);
    const to = new Quaternion()
      .setFromAxisAngle(vertical, yaw)
      .multiply(new Quaternion().setFromAxisAngle(right, pitch))
      .multiply(from);
    const length = camera.position.distanceTo(controls.target);
    const quaternion = new Quaternion();
    animate(240, (t) =>
      place(quaternion.slerpQuaternions(from, to, t), length),
    );
  }

  // As it fades in over the poster, the model matches it; reduced motion skips the fade.
  setView(
    homeQuaternion,
    reducedMotion.matches ? opening.home : opening.poster,
  );
  // After Prism's own resize, which sets the camera's aspect.
  addEventListener("resize", () => {
    opening = fits();
    if (untouched && motion === null) setView(homeQuaternion, opening.home);
    changed = true;
    wake();
  });

  if (!reducedMotion.matches) {
    const pose = new Quaternion();
    // Once the model has faded in, it makes room for the controls and turns
    // once, ending back at the opening view.
    setTimeout(() => {
      if (motion !== null || !untouched) return;
      motion = {
        start: null,
        duration: TURN_MS,
        ease: (t) => t,
        spin: true,
        apply: (t) => {
          turn.setFromAxisAngle(vertical, easeInOut(t) * Math.PI * 2);
          setView(
            pose.multiplyQuaternions(turn, homeQuaternion),
            blend(
              opening.poster,
              opening.home,
              easeInOut(Math.min(1, (t * TURN_MS) / MAKE_ROOM_MS)),
            ),
          );
        },
      };
      wake();
    }, 400);
  }

  return {
    show() {
      shown = true;
      viewer.resize();
      changed = true;
      wake();
    },
    hide() {
      shown = false;
      // The turn is an introduction: leaving the tab ends it, at the opening view.
      if (motion?.spin) {
        motion = null;
        setView(homeQuaternion, opening.home);
      }
      cancelAnimationFrame(frame);
      frame = 0;
    },
    /** @param {"in" | "out"} direction */
    zoom(direction) {
      untouched = false;
      const from = camera.position.distanceTo(controls.target);
      const to = Math.min(
        controls.maxDistance,
        Math.max(
          controls.minDistance,
          from * (direction === "in" ? 1 / ZOOM_STEP : ZOOM_STEP),
        ),
      );
      const offset = new Vector3();
      animate(220, (t) => {
        offset
          .subVectors(camera.position, controls.target)
          .setLength(from + (to - from) * t);
        camera.position.addVectors(controls.target, offset);
      });
    },
    reset() {
      const fromQuaternion = camera.quaternion.clone();
      const from = {
        distance: camera.position.distanceTo(controls.target),
        shift: lens,
      };
      const fromTarget = controls.target.clone();
      const quaternion = new Quaternion();
      attachControls();
      untouched = true;
      animate(
        560,
        (t) => {
          controls.target.lerpVectors(fromTarget, target, t);
          quaternion.slerpQuaternions(fromQuaternion, homeQuaternion, t);
          setView(quaternion, blend(from, opening.home, t));
        },
        easeInOut,
      );
    },
    /** Arrow keys turn the model, as a drag would. @param {KeyboardEvent} event */
    key(event) {
      const step = event.shiftKey ? 45 : 15;
      /** @type {Record<string, [number, number] | undefined>} */
      const turns = {
        ArrowLeft: [step, 0],
        ArrowRight: [-step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      };
      const degrees = turns[event.key];
      if (degrees === undefined) return false;
      orbit((degrees[0] * Math.PI) / 180, (degrees[1] * Math.PI) / 180);
      return true;
    },
  };
}

/**
 * The 3D tab: Prism's 3D viewer on the board's GLB export.
 * @param {HTMLElement} panel
 * @param {URL} url
 * @returns {View}
 */
function modelView(panel, url) {
  const host = part(panel, ".canvas");
  /** @type {{ kind: "idle" } | { kind: "loading" } | { kind: "ready", stage: ReturnType<typeof stageModel> } | { kind: "failed" }} */
  let state = { kind: "idle" };
  let shown = true;
  const retry = () => void load();

  /** @param {string} error @param {(() => void) | null} again */
  function failed(error, again) {
    state = { kind: "failed" };
    panel.dataset.state = "failed";
    setStatus(panel, { kind: "error", text: error, retry: again });
  }

  async function load() {
    if (state.kind === "loading" || state.kind === "ready") return;
    state = { kind: "loading" };
    panel.dataset.state = "loading";
    setStatus(panel, { kind: "loading", text: "Loading the 3D model" });
    if (!canDrawWebGL()) {
      failed(
        "This browser can't draw 3D here (WebGL 2 is off or unsupported). The schematic tab still works.",
        null,
      );
      return;
    }
    const [file, modules] = await Promise.all([
      fetchBlob(url, "3D model"),
      loadModelModules(),
    ]);
    if (!modules.ok) return failed(modules.error, retry);
    if (!file.ok) return failed(file.error, retry);
    const mounted = await mountModel(host, URL.createObjectURL(file.value));
    if (!mounted.ok)
      return failed(
        "The 3D model couldn't be read. Try again, or reload the page.",
        retry,
      );
    const viewer = modelViewerOf(mounted.value);
    const staged =
      viewer === null
        ? fail("Prism's 3D element has no viewer behind it")
        : attempt(() => {
            modules.value.finishBoardModel(mounted.value);
            return stageModel(viewer, panel, modules.value);
          }, "Showing the 3D model");
    if (!staged.ok) {
      releaseModel(mounted.value);
      return failed(
        "The 3D model couldn't be shown. Reload the page to try again.",
        null,
      );
    }
    const stage = staged.value;
    state = { kind: "ready", stage };
    panel.dataset.state = "ready";
    setStatus(panel, { kind: "none" });
    if (!shown) stage.hide();
  }

  return {
    show() {
      shown = true;
      if (state.kind === "ready") state.stage.show();
      else void load();
    },
    hide() {
      shown = false;
      if (state.kind === "ready") state.stage.hide();
    },
    zoom(direction) {
      if (state.kind === "ready") state.stage.zoom(direction);
    },
    reset() {
      if (state.kind === "ready") state.stage.reset();
    },
    key(event) {
      return state.kind === "ready" && state.stage.key(event);
    },
  };
}

/**
 * The viewer behind Prism's 3D element, once it has loaded a model.
 * @param {HTMLElement} element
 * @returns {ModelViewer | null}
 */
function modelViewerOf(element) {
  if (!("_viewer_container" in element)) return null;
  // Prism's own name for it; Backplane's adapter reaches it the same way.
  // oxlint-disable-next-line no-underscore-dangle
  const viewer = element._viewer_container;
  return isModelViewer(viewer) ? viewer : null;
}

/**
 * Prism's own board or schematic viewer inside its element, once it has one.
 * @param {DocumentElement} element
 * @param {DocumentKind} kind
 * @returns {DocumentViewer | null}
 */
function innerViewer(element, kind) {
  const app = element.shadowRoot?.querySelector(
    kind === "pcb" ? "kc-board-app" : "kc-schematic-app",
  );
  const viewer = app != null && "viewer" in app ? app.viewer : null;
  return isDocumentViewer(viewer) ? viewer : null;
}

/**
 * Leaves out Prism's layers of these names each time it paints, which makes them anew.
 * @param {DocumentViewer} viewer
 * @param {string[]} names
 */
function hideLayers(viewer, names) {
  const create = viewer.create_layer_set.bind(viewer);
  viewer.create_layer_set = () => {
    const layers = create();
    for (const name of names) {
      const layer = layers.by_name(name);
      if (layer !== undefined) layer.visible = false;
    }
    return layers;
  };
}

/**
 * The schematic's sheet as it reads at any size: the paper filled a step
 * above the ground, so its edge is the fill's (KiCad's outline around it, a
 * hairline, goes), and its rules (RULES) stroked at least a device pixel
 * wide, where KiCad's hairlines would break up in a small frame.
 * @param {DocumentViewer} viewer
 */
function drawSheet(viewer) {
  const sheet = viewer.drawing_sheet;
  const items = sheet.items.bind(sheet);
  sheet.items = function* () {
    for (const item of items())
      if (!("comment" in item && item.comment === "page outline")) yield item;
  };
  const renderer = viewer.renderer;
  const rules = rulePaths(renderer);
  const endLayer = renderer.end_layer.bind(renderer);
  renderer.end_layer = () => {
    const layer = endLayer();
    if (!isCanvasLayer(layer)) return layer;
    for (const command of layer.commands) {
      if (!isDrawCommand(command)) continue;
      if (layer.name === ":DrawingSheet:Background" && command.fill !== null)
        command.fill = PAPER;
      if (command.stroke !== null && rules.has(command.path))
        keepPixelWide(command);
    }
    return layer;
  };
}

/**
 * The paths the renderer strokes the rules (RULES) along, from here on.
 * Prism keeps the layer it is recording to itself until the layer is done, so
 * a stroke is known by its path: while the renderer strokes a line, the
 * Path2D it makes is this page's own, and the paths made between an item's
 * `start_bbox` and `end_bbox` are that item's.
 * @param {DocumentViewer["renderer"]} renderer
 * @returns {WeakSet<Path2D>}
 */
function rulePaths(renderer) {
  /** @type {WeakSet<Path2D>} */
  const rules = new WeakSet();
  /** @type {Path2D[]} */
  let stroked = [];
  const NativePath = globalThis.Path2D;
  class StrokePath extends NativePath {
    /** @param {ConstructorParameters<typeof Path2D>} path */
    constructor(...path) {
      super(...path);
      stroked.push(this);
    }
  }
  const line = renderer.line.bind(renderer);
  renderer.line = (...shape) => {
    globalThis.Path2D = StrokePath;
    try {
      line(...shape);
    } finally {
      globalThis.Path2D = NativePath;
    }
  };
  const startBox = renderer.start_bbox.bind(renderer);
  renderer.start_bbox = () => {
    stroked = [];
    startBox();
  };
  const endBox = renderer.end_bbox.bind(renderer);
  renderer.end_bbox = (item) => {
    if (RULES.has(item.constructor.name))
      for (const path of stroked) rules.add(path);
    stroked = [];
    return endBox(item);
  };
  return rules;
}

/**
 * A stroke that stays at least a device pixel wide at any zoom.
 * @param {DrawCommand} command
 */
function keepPixelWide(command) {
  const width = command.stroke_width;
  const render = command.render.bind(command);
  command.render = (context) => {
    // World units to device pixels, as the layer is drawn.
    const { a, b } = context.getTransform();
    command.stroke_width = Math.max(width, 1 / Math.hypot(a, b));
    render(context);
  };
}

/**
 * The view on the site's ground, and every fit (Prism's, an adapter's, or
 * Reset's) eased out by `margin`, as Backplane's canvas presentation does to
 * keep pads and features past a board's outline in view.
 *
 * A board keeps Prism's colors, without the KiCad page around it, which would
 * only show as stray lines. A schematic takes the site's colors, on dark
 * paper instead of white, and fits its whole sheet where Prism fits only what
 * is drawn on it, so the frame and title block never sit under the controls.
 * @param {DocumentViewer} viewer
 * @param {DocumentKind} kind
 */
function present(viewer, kind) {
  const Color = viewer.renderer.background_color.constructor;
  if (kind === "pcb") {
    hideLayers(viewer, [":DrawingSheet"]);
    viewer.theme.background = Color.from_css(GROUND);
  } else {
    drawSheet(viewer);
    viewer.theme = {
      ...viewer.theme,
      ...Object.fromEntries(
        Object.entries(SCHEMATIC_COLORS).map(([name, css]) => [
          name,
          Color.from_css(css),
        ]),
      ),
    };
  }
  viewer.renderer.background_color = viewer.theme.background;
  if (viewer.renderer.gl)
    viewer.renderer.gl.clearColor(...viewer.theme.background.to_array());
  const camera = viewer.viewport.camera;
  const fitTight =
    kind === "pcb"
      ? viewer.zoom_fit_top_item.bind(viewer)
      : () => {
          const sheet = viewer.drawing_sheet;
          camera.bbox = new camera.bbox.constructor(
            0,
            0,
            sheet.width,
            sheet.height,
          );
        };
  // The board's outline leaves out pads and jacks past it; the sheet's paper has its own margin.
  const margin = kind === "pcb" ? 0.88 : 1;
  viewer.zoom_fit_top_item = () => {
    fitTight();
    camera.zoom *= margin;
    viewer.draw();
  };
  viewer.paint();
  viewer.zoom_fit_top_item();
}

/**
 * The room the controls take, in CSS pixels from the frame's edges: the tabs
 * above, the view tools below, and the margin they keep at the sides.
 * @returns {Insets}
 */
function chromeInsets() {
  const tabBar = part(document, ".tabs").getBoundingClientRect();
  const tools = part(document, ".tools").getBoundingClientRect();
  return {
    top: tabBar.bottom + 4,
    bottom: innerHeight - tools.top + 4,
    left: tabBar.left,
    right: innerWidth - tools.right,
  };
}

/**
 * Fits leave room for the tabs above and the zoom controls below, and keep
 * their margin at the sides (a page's edge never runs off the frame), whatever
 * insets Prism or an adapter asks for besides.
 * @param {DocumentElement} element
 */
function reserveChrome(element) {
  const set = element.setViewportInsets.bind(element);
  element.setViewportInsets = (insets) => {
    const chrome = chromeInsets();
    set({
      left: Math.max(insets?.left ?? 0, chrome.left),
      right: Math.max(insets?.right ?? 0, chrome.right),
      top: Math.max(insets?.top ?? 0, chrome.top),
      bottom: Math.max(insets?.bottom ?? 0, chrome.bottom),
    });
  };
  element.setViewportInsets({});
}

/**
 * The PCB and schematic tabs: Prism's <ecad-viewer> on one KiCad file each.
 * @param {HTMLElement} panel
 * @param {URL} url
 * @param {DocumentKind} kind
 * @returns {View}
 */
function documentView(panel, url, kind) {
  const host = part(panel, ".canvas");
  const what = kind === "pcb" ? "PCB" : "schematic";
  /** @type {{ kind: "idle" } | { kind: "loading" } | { kind: "ready", element: DocumentElement, viewer: DocumentViewer } | { kind: "failed" }} */
  let state = { kind: "idle" };
  let shown = false;
  /** The camera as last fit; while it stays there, a resize fits again. */
  /** @type {{ zoom: number, x: number, y: number } | null} */
  let fitted = null;
  /** The frame changed size while this view was hidden: it fits again when shown. */
  let stale = false;
  const retry = () => void load();

  /** @param {string} error @param {(() => void) | null} again */
  function failed(error, again) {
    host.replaceChildren();
    state = { kind: "failed" };
    panel.dataset.state = "failed";
    setStatus(panel, { kind: "error", text: error, retry: again });
  }

  async function load() {
    if (state.kind === "loading" || state.kind === "ready") return;
    state = { kind: "loading" };
    panel.dataset.state = "loading";
    setStatus(panel, { kind: "loading", text: `Loading the ${what}` });
    // Prism draws the board with WebGL 2; the schematic is a 2D canvas.
    if (kind === "pcb" && !canDrawWebGL())
      return failed(
        "This browser can't draw the PCB here (WebGL 2 is off or unsupported). The schematic tab still works.",
        null,
      );
    const [file, modules] = await Promise.all([
      fetchText(url, what),
      loadDocumentModules(),
    ]);
    if (!modules.ok) return failed(modules.error, retry);
    if (!file.ok) return failed(file.error, retry);
    const element = document.createElement("ecad-viewer");
    if (!isDocumentElement(element))
      return failed(
        `The ${what} viewer didn't start. Reload the page to try again.`,
        null,
      );
    element.setAttribute("source-mode", "host");
    element.setAttribute("show-header", "false");
    element.setAttribute("hide-chrome", "");
    host.replaceChildren(element);
    const parsed = await inTurn(() =>
      settled(
        async () => {
          await element.replaceSources({
            revisionKey: url.pathname,
            sources: [
              {
                filename: fileName(url),
                content: file.value,
              },
            ],
          });
          await element.ready;
        },
        what,
        SOURCES.document,
      ),
    );
    const viewer = parsed.ok ? innerViewer(element, kind) : null;
    if (viewer === null)
      return failed(
        `The ${what} couldn't be read. Try again, or reload the page.`,
        retry,
      );
    const presented = attempt(() => {
      element.setActive(shown);
      reserveChrome(element);
      element.resize();
      present(viewer, kind);
      remember(viewer);
      modules.value.installNativeTouch(element);
      // The schematic adapter sharpens its canvas and refits on resize; the board fits here.
      if (kind === "schematic") modules.value.installSchematicSizing(element);
      else
        new ResizeObserver(() => {
          if (shown) refit(element, viewer);
          else stale = true;
        }).observe(host);
    }, `Showing the ${what}`);
    if (!presented.ok)
      return failed(
        `The ${what} couldn't be shown. Reload the page to try again.`,
        null,
      );
    // Prism draws on the next frame; the view fades in once it has.
    await nextFrame();
    await nextFrame();
    state = { kind: "ready", element, viewer };
    panel.dataset.state = "ready";
    setStatus(panel, { kind: "none" });
  }

  /**
   * The view at the frame's size, fit again unless someone moved it.
   * @param {DocumentElement} element
   * @param {DocumentViewer} viewer
   */
  function refit(element, viewer) {
    stale = false;
    element.setViewportInsets({});
    element.resize();
    if (fitted !== null && same(viewer, fitted)) {
      viewer.zoom_fit_top_item();
      remember(viewer);
    }
  }

  /** @param {DocumentViewer} viewer */
  function remember(viewer) {
    const camera = viewer.viewport.camera;
    fitted = { zoom: camera.zoom, x: camera.center.x, y: camera.center.y };
  }

  /** @param {DocumentViewer} viewer @param {{ zoom: number, x: number, y: number }} camera */
  function same(viewer, camera) {
    const now = viewer.viewport.camera;
    return (
      Math.abs(now.zoom / camera.zoom - 1) < 0.001 &&
      Math.hypot(now.center.x - camera.x, now.center.y - camera.y) * now.zoom <
        1
    );
  }

  return {
    show() {
      shown = true;
      if (state.kind === "ready") {
        state.element.setActive(true);
        if (stale) refit(state.element, state.viewer);
        else state.element.resize();
      } else void load();
    },
    hide() {
      shown = false;
      if (state.kind === "ready") state.element.setActive(false);
    },
    /** @param {"in" | "out"} direction */
    zoom(direction) {
      if (state.kind !== "ready") return;
      state.viewer.viewport.camera.zoom *=
        direction === "in" ? ZOOM_STEP : 1 / ZOOM_STEP;
      state.viewer.draw();
    },
    reset() {
      if (state.kind !== "ready") return;
      state.viewer.zoom_fit_top_item();
      remember(state.viewer);
    },
    /** Arrow keys pan the sheet a little at a time. @param {KeyboardEvent} event */
    key(event) {
      if (state.kind !== "ready") return false;
      /** @type {Record<string, [number, number] | undefined>} */
      const moves = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const move = moves[event.key];
      if (move === undefined) return false;
      const camera = state.viewer.viewport.camera;
      const step = (event.shiftKey ? 160 : 48) / camera.zoom;
      camera.center.set(
        camera.center.x + move[0] * step,
        camera.center.y + move[1] * step,
      );
      state.viewer.draw();
      return true;
    },
  };
}

/**
 * Tabs per the ARIA pattern: arrows, Home, and End move between them and select.
 * @param {Map<HTMLElement, View>} views
 */
function tabs(views) {
  const list = part(document, '[role="tablist"]');
  const all = [...list.querySelectorAll('[role="tab"]')].filter(
    (tab) => tab instanceof HTMLElement,
  );
  let current = part(list, '[aria-selected="true"]');

  /** @param {HTMLElement} tab @param {boolean} focus */
  function select(tab, focus) {
    for (const each of all) {
      const on = each === tab;
      each.setAttribute("aria-selected", String(on));
      each.tabIndex = on ? 0 : -1;
      part(document, `#${each.getAttribute("aria-controls") ?? ""}`).hidden =
        !on;
    }
    if (focus) tab.focus();
    if (tab === current) return;
    views.get(current)?.hide();
    current = tab;
    views.get(tab)?.show();
  }

  for (const tab of all) {
    tab.addEventListener("click", () => select(tab, false));
    // Pointing at a tab warms its viewer's code.
    if (tab.id !== "tab-3d") {
      tab.addEventListener("pointerenter", () => void loadDocumentModules());
      tab.addEventListener("focus", () => void loadDocumentModules());
    }
  }
  list.addEventListener("keydown", (event) => {
    const index = all.indexOf(current);
    const next =
      event.key === "ArrowRight"
        ? all[(index + 1) % all.length]
        : event.key === "ArrowLeft"
          ? all[(index - 1 + all.length) % all.length]
          : event.key === "Home"
            ? all[0]
            : event.key === "End"
              ? all.at(-1)
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    select(next, true);
  });

  return { active: () => views.get(current), selected: () => current };
}

/**
 * Esc, unless the viewer used it, goes on to the page around the frame, so it
 * closes the project there as it does everywhere else on the site.
 */
function forwardEscape() {
  addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    const frame = window.frameElement;
    const outer = frame?.ownerDocument.defaultView;
    if (!frame || !outer || frame.ownerDocument.fullscreenElement) return;
    // Closing drops this frame, and focus with it; from the box around the
    // frame, the page can still hand it back to the project's row.
    const box = frame.parentElement;
    if (box instanceof outer.HTMLElement) box.focus({ preventScroll: true });
    frame.dispatchEvent(
      new outer.KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

function start() {
  if (window.parent === window)
    document.documentElement.dataset.standalone = "";
  forwardEscape();
  const board = readBoard();
  const firstPanel = part(document, "#view-3d");
  if (!board.ok) {
    setStatus(firstPanel, { kind: "error", text: board.error, retry: null });
    return;
  }
  // Named for the board, for when it opens in a tab of its own.
  const name = fileName(board.value.pcb).replace(/\.kicad_pcb$/, "");
  if (name !== "") document.title = `${name} board`;
  /** @type {Map<HTMLElement, View>} */
  const views = new Map([
    [part(document, "#tab-3d"), modelView(firstPanel, board.value.model)],
    [
      part(document, "#tab-pcb"),
      documentView(part(document, "#view-pcb"), board.value.pcb, "pcb"),
    ],
    [
      part(document, "#tab-schematic"),
      documentView(
        part(document, "#view-schematic"),
        board.value.schematic,
        "schematic",
      ),
    ],
  ]);
  const tabList = tabs(views);
  // A focused view takes arrows (turn or pan) and + or - (zoom).
  for (const panel of document.querySelectorAll('[role="tabpanel"]')) {
    if (!(panel instanceof HTMLElement)) continue;
    panel.addEventListener("keydown", (event) => {
      if (
        event.target !== panel ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      const view = tabList.active();
      const zoom =
        event.key === "+" || event.key === "="
          ? "in"
          : event.key === "-" || event.key === "_"
            ? "out"
            : null;
      if (zoom !== null) view?.zoom(zoom);
      else if (!view?.key(event)) return;
      event.preventDefault();
    });
  }
  for (const button of document.querySelectorAll(".tool")) {
    if (!(button instanceof HTMLElement)) continue;
    button.addEventListener("click", () => {
      const view = tabList.active();
      const action = button.dataset.action;
      if (action === "reset") view?.reset();
      else view?.zoom(action === "in" ? "in" : "out");
    });
  }
  // Opened from the keyboard, the page hands focus in here: it lands on the selected tab.
  if (document.hasFocus() && window.frameElement !== null)
    tabList.selected().focus();
  views.get(tabList.selected())?.show();
}

start();
