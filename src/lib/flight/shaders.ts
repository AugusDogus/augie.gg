import { BRUSH_RADIUS } from "./flow";
import { BODY_SLOTS, ROUTE_SAMPLES, WAKE_SLOTS } from "./streams";
import { PAINT_ZOOM } from "./viewport";

export const FULLSCREEN_VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2(position.x * .5 + .5, .5 - position.y * .5);
  gl_Position = vec4(position, 0., 1.);
}`;

/** Prints currents and whales as a delta on the baked dither, so cells without ink stay identical. */
export const COMPOSITE_FRAGMENT = `
precision highp float;
uniform sampler2D artwork;
uniform sampler2D originalArt;
uniform sampler2D cells;
uniform sampler2D light;
uniform sampler2D whales;
uniform float time;
uniform float enabled;
uniform vec4 brushes[8];
varying vec2 uv;
const vec2 CELLS = vec2(600., 437.);
const vec3 INK = vec3(.875, .953, .941);
float m2(vec2 p) { return 2. * p.x + 3. * p.y - 4. * p.x * p.y; }
float threshold(vec2 cell) {
  return (4. * m2(mod(cell, 2.)) + m2(mod(floor(cell * .5), 2.)) + .5) / 16.;
}
vec3 lattice(vec3 color, float t) {
  return clamp(floor(clamp((color - .5) * 1.1 + .5, 0., 1.) * 3. + t), 0., 3.) / 3.;
}
vec3 filtered(vec2 point) {
  vec3 art = texture2D(artwork, point).rgb;
  vec2 cell = floor(point * CELLS), center = (cell + .5) / CELLS;
  vec4 beads = texture2D(light, center), body = texture2D(whales, center);
  if (beads.r + beads.g + body.a < .002) return art;
  float t = threshold(cell);
  vec3 base = texture2D(cells, center).rgb, printed = base;
  vec3 original = texture2D(originalArt, point).rgb, continuous = original;
  float cover = step(t, body.a);
  if (cover > 0.) {
    vec3 whale = body.rgb / body.a;
    printed = lattice(whale, t);
    continuous = mix(original, whale, body.a);
  }
  float steps = min(2., floor(beads.r * 8. + .5) * (1. - cover)
    + floor(beads.g * 8. + .5) * mix(1., step(.5, t), cover));
  printed = min(printed + steps / 3., 1.);
  continuous = mix(continuous, INK, steps * .2);
  return art + .85 * (printed - base) + .15 * (continuous - original);
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
  point = (point - .5) * mix(1., ${PAINT_ZOOM}, enabled) + .5;
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

/**
 * One bead per vertex on a twisted two-sheet ribbon. Each drawn bead adds one
 * print step to its cell; folds and wakes stack beads into brighter lines.
 */
export const BEAD_VERTEX = `
attribute vec4 bead;
attribute vec2 fiber;
uniform vec4 route[${ROUTE_SAMPLES}];
uniform vec4 range;
uniform vec4 shape;
uniform vec4 look;
uniform vec4 clock;
uniform float swell;
uniform vec4 bodies[${BODY_SLOTS}];
uniform vec4 wakes[${WAKE_SLOTS}];
varying vec2 light;
void main() {
  float local = mod(bead.z + clock.x, range.y);
  float s = range.x + local;
  float f = min(s / range.z, ${ROUTE_SAMPLES - 2}.999), i = floor(f);
  int index = int(i);
  vec4 r = mix(route[index], route[index + 1], f - i);
  float pulse = 0.;
  for (int k = 0; k < ${WAKE_SLOTS}; k++) {
    float d = s - wakes[k].x;
    pulse += wakes[k].y * smoothstep(0., .6, wakes[k].z) * exp(-d * d / 968.);
  }
  float theta = s * shape.z - clock.y + range.w
    + .5 * sin(s / 170. + clock.w) + .9 * pulse;
  float c = cos(theta), n = sin(theta);
  float hw = shape.x * (.55 + .45 * sin(3.14159265 * s / shape.y));
  float across = hw * (bead.x * c - .22 * bead.y * n)
    + 1.2 * sin(s / 41. + fiber.x) + 4. * pulse;
  float z = bead.x * n + .22 * bead.y * c;
  float give = mix(1., .5, smoothstep(-.2, .2, z));
  for (int k = 0; k < ${BODY_SLOTS}; k++) {
    vec4 b = bodies[k];
    float u = (s - b.x) / b.z;
    float h = b.w * sqrt(max(0., 1. - u * u)), d = across - b.y;
    across += sign(d + 1e-4) * give * .5 * (sqrt(d * d + 4. * h * h) - abs(d));
  }
  across += swell * sin(s * shape.w - clock.z);
  vec2 p = r.xy + normalize(r.zw) * across;
  float fold = pow(1. - abs(c), 6.);
  float presence = mix(look.z, look.w, fold) * fiber.y
    * smoothstep(0., look.x, local)
    * (1. - smoothstep(range.y - look.y, range.y, local));
  light = (z < 0. ? vec2(1., 0.) : vec2(0., 1.))
    * (1. + max(step(.5, fold), step(.3 + .4 * fract(bead.w * 37.), abs(pulse)))) / 8.;
  gl_PointSize = 1.;
  gl_Position = bead.w < presence
    ? vec4((floor(p * .5) + .5) / vec2(300., 218.5) - 1., 0., 1.)
    : vec4(2., 2., 2., 1.);
}`;

export const BEAD_FRAGMENT = `
precision mediump float;
uniform sampler2D mask;
varying vec2 light;
void main() {
  float open = 1. - texture2D(mask, gl_FragCoord.xy / vec2(600., 437.)).r;
  gl_FragColor = vec4(light * open, 0., 0.);
}`;

export const WHALE_VERTEX = `
attribute vec4 vertex;
uniform vec2 gate;
varying vec2 info;
void main() {
  info = vec2(vertex.z, smoothstep(gate.x, gate.y, vertex.w));
  gl_Position = vec4(vertex.xy / vec2(600., 437.) - 1., 0., 1.);
}`;

export const WHALE_FRAGMENT = `
precision mediump float;
uniform sampler2D mask;
uniform vec3 tone;
uniform vec2 look;
varying vec2 info;
void main() {
  float open = 1. - texture2D(mask, gl_FragCoord.xy / vec2(1200., 874.)).r;
  float alpha = look.x * info.y * open;
  vec3 color = tone * mix(.84, 1.14, info.x)
    + look.y * smoothstep(.8, 1., info.x);
  gl_FragColor = vec4(color * alpha, alpha);
}`;
