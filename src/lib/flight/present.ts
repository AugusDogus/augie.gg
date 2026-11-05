import type { GlScope, PendingProgram, RenderTarget } from "./gl";
import {
  MAX_SPECKS,
  SPECK_COLORS,
  forEachSpeckMark,
  type Speck,
} from "./specks";
import { ART_HEIGHT, ART_WIDTH, featherEdge, fitArt } from "./viewport";

const SCENE_UNIT = 7;
/** A speck is one mark, or two for a cross. */
const MAX_MARKS = MAX_SPECKS * 2;
/** Per mark: its art-px rect (x, y, width, height), alpha, and 1 for cyan. */
const MARK_FLOATS = 6;

const vec3 = (hex: string) =>
  `vec3(${[1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(6)).join(", ")})`;

/** The art rect of the drawing buffer, from the composite's -1..1 quad. */
const PAGE_VERTEX = `
attribute vec2 position;
uniform vec4 rect;
void main() {
  gl_Position = vec4(mix(rect.xy, rect.zw, position * .5 + .5), 0., 1.);
}`;

/**
 * The art-space scene under the viewport fit, sampled bilinear as drawImage
 * scales it, with the feather as alpha. Output is premultiplied.
 */
const PAGE_FRAGMENT = `
precision highp float;
uniform sampler2D scene;
uniform vec2 view;
uniform vec2 fit;
uniform vec3 edge;
void main() {
  vec2 art = vec2(gl_FragCoord.x - fit.y, view.y - gl_FragCoord.y) / fit.x;
  vec3 color = texture2D(scene, vec2(art.x / ${ART_WIDTH}., 1. - art.y / ${ART_HEIGHT}.)).rgb;
  float alpha = clamp(dot(edge.xy, art) + edge.z, 0., 1.);
  gl_FragColor = vec4(color * alpha, alpha);
}`;

/** One instance per mark: its rect in top-down buffer px, with a px of fringe. */
const MARK_VERTEX = `
attribute vec2 position;
attribute vec4 mark;
attribute vec2 shade;
uniform vec2 view;
uniform vec2 fit;
varying vec4 box;
varying vec2 tint;
void main() {
  box = vec4(fit.y + mark.x * fit.x, mark.y * fit.x,
    fit.y + (mark.x + mark.z) * fit.x, (mark.y + mark.w) * fit.x);
  tint = shade;
  vec2 p = mix(box.xy - 1., box.zw + 1., position * .5 + .5);
  gl_Position = vec4(p.x / view.x * 2. - 1., 1. - p.y / view.y * 2., 0., 1.);
}`;

/**
 * Box-filter coverage, as an antialiased fillRect. Blended by destination
 * alpha, so a mark stays inside the art and under its feather.
 */
const MARK_FRAGMENT = `
precision highp float;
uniform vec2 view;
varying vec4 box;
varying vec2 tint;
const vec3 WHITE = ${vec3(SPECK_COLORS.white)};
const vec3 CYAN = ${vec3(SPECK_COLORS.cyan)};
void main() {
  vec2 p = vec2(gl_FragCoord.x, view.y - gl_FragCoord.y);
  vec2 cover = clamp(min(p + .5, box.zw) - max(p - .5, box.xy), 0., 1.);
  float alpha = tint.x * cover.x * cover.y;
  gl_FragColor = vec4(mix(WHITE, CYAN, tint.y) * alpha, alpha);
}`;

export type PresentPrograms = { page: PendingProgram; marks: PendingProgram };

type Uniform = WebGLUniformLocation | null;

/**
 * Draws the composite's art-space scene onto the page canvas as the 2D path
 * draws it onto #sky: fitted, with the specks over it, then feathered. The
 * page then shows the canvas without copying it.
 */
export class Presenter {
  private marks = new Float32Array(MAX_MARKS * MARK_FLOATS);

  private constructor(
    private gl: WebGLRenderingContext,
    private instanced: ANGLE_instanced_arrays,
    /** The composite renders the scene here instead of the drawing buffer. */
    readonly scene: RenderTarget,
    private quad: WebGLBuffer,
    private page: {
      program: WebGLProgram;
      rect: Uniform;
      view: Uniform;
      fit: Uniform;
      edge: Uniform;
    },
    private specks: {
      program: WebGLProgram;
      buffer: WebGLBuffer;
      view: Uniform;
      fit: Uniform;
    },
  ) {}

  static compile(scope: GlScope): PresentPrograms {
    return {
      page: scope.compile(PAGE_VERTEX, PAGE_FRAGMENT, "page", { position: 0 }),
      marks: scope.compile(MARK_VERTEX, MARK_FRAGMENT, "speck", {
        position: 0,
        mark: 2,
        shade: 3,
      }),
    };
  }

  /**
   * `quad` is the composite's -1..1 quad. Null without instancing (nearly
   * every WebGL has it), leaving the page to copy the art-space frame.
   */
  static create(scope: GlScope, programs: PresentPrograms, quad: WebGLBuffer) {
    const gl = scope.gl;
    const instanced = gl.getExtension("ANGLE_instanced_arrays");
    if (!instanced) return null;
    const scene = scope.target(
      ART_WIDTH,
      ART_HEIGHT,
      SCENE_UNIT,
      gl.LINEAR,
      "scene",
    );
    const page = scope.linked(programs.page);
    gl.useProgram(page);
    gl.uniform1i(gl.getUniformLocation(page, "scene"), SCENE_UNIT);
    const marks = scope.linked(programs.marks);
    return new Presenter(
      gl,
      instanced,
      scene,
      quad,
      {
        program: page,
        rect: gl.getUniformLocation(page, "rect"),
        view: gl.getUniformLocation(page, "view"),
        fit: gl.getUniformLocation(page, "fit"),
        edge: gl.getUniformLocation(page, "edge"),
      },
      {
        program: marks,
        buffer: scope.buffer(
          gl.ARRAY_BUFFER,
          new Float32Array(MAX_MARKS * MARK_FLOATS),
          gl.DYNAMIC_DRAW,
          "speck mark",
        ),
        view: gl.getUniformLocation(marks, "view"),
        fit: gl.getUniformLocation(marks, "fit"),
      },
    );
  }

  /** Paints the rendered scene and `points` into the `width`x`height` drawing buffer. */
  draw(width: number, height: number, points: readonly Speck[]) {
    const fit = fitArt(width, height);
    if (!fit) return;
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const page = this.page;
    gl.useProgram(page.program);
    // Only the art rect: the rest of the buffer stays clear, as each
    // presentation or resize leaves it, like the 2D path's clearRect.
    gl.uniform4f(
      page.rect,
      (fit.x / width) * 2 - 1,
      1 - ((ART_HEIGHT * fit.scale) / height) * 2,
      ((fit.x + ART_WIDTH * fit.scale) / width) * 2 - 1,
      1,
    );
    gl.uniform2f(page.view, width, height);
    gl.uniform2f(page.fit, fit.scale, fit.x);
    gl.uniform3fv(page.edge, featherEdge(fit));
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const marks = this.marks;
    let count = 0;
    forEachSpeckMark(points, (x, y, w, h, alpha, cyan) => {
      if (count === MAX_MARKS) return;
      const at = count++ * MARK_FLOATS;
      marks[at] = x;
      marks[at + 1] = y;
      marks[at + 2] = w;
      marks[at + 3] = h;
      marks[at + 4] = alpha;
      marks[at + 5] = cyan ? 1 : 0;
    });
    if (count === 0) return;
    const specks = this.specks;
    gl.useProgram(specks.program);
    gl.uniform2f(specks.view, width, height);
    gl.uniform2f(specks.fit, fit.scale, fit.x);
    gl.bindBuffer(gl.ARRAY_BUFFER, specks.buffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      marks.subarray(0, count * MARK_FLOATS),
    );
    gl.enableVertexAttribArray(2);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, MARK_FLOATS * 4, 0);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, MARK_FLOATS * 4, 16);
    this.instanced.vertexAttribDivisorANGLE(2, 1);
    this.instanced.vertexAttribDivisorANGLE(3, 1);
    gl.enable(gl.BLEND);
    // Colour scales by the feather already in destination alpha; alpha stays.
    gl.blendFuncSeparate(gl.DST_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
    this.instanced.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, count);
    gl.disable(gl.BLEND);
    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
  }
}
