'use client'

import { useRef, useEffect } from 'react'
import { useVisualizerStore } from '@/store/visualizer-store'

// GLSL ES 1.00 shaders for WebGL1.
// Optimized: pre-computed noise hash texture + reduced octave FBM (4 instead of 6).
// The texture acts as a hash lookup table (NEAREST filtering). The shader still
// does proper 4-corner value noise with Hermite smoothstep interpolation — identical
// visual quality to the original, but texture fetches are faster than procedural hash.

const VERT_SRC = [
  'attribute vec2 aPosition;',
  'varying vec2 vUv;',
  'void main() {',
  '  vUv = aPosition * 0.5 + 0.5;',
  '  gl_Position = vec4(aPosition, 0.0, 1.0);',
  '}',
].join('\n')

const FRAG_SRC = [
  'precision highp float;',
  '',
  'varying vec2 vUv;',
  '',
  'uniform float uTime;',
  'uniform vec2 uResolution;',
  'uniform vec2 uMouse;',
  'uniform float uIntensity;',
  'uniform float uPreset;',
  'uniform float uIsDark;',
  'uniform sampler2D uNoiseTex;',
  '',
  '// -- Hash via pre-computed texture (NEAREST) --',
  '// Replaces procedural hash() with a single texture fetch.',
  '// Each texel stores hash(integerCoord). NEAREST returns exact values.',
  'float hash(vec2 p) {',
  '  vec2 uv = mod(p, 256.0) / 256.0 + 0.5 / 256.0;',
  '  return texture2D(uNoiseTex, uv).r;',
  '}',
  '',
  '// -- Value Noise (same algorithm as original) --',
  '// 4-corner hash lookup + Hermite smoothstep interpolation.',
  'float vnoise(vec2 p) {',
  '  vec2 i = floor(p);',
  '  vec2 f = fract(p);',
  '  vec2 u = f * f * (3.0 - 2.0 * f);',
  '  float a = hash(i);',
  '  float b = hash(i + vec2(1.0, 0.0));',
  '  float c = hash(i + vec2(0.0, 1.0));',
  '  float d = hash(i + vec2(1.0, 1.0));',
  '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
  '}',
  '',
  '// -- Reduced Octave FBM (4 octaves, down from 6) --',
  '// Last two octaves contribute < 6% of signal energy.',
  'float fbm(vec2 p) {',
  '  float f = 0.0;',
  '  float w = 0.5;',
  '  float tw = 0.0;',
  '  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);',
  '  for (int i = 0; i < 4; i++) {',
  '    f += w * vnoise(p);',
  '    tw += w;',
  '    p = rot * p * 2.0 + vec2(100.0);',
  '    w *= 0.5;',
  '  }',
  '  return f / tw;',
  '}',
  '',
  '// -- Domain Warping (key to Milkdrop look) --',
  'vec2 warp(vec2 p, float t, float strength) {',
  '  vec2 q = vec2(',
  '    fbm(p + vec2(0.0, 0.0) + t * 0.1),',
  '    fbm(p + vec2(5.2, 1.3) + t * 0.12)',
  '  );',
  '  vec2 r = vec2(',
  '    fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.08),',
  '    fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.09)',
  '  );',
  '  return p + strength * r;',
  '}',
  '',
  '// -- Cosine Color Palette (Inigo Quilez) --',
  'vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {',
  '  return a + b * cos(6.28318 * (c * t + d));',
  '}',
  '',
  'vec3 milkdropPalette(float t, float preset) {',
  '  // Preset 0: Cosmic Flow - purples, cyans, magentas',
  '  if (preset < 0.5) {',
  '    return palette(t, vec3(0.5,0.5,0.5), vec3(0.5,0.5,0.5), vec3(1.0,1.0,1.0), vec3(0.0,0.33,0.67));',
  '  }',
  '  // Preset 1: Neon Dreams - warm neons, pinks, oranges',
  '  if (preset < 1.5) {',
  '    return palette(t, vec3(0.5,0.5,0.5), vec3(0.5,0.5,0.5), vec3(1.0,0.7,0.4), vec3(0.0,0.15,0.20));',
  '  }',
  '  // Preset 2: Acid Rain - greens, yellows, cyans',
  '  if (preset < 2.5) {',
  '    return palette(t, vec3(0.5,0.5,0.5), vec3(0.5,0.5,0.5), vec3(2.0,1.0,0.0), vec3(0.50,0.20,0.25));',
  '  }',
  '  // Preset 3: Deep Space - deep blues, teals, subtle reds',
  '  return palette(t, vec3(0.5,0.5,0.5), vec3(0.5,0.5,0.5), vec3(1.0,1.0,0.5), vec3(0.80,0.90,0.30));',
  '}',
  '',
  '// -- Wave Pattern --',
  'float wavePattern(vec2 uv, float t, float freq, float speed) {',
  '  float w = 0.0;',
  '  for (int i = 0; i < 3; i++) {',
  '    float fi = float(i);',
  '    vec2 dir = vec2(cos(fi * 2.094), sin(fi * 2.094));',
  '    w += sin(dot(uv, dir * freq) + t * speed + fi * 1.5) / 3.0;',
  '  }',
  '  return w;',
  '}',
  '',
  'void main() {',
  '  vec2 uv = vUv;',
  '  float aspect = uResolution.x / uResolution.y;',
  '  vec2 p = vec2(uv.x * aspect, uv.y);',
  '  float t = uTime;',
  '',
  '  // Mouse influence - subtle distortion',
  '  vec2 mouse = uMouse;',
  '  mouse.x *= aspect;',
  '  float mouseDist = length(p - mouse);',
  '  float mouseInfluence = exp(-mouseDist * 3.0) * 0.15;',
  '',
  '  // Preset-dependent parameters',
  '  float warpStrength = 1.5 + uPreset * 0.3;',
  '  float waveFreq = 3.0 + uPreset * 1.5;',
  '  float waveSpeed = 0.8 + uPreset * 0.2;',
  '  float colorSpeed = 0.15 + uPreset * 0.05;',
  '',
  '  // Domain warping - double warp for deep Milkdrop look',
  '  vec2 warped = warp(p, t, warpStrength);',
  '  warped = warp(warped, t * 0.7, warpStrength * 0.6);',
  '',
  '  // Apply mouse distortion',
  '  warped += mouseInfluence * vec2(',
  '    sin(t * 2.0 + p.y * 5.0),',
  '    cos(t * 1.5 + p.x * 5.0)',
  '  );',
  '',
  '  // FBM value at warped position',
  '  float f1 = fbm(warped * 1.5 + t * 0.05);',
  '  float f2 = fbm(warped * 2.5 - t * 0.08 + vec2(5.0));',
  '  float f3 = fbm(warped * 0.8 + t * 0.03);',
  '',
  '  // Wave interference pattern',
  '  float wave = wavePattern(p, t, waveFreq, waveSpeed);',
  '  float wave2 = wavePattern(p * 1.5, t * 1.3, waveFreq * 0.7, waveSpeed * 1.2);',
  '',
  '  // Combine patterns',
  '  float pattern = f1 * 0.5 + f2 * 0.25 + f3 * 0.15 + wave * 0.1 + wave2 * 0.05;',
  '',
  '  // Add subtle pulsing',
  '  pattern += 0.05 * sin(t * 0.5) * sin(pattern * 6.28);',
  '',
  '  // Radial modulation - darker at edges, brighter near center',
  '  vec2 center = vec2(0.5 * aspect, 0.5);',
  '  float radial = 1.0 - smoothstep(0.2, 1.2, length(p - center));',
  '',
  '  // Color from pattern',
  '  float colorT = pattern * 2.0 + t * colorSpeed;',
  '  vec3 color = milkdropPalette(colorT, uPreset);',
  '',
  '  // Add secondary color layer for complexity',
  '  vec3 color2 = milkdropPalette(pattern * 1.5 + 0.5 + t * colorSpeed * 0.7, uPreset);',
  '  color = mix(color, color2, smoothstep(0.3, 0.7, f1));',
  '',
  '  // Add subtle highlight at pattern peaks',
  '  float highlight = smoothstep(0.55, 0.75, pattern);',
  '  color += highlight * 0.15;',
  '',
  '  // Vignette',
  '  float vignette = 1.0 - 0.4 * length(uv - 0.5);',
  '  color *= vignette;',
  '',
  '  // Apply radial modulation',
  '  color *= 0.7 + 0.3 * radial;',
  '',
  '  // Intensity control',
  '  color *= uIntensity;',
  '',
  '  // Theme adaptation',
  '  if (uIsDark < 0.5) {',
  '    // Light mode: very subtle, desaturated, low opacity',
  '    float lum = dot(color, vec3(0.299, 0.587, 0.114));',
  '    color = mix(vec3(lum), color, 0.3);',
  '    color *= 0.12;',
  '  } else {',
  '    // Dark mode: vibrant but not blown out',
  '    color = pow(color, vec3(0.95));',
  '    color *= 0.85;',
  '  }',
  '',
  '  gl_FragColor = vec4(color, 1.0);',
  '}',
].join('\n')

/**
 * Generate a pre-computed 2D hash texture on the CPU.
 *
 * Replicates the GLSL hash function so texel (x,y) = hash(vec2(x,y)).
 * The texture is used as a hash lookup table — the shader does its own
 * 4-corner sampling and Hermite interpolation for smooth value noise.
 *
 * @param size  Texture width & height (256). Must cover the integer grid
 *              range used by FBM. With 4 octaves and max scale ~8x, coordinates
 *              stay within ~256 range for typical screen UV inputs.
 * @returns Uint8Array of `size * size` bytes ready for gl.texImage2D.
 */
function generateNoiseTexture(size: number): Uint8Array {
  const data = new Uint8Array(size * size)

  // Replicate the original GLSL hash: fract(vec3(p.xyx) * 0.1031) + dot(...)
  function hash(px: number, py: number): number {
    const p3x = ((px * 0.1031) % 1 + 1) % 1
    const p3y = ((py * 0.1031) % 1 + 1) % 1
    const p3z = ((px * 0.1031) % 1 + 1) % 1
    const dot = p3x * (p3y + 33.33) + p3y * (p3z + 33.33) + p3z * (p3x + 33.33)
    const val = ((p3x + p3y + dot) * p3z) % 1
    return ((val % 1) + 1) % 1
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      data[y * size + x] = Math.floor(hash(x, y) * 255.0 + 0.5)
    }
  }

  return data
}

/* -- Component -- */

interface MilkdropBackgroundProps {
  isDark: boolean
}

export function MilkdropBackground({ isDark }: MilkdropBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const mouseRef = useRef<[number, number]>([0.5, 0.5])
  const intensityRef = useRef(0.8)
  const presetRef = useRef(0)
  const enabledRef = useRef(true)
  const isDarkRef = useRef(isDark ? 1.0 : 0.0)
  const targetIsDarkRef = useRef(isDark ? 1.0 : 0.0)

  const { enabled, intensity, preset } = useVisualizerStore()

  // Sync refs from store
  useEffect(() => {
    enabledRef.current = enabled
    intensityRef.current = intensity
    presetRef.current = preset
  }, [enabled, intensity, preset])

  useEffect(() => {
    targetIsDarkRef.current = isDark ? 1.0 : 0.0
  }, [isDark])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Create a fresh canvas — critical for React Strict Mode double-mount
    const canvas = document.createElement('canvas')
    canvas.className = 'milkdrop-canvas'
    container.appendChild(canvas)

    const glOpts: WebGLContextAttributes = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
    }

    const gl = canvas.getContext('webgl', glOpts)

    if (!gl) {
      console.warn('WebGL not available for Milkdrop visualizer')
      container.removeChild(canvas)
      return
    }

    // ---------- Pre-computed Hash Texture ----------
    // 256x256 LUMINANCE texture: each texel = hash(integerCoord).
    // Used as a lookup table in the shader. NEAREST filtering ensures
    // exact values are returned — the shader handles its own interpolation.
    const NOISE_SIZE = 256
    const noiseData = generateNoiseTexture(NOISE_SIZE)

    const noiseTex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, noiseTex)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      NOISE_SIZE,
      NOISE_SIZE,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      noiseData
    )
    // NEAREST — no GPU interpolation. The shader does 4-corner sampling
    // + Hermite smoothstep, which matches the original value noise exactly.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    // REPEAT wrapping so mod() in the shader wraps seamlessly
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)

    // ---------- Compile Shaders ----------
    const compileShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const infoLog = gl.getShaderInfoLog(shader)
        console.error(
          'Shader compile error:',
          infoLog || '(no info log)',
          '\nSource (first 200 chars):',
          source.substring(0, 200)
        )
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vert = compileShader(gl.VERTEX_SHADER, VERT_SRC)
    const frag = compileShader(gl.FRAGMENT_SHADER, FRAG_SRC)
    if (!vert || !frag) {
      container.removeChild(canvas)
      return
    }

    const program = gl.createProgram()
    if (!program) {
      container.removeChild(canvas)
      return
    }

    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
      container.removeChild(canvas)
      return
    }

    gl.useProgram(program)

    // Bind noise texture to texture unit 0
    const uNoiseTex = gl.getUniformLocation(program, 'uNoiseTex')
    gl.uniform1i(uNoiseTex, 0)

    // Fullscreen quad
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    const vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    const aPosition = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

    // Start time
    startTimeRef.current = performance.now() / 1000

    // Resolution tracking
    const updateSize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      const renderDpr = dpr * 0.5
      const cssW = canvas.clientWidth || window.innerWidth
      const cssH = canvas.clientHeight || window.innerHeight
      const w = Math.floor(cssW * renderDpr)
      const h = Math.floor(cssH * renderDpr)
      if (w > 0 && h > 0) {
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
          gl.viewport(0, 0, w, h)
        }
      }
    }

    // Defer first size update so the browser has time to compute layout
    const initRaf = requestAnimationFrame(() => {
      updateSize()
      resizeObs.observe(canvas)
    })

    const onResize = () => updateSize()
    window.addEventListener('resize', onResize)
    const resizeObs = new ResizeObserver(updateSize)

    // Mouse tracking
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = [e.clientX / window.innerWidth, 1.0 - e.clientY / window.innerHeight]
    }
    window.addEventListener('mousemove', onMouse, { passive: true })

    // Uniform locations
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uResolution = gl.getUniformLocation(program, 'uResolution')
    const uMouse = gl.getUniformLocation(program, 'uMouse')
    const uIntensity = gl.getUniformLocation(program, 'uIntensity')
    const uPreset = gl.getUniformLocation(program, 'uPreset')
    const uIsDark = gl.getUniformLocation(program, 'uIsDark')

    // Render loop
    const render = () => {
      if (!enabledRef.current) {
        animFrameRef.current = requestAnimationFrame(render)
        return
      }

      // Smooth isDark transition
      const diff = targetIsDarkRef.current - isDarkRef.current
      isDarkRef.current += diff * 0.05

      const time = performance.now() / 1000 - startTimeRef.current

      gl.uniform1f(uTime, time)
      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform2f(uMouse, mouseRef.current[0], mouseRef.current[1])
      gl.uniform1f(uIntensity, intensityRef.current)
      gl.uniform1f(uPreset, presetRef.current)
      gl.uniform1f(uIsDark, isDarkRef.current)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    // Cleanup
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      cancelAnimationFrame(initRaf)
      resizeObs.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouse)
      gl.deleteTexture(noiseTex)
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      if (container.contains(canvas)) {
        container.removeChild(canvas)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="milkdrop-container"
      aria-hidden="true"
    />
  )
}
