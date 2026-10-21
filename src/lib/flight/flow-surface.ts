import { BRUSH_RADIUS, type FlowState } from "./flow";

const vertex = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2(position.x * .5 + .5, .5 - position.y * .5);
  gl_Position = vec4(position, 0., 1.);
}`;
const fragment = `
precision highp float;
uniform sampler2D artwork;
uniform sampler2D originalArt;
uniform sampler2D whaleArt;
uniform float time;
uniform float enabled;
uniform vec4 brushes[8];
varying vec2 uv;
vec3 filtered(vec2 point) {
  vec4 whale = texture2D(whaleArt, point);
  return mix(texture2D(artwork, point).rgb, whale.rgb, whale.a);
}
void main() {
  // Broad spatial weights keep the printed texture coherent. Sampling luminance
  // here would make individual dither dots wobble and create a watery surface.
  float clouds = 1. - smoothstep(.25, .85, uv.x);
  vec2 shipRegion = (uv - vec2(.70, .46)) / vec2(.29, .19);
  float vessel = exp(-dot(shipRegion, shipRegion) * 2.);
  float depth = (.45 + .55 * clouds) * (1. - .5 * vessel);
  vec2 wind = vec2(
    sin(uv.y * 10. + time * .7) + .5 * cos(uv.x * 7. - time * .5),
    cos(uv.x * 9. + time * .55) + .4 * sin(uv.y * 8. - time * .8)
  ) * vec2(.013, .009) * depth;
  vec2 drift = vec2(sin(time * .22) * .004, cos(time * .19) * .002);
  drift += clouds * vec2(sin(time * .31) * .010, cos(time * .26) * .003);
  drift.y += vessel * sin(time * .4) * .002;
  vec2 point = uv + (drift + wind) * .35 * enabled;
  point = (point - .5) * mix(1., .94, enabled) + .5;
  point = clamp(point, .001, .999);
  vec2 push = vec2(0.);
  float weight = 0.;
  for (int i = 0; i < 8; i++) {
    vec2 delta = (uv - brushes[i].xy) * vec2(1200., 874.);
    float falloff = max(0., 1. - dot(delta, delta) / ${BRUSH_RADIUS * BRUSH_RADIUS}.);
    float influence = falloff * falloff * step(.001, length(brushes[i].zw));
    push += brushes[i].zw * influence;
    weight += influence;
  }
  push /= max(1., weight);
  vec3 color = filtered(point);
  if (length(push) > .001) {
    vec2 shifted = clamp(point - push / vec2(1200., 874.), .001, .999);
    // Move only the filter residual. The underlying image stays at 'point'.
    vec3 filter = filtered(shifted) - texture2D(originalArt, shifted).rgb;
    color = texture2D(originalArt, point).rgb + filter;
  }
  gl_FragColor = vec4(clamp(color, 0., 1.), 1.);
}`;

/** Owns all GPU resources. Creation failures leave the 2D renderer available. */
export class FlowSurface {
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private textures: WebGLTexture[] = [];
  private shaders: WebGLShader[] = [];
  private source: HTMLCanvasElement | null = null;
  private originalSource: HTMLImageElement | null = null;
  private brushData = new Float32Array(32);
  private uniforms: {
    time: WebGLUniformLocation | null;
    enabled: WebGLUniformLocation | null;
    brushes: WebGLUniformLocation | null;
  } = { time: null, enabled: null, brushes: null };

  private constructor(
    readonly canvas: HTMLCanvasElement,
    private gl: WebGLRenderingContext,
  ) {}

  static create() {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) return null;
    const surface = new FlowSurface(canvas, gl);
    try {
      surface.initialize();
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

  private initialize() {
    const gl = this.gl;
    const program = gl.createProgram();
    if (!program) throw new Error("Could not allocate the atmosphere renderer");
    this.program = program;
    for (const [kind, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error("Could not allocate the atmosphere shader");
      this.shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(
          `Atmosphere shader compilation failed: ${gl.getShaderInfoLog(shader)}`,
        );
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(
        `Atmosphere shader linking failed: ${gl.getProgramInfoLog(program)}`,
      );
    gl.useProgram(program);
    this.buffer = gl.createBuffer();
    if (!this.buffer)
      throw new Error("Could not allocate the atmosphere vertex buffer");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    for (const unit of [gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2]) {
      const texture = gl.createTexture();
      if (!texture)
        throw new Error("Could not allocate the atmosphere texture");
      this.textures.push(texture);
      gl.activeTexture(unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    gl.uniform1i(gl.getUniformLocation(program, "artwork"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "originalArt"), 1);
    gl.uniform1i(gl.getUniformLocation(program, "whaleArt"), 2);
    this.uniforms = {
      time: gl.getUniformLocation(program, "time"),
      enabled: gl.getUniformLocation(program, "enabled"),
      brushes: gl.getUniformLocation(program, "brushes[0]"),
    };
  }

  render(
    source: HTMLCanvasElement,
    original: HTMLImageElement,
    time: number,
    flow: FlowState,
    whales: HTMLCanvasElement,
  ) {
    const gl = this.gl;
    if (gl.isContextLost()) return null;
    if (this.canvas.width !== 1200 || this.canvas.height !== 874) {
      this.canvas.width = 1200;
      this.canvas.height = 874;
      gl.viewport(0, 0, 1200, 874);
    }
    if (this.source !== source) {
      gl.activeTexture(gl.TEXTURE0);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
      this.source = source;
    }
    if (this.originalSource !== original) {
      gl.activeTexture(gl.TEXTURE1);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        original,
      );
      this.originalSource = original;
    }
    gl.activeTexture(gl.TEXTURE2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, whales);
    this.brushData.fill(0);
    flow.brushes.forEach((brush, index) =>
      this.brushData.set([brush.x, brush.y, brush.dx, brush.dy], index * 4),
    );
    gl.uniform4fv(this.uniforms.brushes, this.brushData);
    gl.uniform1f(this.uniforms.time, time);
    gl.uniform1f(this.uniforms.enabled, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return this.canvas;
  }

  dispose() {
    for (const texture of this.textures) this.gl.deleteTexture(texture);
    for (const shader of this.shaders) this.gl.deleteShader(shader);
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.canvas.width = 0;
  }
}
