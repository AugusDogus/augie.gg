import type { GlScope, RenderTarget } from "./gl";
import type { SkyFrame } from "./pod";
import {
  BEAD_FRAGMENT,
  BEAD_VERTEX,
  WHALE_FRAGMENT,
  WHALE_VERTEX,
} from "./shaders";
import {
  BEAD_FLOATS,
  BODY_SLOTS,
  STREAM_IDS,
  type Stream,
  type StreamId,
} from "./streams";
import { WISP_BEADS, WISP_COUNT } from "./trail";
import { VERTEX_FLOATS, WHALE_INDICES } from "./whale-body";

export const LIGHT_UNIT = 3;
export const WHALE_UNIT = 4;
const MASK_UNIT = 5;

type Locations = Record<
  "route" | "range" | "shape" | "look" | "clock" | "bodies" | "wakes",
  WebGLUniformLocation | null
>;
type BeadPass = {
  id: StreamId;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  count: number;
  at: Locations;
};

function beadProgram(scope: GlScope, label: string) {
  const gl = scope.gl;
  const program = scope.program(BEAD_VERTEX, BEAD_FRAGMENT, label, {
    bead: 0,
    fiber: 1,
  });
  gl.useProgram(program);
  gl.uniform1i(gl.getUniformLocation(program, "mask"), MASK_UNIT);
  const at = (name: string) => gl.getUniformLocation(program, name);
  const locations: Locations = {
    route: at("route[0]"),
    range: at("range"),
    shape: at("shape"),
    look: at("look"),
    clock: at("clock"),
    bodies: at("bodies[0]"),
    wakes: at("wakes[0]"),
  };
  return { program, at, locations };
}

function bindBeads(gl: WebGLRenderingContext, buffer: WebGLBuffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, BEAD_FLOATS * 4, 0);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, BEAD_FLOATS * 4, 16);
}

/**
 * Accumulates current beads into a 600x437 count buffer (one texel per print
 * cell) and whale silhouettes into a premultiplied 1200x874 buffer. The
 * composite prints both onto the dither grid.
 */
export class SkyLayer {
  private constructor(
    private gl: WebGLRenderingContext,
    private light: RenderTarget,
    private whales: RenderTarget,
    private beads: BeadPass[],
    private wisp: {
      program: WebGLProgram;
      buffer: WebGLBuffer;
      at: Locations;
      behind: WebGLUniformLocation | null;
    },
    private whale: {
      program: WebGLProgram;
      vertices: WebGLBuffer;
      indices: WebGLBuffer;
      tone: WebGLUniformLocation | null;
      look: WebGLUniformLocation | null;
      gate: WebGLUniformLocation | null;
      exit: WebGLUniformLocation | null;
      behind: WebGLUniformLocation | null;
    },
  ) {}

  static create(
    scope: GlScope,
    streams: Readonly<Record<StreamId, Stream>>,
    mask: Uint8Array,
    vertices: Float32Array,
  ) {
    const gl = scope.gl;
    scope.texture(MASK_UNIT, gl.LINEAR, "occluder mask");
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGB,
      600,
      437,
      0,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      mask,
    );
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    const light = scope.target(600, 437, LIGHT_UNIT, gl.NEAREST, "current");
    const whales = scope.target(1200, 874, WHALE_UNIT, gl.LINEAR, "whale");
    const beads = STREAM_IDS.map((id): BeadPass => {
      const { uniforms } = streams[id];
      const { program, at, locations } = beadProgram(scope, `${id} current`);
      gl.uniform4fv(locations.route, uniforms.route);
      gl.uniform4fv(locations.range, uniforms.range);
      gl.uniform4fv(locations.shape, uniforms.shape);
      gl.uniform4fv(locations.look, uniforms.look);
      gl.uniform1f(at("swell"), uniforms.swell);
      gl.uniform3fv(at("behind"), uniforms.behind);
      return {
        id,
        program,
        buffer: scope.buffer(
          gl.ARRAY_BUFFER,
          uniforms.beads,
          gl.STATIC_DRAW,
          `${id} current beads`,
        ),
        count: uniforms.count,
        at: locations,
      };
    });
    const wisp = beadProgram(scope, "wisp");
    const empty = new Float32Array(BODY_SLOTS * 4);
    for (let k = 0; k < BODY_SLOTS; k++) empty[k * 4 + 2] = 1;
    gl.uniform4fv(wisp.locations.bodies, empty);
    gl.uniform1f(wisp.at("swell"), 0);
    const program = scope.program(WHALE_VERTEX, WHALE_FRAGMENT, "whale", {
      vertex: 0,
    });
    gl.useProgram(program);
    const at = (name: string) => gl.getUniformLocation(program, name);
    gl.uniform1i(at("mask"), MASK_UNIT);
    return new SkyLayer(
      gl,
      light,
      whales,
      beads,
      {
        program: wisp.program,
        buffer: scope.buffer(
          gl.ARRAY_BUFFER,
          WISP_BEADS,
          gl.STATIC_DRAW,
          "wisp beads",
        ),
        at: wisp.locations,
        behind: wisp.at("behind"),
      },
      {
        program,
        vertices: scope.buffer(
          gl.ARRAY_BUFFER,
          vertices,
          gl.DYNAMIC_DRAW,
          "whale vertex",
        ),
        indices: scope.buffer(
          gl.ELEMENT_ARRAY_BUFFER,
          WHALE_INDICES,
          gl.STATIC_DRAW,
          "whale index",
        ),
        tone: at("tone"),
        look: at("look"),
        gate: at("gate"),
        exit: at("exit"),
        behind: at("behind"),
      },
    );
  }

  render(frame: SkyFrame) {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.light.framebuffer);
    gl.viewport(0, 0, this.light.width, this.light.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    for (const pass of this.beads) {
      const stream = frame.streams[pass.id];
      gl.useProgram(pass.program);
      gl.uniform4fv(pass.at.clock, stream.clock);
      gl.uniform4fv(pass.at.bodies, stream.bodies);
      gl.uniform4fv(pass.at.wakes, stream.wakes);
      bindBeads(gl, pass.buffer);
      gl.drawArrays(gl.POINTS, 0, pass.count);
    }
    const wisp = this.wisp;
    gl.useProgram(wisp.program);
    bindBeads(gl, wisp.buffer);
    for (const draw of frame.wisps) {
      if (!draw.visible) continue;
      gl.uniform4fv(wisp.at.route, draw.route);
      gl.uniform4fv(wisp.at.range, draw.range);
      gl.uniform4fv(wisp.at.shape, draw.shape);
      gl.uniform4fv(wisp.at.look, draw.look);
      gl.uniform4fv(wisp.at.clock, draw.clock);
      gl.uniform3fv(wisp.behind, draw.behind);
      gl.drawArrays(gl.POINTS, 0, WISP_COUNT);
    }
    gl.disableVertexAttribArray(1);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.whales.framebuffer);
    gl.viewport(0, 0, this.whales.width, this.whales.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const whale = this.whale;
    gl.useProgram(whale.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, whale.vertices);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, frame.vertices);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, whale.indices);
    for (const draw of frame.whales) {
      if ((draw.look[0] ?? 0) <= 0) continue;
      gl.uniform3fv(whale.tone, draw.tone);
      gl.uniform2fv(whale.look, draw.look);
      gl.uniform2fv(whale.gate, draw.gate);
      gl.uniform2fv(whale.exit, draw.exit);
      gl.uniform3fv(whale.behind, draw.behind);
      gl.vertexAttribPointer(
        0,
        4,
        gl.FLOAT,
        false,
        VERTEX_FLOATS * 4,
        draw.first * VERTEX_FLOATS * 4,
      );
      gl.drawElements(gl.TRIANGLES, WHALE_INDICES.length, gl.UNSIGNED_SHORT, 0);
    }
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}
