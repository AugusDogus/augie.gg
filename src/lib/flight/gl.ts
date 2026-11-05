export type RenderTarget = {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
};

/** A program whose compile and link are issued but not yet checked. */
export type PendingProgram = {
  program: WebGLProgram;
  shaders: readonly WebGLShader[];
  label: string;
};

/** Records every GL object it allocates, so one dispose() releases them all. */
export class GlScope {
  private programs: WebGLProgram[] = [];
  private shaders: WebGLShader[] = [];
  private buffers: WebGLBuffer[] = [];
  private textures: WebGLTexture[] = [];
  private framebuffers: WebGLFramebuffer[] = [];

  constructor(readonly gl: WebGLRenderingContext) {}

  /**
   * Issues the compile and link without waiting for them. Status queries
   * block until the driver finishes, so issue every program before linked()
   * checks any: the driver can then compile them together, and alongside
   * other work.
   */
  compile(
    vertex: string,
    fragment: string,
    label: string,
    attributes: Readonly<Record<string, number>>,
  ): PendingProgram {
    const gl = this.gl;
    const program = gl.createProgram();
    if (!program) throw new Error(`Could not allocate the ${label} program`);
    this.programs.push(program);
    const shaders: WebGLShader[] = [];
    for (const [kind, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error(`Could not allocate the ${label} shader`);
      this.shaders.push(shader);
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
    }
    for (const [name, location] of Object.entries(attributes))
      gl.bindAttribLocation(program, location, name);
    gl.linkProgram(program);
    return { program, shaders, label };
  }

  /** Waits for a compile() and returns its program, or throws with the driver's log. */
  linked({ program, shaders, label }: PendingProgram) {
    const gl = this.gl;
    for (const shader of shaders)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(
          `The ${label} shader failed to compile: ${gl.getShaderInfoLog(shader)}`,
        );
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(
        `The ${label} program failed to link: ${gl.getProgramInfoLog(program)}`,
      );
    return program;
  }

  buffer(
    target: number,
    data: AllowSharedBufferSource,
    usage: number,
    label: string,
  ) {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error(`Could not allocate the ${label} buffer`);
    this.buffers.push(buffer);
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, usage);
    return buffer;
  }

  /** Binds a clamped texture to `unit`, ready for texImage2D. */
  texture(unit: number, filter: number, label: string) {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error(`Could not allocate the ${label} texture`);
    this.textures.push(texture);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    return texture;
  }

  /** An RGBA8 colour target whose texture stays bound to `unit` for sampling. */
  target(
    width: number,
    height: number,
    unit: number,
    filter: number,
    label: string,
  ): RenderTarget {
    const gl = this.gl;
    const texture = this.texture(unit, filter, label);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer)
      throw new Error(`Could not allocate the ${label} framebuffer`);
    this.framebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error(
        `The ${label} framebuffer is incomplete (status 0x${status.toString(16)})`,
      );
    return { framebuffer, texture, width, height };
  }

  dispose() {
    const gl = this.gl;
    for (const framebuffer of this.framebuffers)
      gl.deleteFramebuffer(framebuffer);
    for (const texture of this.textures) gl.deleteTexture(texture);
    for (const buffer of this.buffers) gl.deleteBuffer(buffer);
    for (const shader of this.shaders) gl.deleteShader(shader);
    for (const program of this.programs) gl.deleteProgram(program);
    this.framebuffers = [];
    this.textures = [];
    this.buffers = [];
    this.shaders = [];
    this.programs = [];
  }
}
