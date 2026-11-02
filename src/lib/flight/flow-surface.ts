import type { FlowState } from "./flow";
import { GlScope } from "./gl";
import type { SkyFrame } from "./pod";
import { COMPOSITE_FRAGMENT, FULLSCREEN_VERTEX } from "./shaders";
import { LIGHT_UNIT, SkyLayer, WHALE_UNIT } from "./sky-layer";
import type { Stream, StreamId } from "./streams";
import type { PrintedArt } from "./texture";
import { ART_HEIGHT, ART_WIDTH } from "./viewport";

export type SurfaceSources = {
  print: PrintedArt;
  image: HTMLImageElement;
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
};

/**
 * Owns all GPU resources. Creation failures leave the 2D renderer available,
 * and a lost context renders nothing until it is restored.
 */
export class FlowSurface {
  private scope: GlScope;
  private composite: Composite | null = null;
  private brushData = new Float32Array(32);

  private constructor(
    readonly canvas: HTMLCanvasElement,
    private gl: WebGLRenderingContext,
    private sources: SurfaceSources,
    private onRestore: () => void,
  ) {
    this.scope = new GlScope(gl);
    canvas.addEventListener("webglcontextlost", this.lose);
    canvas.addEventListener("webglcontextrestored", this.restore);
  }

  static create(sources: SurfaceSources, onRestore: () => void) {
    const canvas = document.createElement("canvas");
    canvas.width = ART_WIDTH;
    canvas.height = ART_HEIGHT;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: true,
    });
    if (!gl) return null;
    const surface = new FlowSurface(canvas, gl, sources, onRestore);
    try {
      surface.composite = surface.initialize();
      return surface;
    } catch (error) {
      console.warn(
        "Interactive artwork is unavailable. Using the 2D background.",
        error,
      );
      surface.dispose();
      return null;
    }
  }

  private initialize(): Composite {
    const gl = this.gl;
    const { print, image, cells, mask, streams, vertices } = this.sources;
    const sky = SkyLayer.create(this.scope, streams, mask, vertices);
    const program = this.scope.program(
      FULLSCREEN_VERTEX,
      COMPOSITE_FRAGMENT,
      "atmosphere",
      { position: 0 },
    );
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
    };
  }

  private lose = (event: Event) => {
    event.preventDefault();
    this.composite = null;
  };

  private restore = () => {
    this.scope = new GlScope(this.gl);
    try {
      this.composite = this.initialize();
      this.onRestore();
    } catch (error) {
      console.warn(
        "The artwork renderer could not recover its GPU context. Using the 2D background.",
        error,
      );
    }
  };

  render(time: number, brushes: FlowState["brushes"], sky: SkyFrame) {
    const gl = this.gl;
    const composite = this.composite;
    if (!composite || gl.isContextLost()) return null;
    composite.sky.render(sky);
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
    return this.canvas;
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
