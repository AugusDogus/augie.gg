import type { GlScope, RenderTarget } from "./gl";
import type { SkyFrame } from "./pod";
import {
  BEAD_FRAGMENT,
  BEAD_VERTEX,
  WHALE_FRAGMENT,
  WHALE_VERTEX,
} from "./shaders";
import { BEAD_FLOATS, STREAM_IDS, type Stream, type StreamId } from "./streams";
import { VERTEX_FLOATS, WHALE_INDICES } from "./whale-body";

export const LIGHT_UNIT = 3;
export const WHALE_UNIT = 4;
const MASK_UNIT = 5;

type BeadPass = {
  id: StreamId;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  count: number;
  clock: WebGLUniformLocation | null;
  bodies: WebGLUniformLocation | null;
  wakes: WebGLUniformLocation | null;
};

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
    private whale: {
      program: WebGLProgram;
      vertices: WebGLBuffer;
      indices: WebGLBuffer;
      tone: WebGLUniformLocation | null;
      look: WebGLUniformLocation | null;
      gate: WebGLUniformLocation | null;
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
      gl.LUMINANCE,
      600,
      437,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      mask,
    );
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    const light = scope.target(600, 437, LIGHT_UNIT, gl.NEAREST, "current");
    const whales = scope.target(1200, 874, WHALE_UNIT, gl.LINEAR, "whale");
    const beads = STREAM_IDS.map((id): BeadPass => {
      const { uniforms } = streams[id];
      const program = scope.program(
        BEAD_VERTEX,
        BEAD_FRAGMENT,
        `${id} current`,
        { bead: 0, fiber: 1 },
      );
      gl.useProgram(program);
      const at = (name: string) => gl.getUniformLocation(program, name);
      gl.uniform1i(at("mask"), MASK_UNIT);
      gl.uniform4fv(at("route[0]"), uniforms.route);
      gl.uniform4fv(at("range"), uniforms.range);
      gl.uniform4fv(at("shape"), uniforms.shape);
      gl.uniform4fv(at("look"), uniforms.look);
      gl.uniform1f(at("swell"), uniforms.swell);
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
        clock: at("clock"),
        bodies: at("bodies[0]"),
        wakes: at("wakes[0]"),
      };
    });
    const program = scope.program(WHALE_VERTEX, WHALE_FRAGMENT, "whale", {
      vertex: 0,
    });
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, "mask"), MASK_UNIT);
    return new SkyLayer(gl, light, whales, beads, {
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
      tone: gl.getUniformLocation(program, "tone"),
      look: gl.getUniformLocation(program, "look"),
      gate: gl.getUniformLocation(program, "gate"),
    });
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
      gl.uniform4fv(pass.clock, stream.clock);
      gl.uniform4fv(pass.bodies, stream.bodies);
      gl.uniform4fv(pass.wakes, stream.wakes);
      gl.bindBuffer(gl.ARRAY_BUFFER, pass.buffer);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, BEAD_FLOATS * 4, 0);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, BEAD_FLOATS * 4, 16);
      gl.drawArrays(gl.POINTS, 0, pass.count);
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
