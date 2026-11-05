/**
 * The board viewer augie.gg frames: a board's 3D model, PCB, and schematic in
 * three tabs. The page around it names the files as same-origin URLs:
 *
 *   embed.html?model=/work/x/board.glb&pcb=/work/x/x.kicad_pcb&schematic=/work/x/x.kicad_sch
 *
 * The 3D view is KiCAD-Prism's <ecad-3d-viewer>, finished by Backplane's model
 * appearance adapter; the PCB and schematic are Prism's <ecad-viewer>. Every
 * vendored file stays as shipped: this adapts them at runtime, as Backplane's
 * runtime does, without its postMessage protocol.
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

/**
 * @template T
 * @typedef {{ ok: true, value: T } | { ok: false, error: string }} Result
 */

/** @template T @param {T} value @returns {Result<T>} */
const ok = (value) => ({ ok: true, value });
/** @param {string} error @returns {Result<never>} */
const fail = (error) => ({ ok: false, error });

/** A file named by the page around the viewer; only this site's own files open. */
function sameOriginUrl(params, name) {
  const value = params.get(name);
  if (value === null)
    return fail(`The viewer was opened without a ${name} file.`);
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

/** Status in a view: nothing, a loading line, or an error with a way to try again. */
function setStatus(panel, status) {
  const box = panel.querySelector(".status");
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

/** A file's bytes, reporting progress when the server gives a length. */
async function fetchBlob(url, what, onProgress) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    return fail(
      `The ${what} didn't load. Check your connection and try again.`,
    );
  }
  if (!response.ok || response.body === null)
    return fail(
      `The ${what} didn't load (HTTP ${response.status}). Try again, or reload the page.`,
    );
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (total > 0) onProgress(Math.min(1, received / total));
    }
  } catch {
    return fail(
      `The ${what} stopped loading partway. Check your connection and try again.`,
    );
  }
  return ok(new Blob(chunks));
}

/** A URL's file name, as KiCad wrote it; a malformed escape stays as it came. */
function fileName(url) {
  const last = url.pathname.split("/").at(-1) ?? "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

async function fetchText(url, what) {
  const blob = await fetchBlob(url, what, () => undefined);
  return blob.ok ? ok(await blob.value.text()) : blob;
}

/** Imports a module once, as a value: a failed import can be tried again. */
function lazyModule(load, what) {
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

const loadModelModules = lazyModule(
  () =>
    Promise.all([
      import("three"),
      import("three/addons/controls/TrackballControls.js"),
      import("./model-appearance.js"),
      import("./3d-viewer.js"),
    ]).then(([three, trackball, appearance]) => ({
      three,
      TrackballControls: trackball.TrackballControls,
      finishBoardModel: appearance.finishBoardModel,
    })),
  "3D",
);

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

const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(resolve));

const easeInOut = (t) => 0.5 - Math.cos(Math.PI * t) / 2;
const easeOut = (t) => 1 - (1 - t) ** 3;

/** How long Prism gets to show a file that is already here before the view gives up on it. */
const SETTLE_MS = 30000;

/**
 * Prism's work on a file, as a value. Prism reports some failures only as an
 * uncaught error or rejection in this window, and a stall not at all, so
 * those and a deadline fail it too. The browser still logs what was thrown.
 */
function settled(work, what) {
  return new Promise((resolve) => {
    const done = (result) => {
      clearTimeout(timer);
      removeEventListener("error", thrown);
      removeEventListener("unhandledrejection", thrown);
      resolve(result);
    };
    const thrown = () => done(fail(`${what}: Prism threw while loading`));
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

/** A step through Prism's or an adapter's internals that may throw, as a value; the cause goes to the console. */
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
 */
async function mountModel(host, src) {
  const project = Object.assign(new EventTarget(), {
    loaded: Promise.resolve(),
    ov_3d_url: src,
  });
  const provide = (event) => {
    if (event.context_name === "project") event.callback(project);
  };
  const element = document.createElement("ecad-3d-viewer");
  host.addEventListener("context-request", provide);
  const mounted = await settled(
    () =>
      new Promise((resolve) => {
        project.addEventListener("3d:viewer:loaded", () => resolve(element), {
          once: true,
        });
        host.append(element);
      }),
    "3D model",
  );
  host.removeEventListener("context-request", provide);
  URL.revokeObjectURL(src);
  if (!mounted.ok) element.remove();
  return mounted;
}

/**
 * Takes over the 3D viewer's camera and drawing once the model is in: the
 * opening view, a single slow turn, and frames drawn only while something
 * moves, where Prism draws every frame for as long as it lives.
 */
function stageModel(element, { three, TrackballControls }) {
  const { Box3, Quaternion, Vector3 } = three;
  // Prism's own name for the viewer behind the element; Backplane's adapter reaches it the same way.
  // oxlint-disable-next-line no-underscore-dangle
  const viewer = element._viewer_container;
  const camera = viewer.defaultCamera;
  const canvas = viewer.renderer.domElement;
  const panel = element.closest('[role="tabpanel"]');
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

  const size = new Box3()
    .setFromObject(viewer.content)
    .getSize(new Vector3())
    .length();
  camera.fov = HOME.fov;
  camera.near = size / 50;
  camera.far = size * 50;
  // A slight lens shift lifts the board, which perspective otherwise sets low in the frame.
  camera.setViewOffset(1, 1, 0, 0.05, 1, 1);
  camera.updateProjectionMatrix();

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

  /**
   * How far the opening view stands back in this frame's shape: the board's
   * span takes most of the width, and its tilted depth most of the height.
   */
  function homeDistance() {
    const half = Math.tan((camera.fov * Math.PI) / 360);
    const across = size / (0.8 * 2 * half * camera.aspect);
    const down = (size * 0.62) / (0.7 * 2 * half);
    return Math.max(across, down);
  }

  let controls;
  /** Still at the opening view (or turning through it): a new frame shape refits it. */
  let untouched = true;
  let interacting = false;
  let changed = true;
  let shown = true;
  let frame = 0;
  /** @type {{ start: number | null, duration: number, ease: (t: number) => number, apply: (t: number) => void, spin: boolean } | null} */
  let motion = null;

  /** The camera at an orientation and distance from the target, as the trackball would leave it. */
  function place(quaternion, length) {
    camera.quaternion.copy(quaternion);
    camera.position
      .set(0, 0, length)
      .applyQuaternion(quaternion)
      .add(controls.target);
    camera.up.set(0, 1, 0).applyQuaternion(quaternion);
  }

  /** Fresh trackball controls, as Prism configures them: a new one carries no momentum. */
  function attachControls() {
    controls?.dispose();
    controls = new TrackballControls(camera, canvas);
    controls.rotateSpeed = 1;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.minDistance = size * 0.6;
    controls.maxDistance = size * 8;
    controls.staticMoving = reducedMotion.matches;
    controls.addEventListener("change", () => {
      changed = true;
    });
    controls.addEventListener("start", () => {
      interacting = true;
      panel.dataset.dragging = "";
      untouched = false;
      motion = null;
      wake();
    });
    controls.addEventListener("end", () => {
      interacting = false;
      delete panel.dataset.dragging;
      wake();
    });
    // Prism resizes whichever controls it holds.
    viewer.controls = controls;
  }

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

  function animate(duration, apply, ease = easeOut) {
    if (reducedMotion.matches) {
      apply(1);
      motion = null;
      changed = true;
    } else motion = { start: null, duration, ease, apply, spin: false };
    wake();
  }

  /** Turns the camera about the target, by a yaw about the vertical and a pitch about its own right. */
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

  attachControls();
  // Setting the lens shift reset the camera's aspect; Prism's resize sets it from the frame again.
  viewer.resize();
  place(homeQuaternion, homeDistance());
  // After Prism's own resize, which sets the camera's aspect.
  addEventListener("resize", () => {
    if (untouched && !motion?.spin) place(homeQuaternion, homeDistance());
    changed = true;
    wake();
  });

  if (!reducedMotion.matches) {
    const turn = new Quaternion();
    const pose = new Quaternion();
    // A beat after the model fades in; the turn ends back at the opening view.
    setTimeout(() => {
      if (motion !== null || !untouched) return;
      motion = {
        start: null,
        duration: TURN_MS,
        ease: easeInOut,
        spin: true,
        apply: (t) => {
          turn.setFromAxisAngle(vertical, t * Math.PI * 2);
          place(pose.multiplyQuaternions(turn, homeQuaternion), homeDistance());
        },
      };
      wake();
    }, 700);
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
      // The turn is an introduction: leaving the tab ends it.
      if (motion?.spin) motion = null;
      cancelAnimationFrame(frame);
      frame = 0;
    },
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
      const fromDistance = camera.position.distanceTo(controls.target);
      const fromTarget = controls.target.clone();
      const quaternion = new Quaternion();
      attachControls();
      untouched = true;
      animate(
        560,
        (t) => {
          controls.target.lerpVectors(fromTarget, target, t);
          quaternion.slerpQuaternions(fromQuaternion, homeQuaternion, t);
          place(quaternion, fromDistance + (homeDistance() - fromDistance) * t);
        },
        easeInOut,
      );
    },
    /** Arrow keys turn the model, as a drag would. */
    key(event) {
      const step = event.shiftKey ? 45 : 15;
      const turns = {
        ArrowLeft: [step, 0],
        ArrowRight: [-step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      };
      const turn = turns[event.key];
      if (turn === undefined) return false;
      orbit((turn[0] * Math.PI) / 180, (turn[1] * Math.PI) / 180);
      return true;
    },
  };
}

/** The 3D tab: Prism's 3D viewer on the board's GLB export. */
function modelView(panel, url) {
  const host = panel.querySelector(".canvas");
  /** @type {{ kind: "idle" } | { kind: "loading" } | { kind: "ready", stage: ReturnType<typeof stageModel> } | { kind: "failed" }} */
  let state = { kind: "idle" };
  let shown = true;

  function failed(error, retry) {
    state = { kind: "failed" };
    panel.dataset.state = "failed";
    setStatus(panel, { kind: "error", text: error, retry });
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
      fetchBlob(url, "3D model", (progress) =>
        setStatus(panel, {
          kind: "loading",
          text: `Loading the 3D model, ${Math.round(progress * 100)}%`,
        }),
      ),
      loadModelModules(),
    ]);
    if (!modules.ok) return failed(modules.error, load);
    if (!file.ok) return failed(file.error, load);
    const mounted = await mountModel(host, URL.createObjectURL(file.value));
    if (!mounted.ok)
      return failed(
        "The 3D model couldn't be read. Reload the page to try again.",
        null,
      );
    const staged = attempt(() => {
      modules.value.finishBoardModel(mounted.value);
      return stageModel(mounted.value, modules.value);
    }, "Showing the 3D model");
    if (!staged.ok) {
      mounted.value.remove();
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

/** Prism's own board or schematic viewer inside its element, once it has one. */
function innerViewer(element, kind) {
  return (
    element.shadowRoot?.querySelector(
      kind === "pcb" ? "kc-board-app" : "kc-schematic-app",
    )?.viewer ?? null
  );
}

/** Leaves out Prism's layers of these names each time it paints, which makes them anew. */
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
 * The view on the site's ground, and every fit (Prism's, an adapter's, or
 * Reset's) eased out by `margin`, as Backplane's canvas presentation does to
 * keep pads and features past a board's outline in view.
 *
 * A board keeps Prism's colors, without the KiCad page around it, which would
 * only show as stray lines. A schematic takes the site's colors, without the
 * white paper, and fits its whole sheet where Prism fits only what is drawn on
 * it, so the frame and title block never sit under the controls.
 */
function present(viewer, kind) {
  const Color = viewer.renderer.background_color.constructor;
  if (kind === "pcb") {
    hideLayers(viewer, [":DrawingSheet"]);
    viewer.theme.background = Color.from_css(GROUND);
  } else {
    hideLayers(viewer, [":DrawingSheet:Background"]);
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
 * Fits leave room for the tabs above and the zoom controls below, whatever
 * insets Prism or an adapter asks for besides.
 */
function reserveChrome(element) {
  const set = element.setViewportInsets.bind(element);
  element.setViewportInsets = (insets) => {
    const tabBar = document.querySelector(".tabs").getBoundingClientRect();
    const tools = document.querySelector(".tools").getBoundingClientRect();
    set({
      left: insets?.left ?? 0,
      right: insets?.right ?? 0,
      top: Math.max(insets?.top ?? 0, tabBar.bottom + 4),
      bottom: Math.max(insets?.bottom ?? 0, innerHeight - tools.top + 4),
    });
  };
  element.setViewportInsets({});
}

/** The PCB and schematic tabs: Prism's <ecad-viewer> on one KiCad file each. */
function documentView(panel, url, kind) {
  const host = panel.querySelector(".canvas");
  const what = kind === "pcb" ? "PCB" : "schematic";
  /** @type {{ kind: "idle" } | { kind: "loading" } | { kind: "ready", element: HTMLElement, viewer: any } | { kind: "failed" }} */
  let state = { kind: "idle" };
  let shown = false;
  /** The camera as last fit; while it stays there, a resize fits again. */
  let fitted = null;
  /** The frame changed size while this view was hidden: it fits again when shown. */
  let stale = false;

  function failed(error, retry) {
    host.replaceChildren();
    state = { kind: "failed" };
    panel.dataset.state = "failed";
    setStatus(panel, { kind: "error", text: error, retry });
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
    if (!modules.ok) return failed(modules.error, load);
    if (!file.ok) return failed(file.error, load);
    const element = document.createElement("ecad-viewer");
    element.setAttribute("source-mode", "host");
    element.setAttribute("show-header", "false");
    element.setAttribute("hide-chrome", "");
    host.replaceChildren(element);
    const parsed = await settled(async () => {
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
    }, what);
    const viewer = parsed.ok ? innerViewer(element, kind) : null;
    if (viewer === null)
      return failed(
        `The ${what} couldn't be read. Reload the page to try again.`,
        null,
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

  /** The view at the frame's size, fit again unless someone moved it. */
  function refit(element, viewer) {
    stale = false;
    element.setViewportInsets({});
    element.resize();
    if (fitted !== null && same(viewer, fitted)) {
      viewer.zoom_fit_top_item();
      remember(viewer);
    }
  }

  function remember(viewer) {
    const camera = viewer.viewport.camera;
    fitted = { zoom: camera.zoom, x: camera.center.x, y: camera.center.y };
  }

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
    /** Arrow keys pan the sheet a little at a time. */
    key(event) {
      if (state.kind !== "ready") return false;
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

/** Tabs per the ARIA pattern: arrows, Home, and End move between them and select. */
function tabs(views) {
  const list = document.querySelector('[role="tablist"]');
  const all = [...list.querySelectorAll('[role="tab"]')];
  let current = all[0];

  function select(tab, focus) {
    for (const each of all) {
      const on = each === tab;
      each.setAttribute("aria-selected", String(on));
      each.tabIndex = on ? 0 : -1;
      document.getElementById(each.getAttribute("aria-controls")).hidden = !on;
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
  const firstPanel = document.getElementById("view-3d");
  if (!board.ok) {
    setStatus(firstPanel, { kind: "error", text: board.error, retry: null });
    return;
  }
  // Named for the board, for when it opens in a tab of its own.
  const name = fileName(board.value.pcb).replace(/\.kicad_pcb$/, "");
  if (name !== "") document.title = `${name} board`;
  const views = new Map([
    [
      document.getElementById("tab-3d"),
      modelView(firstPanel, board.value.model),
    ],
    [
      document.getElementById("tab-pcb"),
      documentView(document.getElementById("view-pcb"), board.value.pcb, "pcb"),
    ],
    [
      document.getElementById("tab-schematic"),
      documentView(
        document.getElementById("view-schematic"),
        board.value.schematic,
        "schematic",
      ),
    ],
  ]);
  const tabList = tabs(views);
  // A focused view takes arrows (turn or pan) and + or - (zoom).
  for (const panel of document.querySelectorAll('[role="tabpanel"]')) {
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
