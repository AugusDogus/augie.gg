import type { FlowState } from "./flow";
import { GlScope, type PendingProgram } from "./gl";
import type { SkyFrame } from "./pod";
import { Presenter, type PresentPrograms } from "./present";
import { COMPOSITE_FRAGMENT, FULLSCREEN_VERTEX } from "./shaders";
import {
  LIGHT_UNIT,
  SkyLayer,
  WHALE_UNIT,
  type SkyPrograms,
} from "./sky-layer";
import type { Speck } from "./specks";
import type { Stream, StreamId } from "./streams";
import {
  blankCanvas,
  isOffscreen,
  type Canvas,
  type PrintedArt,
} from "./texture";
import { ART_HEIGHT, ART_WIDTH } from "./viewport";

export type SurfaceSources = {
  print: PrintedArt;
  image: ImageBitmap;
  /** 600x437 RGBA: the baked lattice cells, with the rig code in alpha. */
  cells: Uint8Array;
  /** 600x437 RGB occluder layers. */
  mask: Uint8Array;
  streams: Readonly<Record<StreamId, Stream>>;
  vertices: Float32Array;
};

type Composite = {
  program: WebGLProgram;
  quad: WebGLBuffer;
  sky: SkyLayer;
  time: WebGLUniformLocation | null;
  brushes: WebGLUniformLocation | null;
  rig: WebGLUniformLocation | null;
  presenter: Presenter | null;
};

type Programs = {
  sky: SkyPrograms;
  composite: PendingProgram;
  present: PresentPrograms;
};

/** What the page does once a lost GPU context blanks the canvas, and once it is rebuilt. */
export type ContextEvents = { lost(): void; restored(): void };

function compile(scope: GlScope): Programs {
  const sky = SkyLayer.compile(scope);
  const composite = scope.compile(
    FULLSCREEN_VERTEX,
    COMPOSITE_FRAGMENT,
    "atmosphere",
    { position: 0 },
  );
  return { sky, composite, present: Presenter.compile(scope) };
}

const UNAVAILABLE =
  "Interactive artwork is unavailable. Using the 2D background.";

// While the art animates, the page shows this canvas, feathered through
// its alpha. Without a preserved buffer each frame swaps in uncopied.
const CONTEXT: WebGLContextAttributes = {
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
  failIfMajorPerformanceCaveat: true,
};
const pageWebgl = (canvas: HTMLCanvasElement) =>
  canvas.getContext("webgl", CONTEXT);
/** The canvas's WebGL context. The two canvas types' overloads do not unify, so each branch calls its own. */
const webgl = (canvas: Canvas) =>
  isOffscreen(canvas) ? canvas.getContext("webgl", CONTEXT) : pageWebgl(canvas);

/**
 * A WebGL context whose programs are already compiling, so the driver works
 * while the artwork loads and prints. FlowSurface.create takes it over; until
 * then dispose() releases it.
 */
export class SurfaceStart {
  private taken = false;

  private constructor(
    readonly canvas: Canvas,
    readonly gl: WebGLRenderingContext,
    readonly scope: GlScope,
    readonly programs: Programs,
    /** Whether begin() made the canvas, and so may make another. */
    readonly ownsCanvas: boolean,
  ) {}

  /**
   * On `canvas`, the page's own handed to the worker, or on a new one. Null
   * without WebGL, or when its programs cannot even be issued.
   */
  static begin(canvas?: Canvas) {
    const target = canvas ?? blankCanvas(ART_WIDTH, ART_HEIGHT);
    const gl = webgl(target);
    if (!gl) return null;
    const scope = new GlScope(gl);
    try {
      const start = new SurfaceStart(
        target,
        gl,
        scope,
        compile(scope),
        canvas === undefined,
      );
      // Send the compiles now rather than with the next draw.
      gl.flush();
      return start;
    } catch (error) {
      console.warn(UNAVAILABLE, error);
      scope.dispose();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      target.width = 0;
      return null;
    }
  }

  /** The context for exactly one surface; null once taken or disposed. */
  take() {
    if (this.taken) return null;
    this.taken = true;
    return this;
  }

  /** Releases the context unless a surface took it. */
  dispose() {
    if (!this.take()) return;
    this.scope.dispose();
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.canvas.width = 0;
  }
}

/**
 * Owns all GPU resources. Creation failures leave the 2D renderer available,
 * and a lost context renders nothing until it is restored. The canvas holds
 * either the art-space frame, for drawImage, or the page's frame.
 */
export class FlowSurface {
  private composite: Composite | null = null;
  private brushData = new Float32Array(32);

  private constructor(
    readonly canvas: Canvas,
    private gl: WebGLRenderingContext,
    private scope: GlScope,
    private sources: SurfaceSources,
    private events: ContextEvents,
  ) {
    canvas.addEventListener("webglcontextlost", this.lose);
    canvas.addEventListener("webglcontextrestored", this.restore);
  }

  /**
   * Takes over `start`, or returns null for the 2D renderer. A start that was
   * refused (say, mid GPU restart) or lost while the artwork loaded, with
   * nothing yet listening to restore it, is begun again here on a new canvas.
   * The page's own canvas cannot be replaced: one lost that early leaves the
   * 2D renderer.
   */
  static create(
    sources: SurfaceSources,
    events: ContextEvents,
    start: SurfaceStart | null,
  ) {
    let owned = (start ?? SurfaceStart.begin())?.take();
    if (owned?.gl.isContextLost()) {
      const replaceable = owned.ownsCanvas;
      owned.scope.dispose();
      if (replaceable) owned.canvas.width = 0;
      owned = replaceable ? SurfaceStart.begin()?.take() : null;
    }
    if (!owned) return null;
    const { canvas, gl, scope, programs } = owned;
    const surface = new FlowSurface(canvas, gl, scope, sources, events);
    try {
      surface.composite = surface.initialize(programs);
      return surface;
    } catch (error) {
      console.warn(UNAVAILABLE, error);
      surface.dispose();
      return null;
    }
  }

  private initialize(programs: Programs): Composite {
    const gl = this.gl;
    const { print, image, cells, mask, streams, vertices } = this.sources;
    const sky = SkyLayer.create(
      this.scope,
      programs.sky,
      streams,
      mask,
      vertices,
    );
    const program = this.scope.linked(programs.composite);
    const quad = this.scope.buffer(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
      "atmosphere vertex",
    );
    const upload = (
      unit: number,
      filter: number,
      label: string,
      source: TexImageSource,
    ) => {
      this.scope.texture(unit, filter, label);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
    };
    upload(0, gl.LINEAR, "printed artwork", print.canvas);
    upload(1, gl.LINEAR, "original artwork", image);
    upload(6, gl.LINEAR, "paint", print.sample);
    // Raw bytes: the alpha channel is a rig code, not opacity.
    this.scope.texture(2, gl.NEAREST, "print cell");
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      600,
      437,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      cells,
    );
    gl.useProgram(program);
    for (const [name, unit] of [
      ["artwork", 0],
      ["originalArt", 1],
      ["cells", 2],
      ["paint", 6],
      ["light", LIGHT_UNIT],
      ["whales", WHALE_UNIT],
    ] as const)
      gl.uniform1i(gl.getUniformLocation(program, name), unit);
    gl.uniform1f(gl.getUniformLocation(program, "enabled"), 1);
    return {
      program,
      quad,
      sky,
      time: gl.getUniformLocation(program, "time"),
      brushes: gl.getUniformLocation(program, "brushes[0]"),
      rig: gl.getUniformLocation(program, "rig[0]"),
      presenter: this.presenter(programs.present, quad),
    };
  }

  /**
   * The presenter only saves copying each frame, so failing to build it (say,
   * its scene buffer refused while VRAM runs short) keeps the GPU composite
   * and leaves the page copying frames into #sky.
   */
  private presenter(programs: PresentPrograms, quad: WebGLBuffer) {
    try {
      return Presenter.create(this.scope, programs, quad);
    } catch (error) {
      console.warn(
        "The artwork renderer could not draw frames straight to the page. Copying each frame instead.",
        error,
      );
      return null;
    }
  }

  private lose = (event: Event) => {
    event.preventDefault();
    this.composite = null;
    this.events.lost();
  };

  private restore = () => {
    this.scope = new GlScope(this.gl);
    try {
      this.composite = this.initialize(compile(this.scope));
      this.events.restored();
    } catch (error) {
      console.warn(
        "The artwork renderer could not recover its GPU context. Using the 2D background.",
        error,
      );
    }
  };

  /** The art-space frame on the canvas at 1200x874, for drawImage; null while the context is lost. */
  render(time: number, brushes: FlowState["brushes"], sky: SkyFrame) {
    const composite = this.composite;
    if (!composite || this.gl.isContextLost()) return null;
    this.resize(ART_WIDTH, ART_HEIGHT);
    this.paintScene(composite, null, time, brushes, sky);
    return this.canvas;
  }

  /**
   * The page's frame on the canvas at `width`x`height` px: the scene fitted
   * and feathered as the 2D path draws #sky, with `specks` over it. False
   * while the context is lost, or without a presenter.
   */
  present(
    time: number,
    brushes: FlowState["brushes"],
    sky: SkyFrame,
    specks: readonly Speck[],
    width: number,
    height: number,
  ) {
    const composite = this.composite;
    const presenter = composite?.presenter;
    if (!composite || !presenter || this.gl.isContextLost()) return false;
    this.resize(width, height);
    this.paintScene(composite, presenter.scene.framebuffer, time, brushes, sky);
    // The browser may allocate a smaller buffer than asked for.
    presenter.draw(
      this.gl.drawingBufferWidth,
      this.gl.drawingBufferHeight,
      specks,
    );
    return true;
  }

  /** Assigning a size reallocates the buffer even when it is unchanged. */
  private resize(width: number, height: number) {
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  /** Renders the art-space scene into `target`, or the drawing buffer when null. */
  private paintScene(
    composite: Composite,
    target: WebGLFramebuffer | null,
    time: number,
    brushes: FlowState["brushes"],
    sky: SkyFrame,
  ) {
    const gl = this.gl;
    composite.sky.render(sky);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, ART_WIDTH, ART_HEIGHT);
    gl.useProgram(composite.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, composite.quad);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.brushData.fill(0);
    brushes.forEach((brush, index) =>
      this.brushData.set([brush.x, brush.y, brush.dx, brush.dy], index * 4),
    );
    gl.uniform4fv(composite.brushes, this.brushData);
    gl.uniform4fv(composite.rig, sky.rig);
    gl.uniform1f(composite.time, time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  dispose() {
    this.canvas.removeEventListener("webglcontextlost", this.lose);
    this.canvas.removeEventListener("webglcontextrestored", this.restore);
    this.composite = null;
    this.scope.dispose();
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.canvas.width = 0;
  }
}
