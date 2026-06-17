import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// A 3D cloud that doubles as a living constellation:
//  • a soft particle body gives it the "cloud" look
//  • ~110 brighter nodes are wired together with lines (connected within a radius)
//  • the cursor pulls a web of lines toward it and nudges nearby nodes (mouse contact)
//  • it disperses / reassembles and sways as you scroll; colour follows `mood`
// Lazy-loaded so `three` never touches the dashboard bundle.

const BLOBS = [
  { x: 0, y: 0.0, z: 0.0, r: 2.3 },
  { x: -2.5, y: -0.25, z: 0.25, r: 1.7 },
  { x: 2.5, y: -0.2, z: -0.25, r: 1.8 },
  { x: -1.25, y: 0.95, z: 0.15, r: 1.45 },
  { x: 1.35, y: 1.0, z: -0.1, r: 1.4 },
  { x: 0, y: 1.25, z: 0.0, r: 1.35 },
  { x: -3.7, y: -0.55, z: 0.0, r: 1.15 },
  { x: 3.7, y: -0.5, z: 0.0, r: 1.15 },
]

const PAL_GREEN = [
  [0.204, 0.78, 0.498], [0.157, 0.62, 0.45], [0.46, 0.88, 0.62], [0.105, 0.5, 0.38], [0.62, 0.93, 0.74],
]
const PAL_RED = [
  [0.886, 0.337, 0.29], [0.74, 0.22, 0.18], [0.96, 0.46, 0.4], [0.55, 0.13, 0.11], [0.98, 0.6, 0.5],
]
const PAL_AMBER = [
  [0.89, 0.7, 0.255], [0.78, 0.58, 0.16], [0.96, 0.82, 0.45], [0.6, 0.43, 0.1], [0.98, 0.88, 0.6],
]

function gauss() {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function sampleBlob(rW, wSum) {
  let pick = Math.random() * wSum
  let b = BLOBS[0]
  for (let k = 0; k < BLOBS.length; k++) {
    pick -= rW[k]
    if (pick <= 0) { b = BLOBS[k]; break }
  }
  const rad = b.r * Math.cbrt(Math.random())
  let py = b.y + gauss() * rad * 0.42
  if (py < b.y - 0.6) py = b.y - 0.6 + (py - (b.y - 0.6)) * 0.3
  return [b.x + gauss() * rad * 0.5, py * 0.82, b.z + gauss() * rad * 0.5]
}

function scatterPoint() {
  const a = Math.random() * Math.PI * 2
  const e = Math.acos(2 * Math.random() - 1)
  const R = 10 + Math.random() * 8
  return [Math.sin(e) * Math.cos(a) * R, Math.cos(e) * R * 0.7, Math.sin(e) * Math.sin(a) * R]
}

function softTexture() {
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.85)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

export default function CloudCanvas({ className = '', mood = 'ok' }) {
  const mountRef = useRef(null)
  const moodRef = useRef(mood)
  const progRef = useRef(0)

  useEffect(() => { moodRef.current = mood }, [mood])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const width = mount.clientWidth || window.innerWidth
    const height = mount.clientHeight || window.innerHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.set(0, 0.2, 12.4) // pushed back → smaller cloud

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const rW = BLOBS.map((b) => b.r * b.r)
    const wSum = rW.reduce((a, b) => a + b, 0)

    // ---------- soft cloud body ----------
    const COUNT = width < 640 ? 1400 : width < 1100 ? 2100 : 2800
    const cTarget = new Float32Array(COUNT * 3)
    const cStart = new Float32Array(COUNT * 3)
    const cPos = new Float32Array(COUNT * 3)
    const colCur = new Float32Array(COUNT * 3)
    const colG = new Float32Array(COUNT * 3)
    const colR = new Float32Array(COUNT * 3)
    const colA = new Float32Array(COUNT * 3)
    const cPhase = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      const [x, y, z] = sampleBlob(rW, wSum)
      cTarget[i * 3] = x; cTarget[i * 3 + 1] = y; cTarget[i * 3 + 2] = z
      const [sx, sy, sz] = scatterPoint()
      cStart[i * 3] = sx; cStart[i * 3 + 1] = sy; cStart[i * 3 + 2] = sz
      const init = reduce ? cTarget : cStart
      cPos[i * 3] = init[i * 3]; cPos[i * 3 + 1] = init[i * 3 + 1]; cPos[i * 3 + 2] = init[i * 3 + 2]
      const top = (y + 1.4) / 2.8
      let ci = (Math.random() * 5) | 0
      if (top > 0.7 && Math.random() < 0.5) ci = 4
      if (top < 0.3 && Math.random() < 0.5) ci = 3
      const jit = 0.92 + Math.random() * 0.12
      for (let ch = 0; ch < 3; ch++) {
        colG[i * 3 + ch] = Math.min(1, PAL_GREEN[ci][ch] * jit)
        colR[i * 3 + ch] = Math.min(1, PAL_RED[ci][ch] * jit)
        colA[i * 3 + ch] = Math.min(1, PAL_AMBER[ci][ch] * jit)
        colCur[i * 3 + ch] = colG[i * 3 + ch]
      }
      cPhase[i] = Math.random() * Math.PI * 2
    }

    const cGeom = new THREE.BufferGeometry()
    cGeom.setAttribute('position', new THREE.BufferAttribute(cPos, 3))
    cGeom.setAttribute('color', new THREE.BufferAttribute(colCur, 3))
    const tex = softTexture()
    const cMat = new THREE.PointsMaterial({
      size: 0.26, map: tex, vertexColors: true, transparent: true,
      opacity: 0.5, depthWrite: false, sizeAttenuation: true, blending: THREE.NormalBlending,
    })
    const cloud = new THREE.Points(cGeom, cMat)

    // ---------- constellation nodes ----------
    const NODE = width < 640 ? 70 : 110
    const nHome = new Float32Array(NODE * 3)
    const nFar = new Float32Array(NODE * 3)
    const nPos = new Float32Array(NODE * 3)
    const nVel = new Float32Array(NODE * 3)
    const nPhase = new Float32Array(NODE)
    for (let i = 0; i < NODE; i++) {
      const [x, y, z] = sampleBlob(rW, wSum)
      nHome[i * 3] = x; nHome[i * 3 + 1] = y; nHome[i * 3 + 2] = z
      const [sx, sy, sz] = scatterPoint()
      nFar[i * 3] = sx; nFar[i * 3 + 1] = sy; nFar[i * 3 + 2] = sz
      const init = reduce ? nHome : nFar
      nPos[i * 3] = init[i * 3]; nPos[i * 3 + 1] = init[i * 3 + 1]; nPos[i * 3 + 2] = init[i * 3 + 2]
      nPhase[i] = Math.random() * Math.PI * 2
    }
    const nGeom = new THREE.BufferGeometry()
    nGeom.setAttribute('position', new THREE.BufferAttribute(nPos, 3))
    const nMat = new THREE.PointsMaterial({
      size: 0.2, map: tex, color: 0x34c77f, transparent: true,
      opacity: 0.95, depthWrite: false, sizeAttenuation: true,
    })
    const nodes = new THREE.Points(nGeom, nMat)

    // ---------- lines ----------
    const MAX_SEG = 900
    const linePos = new Float32Array(MAX_SEG * 6)
    const lGeom = new THREE.BufferGeometry()
    lGeom.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
    const lMat = new THREE.LineBasicMaterial({ color: 0x34c77f, transparent: true, opacity: 0.16 })
    const lines = new THREE.LineSegments(lGeom, lMat)

    const group = new THREE.Group()
    group.add(cloud, lines, nodes)
    scene.add(group)

    // ---------- pointer → world ray on the cloud plane ----------
    const pointer = new THREE.Vector2(0, 0)
    const ndc = new THREE.Vector2(0, 0)
    let pointerActive = false
    const raycaster = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const mouseWorld = new THREE.Vector3(0, 0, 999)
    const mouseLocal = new THREE.Vector3(0, 0, 999)
    const onPointer = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1
      const r = mount.getBoundingClientRect()
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1
      pointerActive = e.clientY - r.top >= 0 && e.clientY - r.top <= r.height
    }
    window.addEventListener('pointermove', onPointer)

    const onScroll = () => {
      const max = (document.documentElement.scrollHeight - window.innerHeight) || 1
      progRef.current = Math.max(0, Math.min(1, window.scrollY / max))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    const onResize = () => {
      const w = mount.clientWidth || window.innerWidth
      const h = mount.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    const clock = new THREE.Clock()
    let intro = reduce ? 1 : 0
    const cPosAttr = cGeom.getAttribute('position')
    const cColAttr = cGeom.getAttribute('color')
    const nPosAttr = nGeom.getAttribute('position')
    const lPosAttr = lGeom.getAttribute('position')
    let raf, lastMood = 'ok', colAnim = 0, targetCol = colG
    const easeOut = (t) => 1 - Math.pow(1 - t, 3)
    const CONNECT = 1.5, CONNECT2 = CONNECT * CONNECT
    const MOUSE_R = 2.2, MOUSE_R2 = MOUSE_R * MOUSE_R

    function frame() {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, clock.getDelta())
      const t = clock.elapsedTime
      const p = progRef.current
      const d = 0.5 - 0.5 * Math.cos(p * Math.PI * 6)
      const sway = Math.sin(p * Math.PI * 4) * 1.4
      const m = moodRef.current

      // cloud body
      if (intro < 1) {
        intro = Math.min(1, intro + dt / 1.9)
        const e = easeOut(intro)
        for (let i = 0; i < COUNT * 3; i++) cPosAttr.array[i] = cStart[i] + (cTarget[i] - cStart[i]) * e
        cPosAttr.needsUpdate = true
      } else if (!reduce) {
        const breath = 1 - d * 0.5
        for (let i = 0; i < COUNT; i++) {
          const ix = i * 3, ph = cPhase[i]
          cPosAttr.array[ix] = cTarget[ix] + (cStart[ix] - cTarget[ix]) * d * 0.45 + Math.sin(t * 0.5 + ph) * 0.05 * breath
          cPosAttr.array[ix + 1] = cTarget[ix + 1] + (cStart[ix + 1] - cTarget[ix + 1]) * d * 0.45 + Math.cos(t * 0.42 + ph) * 0.05 * breath
          cPosAttr.array[ix + 2] = cTarget[ix + 2] + (cStart[ix + 2] - cTarget[ix + 2]) * d * 0.45 + Math.sin(t * 0.36 + ph) * 0.05 * breath
        }
        cPosAttr.needsUpdate = true
      }

      // colour morph
      if (m !== lastMood) {
        lastMood = m
        targetCol = m === 'down' ? colR : m === 'ssl' ? colA : colG
        colAnim = 1.2
      }
      if (colAnim > 0) {
        colAnim = Math.max(0, colAnim - dt)
        const k = Math.min(1, dt * 4)
        for (let i = 0; i < COUNT * 3; i++) cColAttr.array[i] += (targetCol[i] - cColAttr.array[i]) * k
        cColAttr.needsUpdate = true
      }

      // mouse → local space on the cloud plane
      raycaster.setFromCamera(ndc, camera)
      raycaster.ray.intersectPlane(plane, mouseWorld)
      if (mouseWorld) { mouseLocal.copy(mouseWorld); group.worldToLocal(mouseLocal) }
      const haveMouse = pointerActive && intro >= 1

      // nodes: spring home (dispersed) + drift + cursor repel
      const k = reduce ? 0 : 1
      for (let i = 0; i < NODE; i++) {
        const ix = i * 3, ph = nPhase[i]
        const hx = nHome[ix] + (nFar[ix] - nHome[ix]) * d * 0.45 + Math.sin(t * 0.5 + ph) * 0.06
        const hy = nHome[ix + 1] + (nFar[ix + 1] - nHome[ix + 1]) * d * 0.45 + Math.cos(t * 0.45 + ph) * 0.06
        const hz = nHome[ix + 2] + (nFar[ix + 2] - nHome[ix + 2]) * d * 0.45
        if (intro < 1) {
          const e = easeOut(intro)
          nPos[ix] = nFar[ix] + (nHome[ix] - nFar[ix]) * e
          nPos[ix + 1] = nFar[ix + 1] + (nHome[ix + 1] - nFar[ix + 1]) * e
          nPos[ix + 2] = nFar[ix + 2] + (nHome[ix + 2] - nFar[ix + 2]) * e
          continue
        }
        nVel[ix] += (hx - nPos[ix]) * 0.06 * k
        nVel[ix + 1] += (hy - nPos[ix + 1]) * 0.06 * k
        nVel[ix + 2] += (hz - nPos[ix + 2]) * 0.06 * k
        if (haveMouse) {
          const dx = nPos[ix] - mouseLocal.x, dy = nPos[ix + 1] - mouseLocal.y, dz = nPos[ix + 2] - mouseLocal.z
          const d2 = dx * dx + dy * dy + dz * dz
          if (d2 < MOUSE_R2 && d2 > 0.0001) {
            const f = (1 - d2 / MOUSE_R2) * 0.08
            const inv = 1 / Math.sqrt(d2)
            nVel[ix] += dx * inv * f
            nVel[ix + 1] += dy * inv * f
            nVel[ix + 2] += dz * inv * f
          }
        }
        nVel[ix] *= 0.86; nVel[ix + 1] *= 0.86; nVel[ix + 2] *= 0.86
        nPos[ix] += nVel[ix]; nPos[ix + 1] += nVel[ix + 1]; nPos[ix + 2] += nVel[ix + 2]
      }
      nPosAttr.needsUpdate = true

      // lines: node↔node within CONNECT, node↔cursor within MOUSE_R
      let seg = 0
      for (let i = 0; i < NODE && seg < MAX_SEG; i++) {
        const ax = nPos[i * 3], ay = nPos[i * 3 + 1], az = nPos[i * 3 + 2]
        for (let j = i + 1; j < NODE && seg < MAX_SEG; j++) {
          const dx = ax - nPos[j * 3], dy = ay - nPos[j * 3 + 1], dz = az - nPos[j * 3 + 2]
          if (dx * dx + dy * dy + dz * dz < CONNECT2) {
            const o = seg * 6
            linePos[o] = ax; linePos[o + 1] = ay; linePos[o + 2] = az
            linePos[o + 3] = nPos[j * 3]; linePos[o + 4] = nPos[j * 3 + 1]; linePos[o + 5] = nPos[j * 3 + 2]
            seg++
          }
        }
        if (haveMouse && seg < MAX_SEG) {
          const dx = ax - mouseLocal.x, dy = ay - mouseLocal.y, dz = az - mouseLocal.z
          if (dx * dx + dy * dy + dz * dz < MOUSE_R2) {
            const o = seg * 6
            linePos[o] = ax; linePos[o + 1] = ay; linePos[o + 2] = az
            linePos[o + 3] = mouseLocal.x; linePos[o + 4] = mouseLocal.y; linePos[o + 5] = mouseLocal.z
            seg++
          }
        }
      }
      lGeom.setDrawRange(0, seg * 2)
      lPosAttr.needsUpdate = true

      // parallax + scroll motion + outage shudder
      const tx = pointer.x * 0.2
      const ty = -pointer.y * 0.12
      group.rotation.y += (tx - group.rotation.y) * 0.04
      group.rotation.x += (ty - group.rotation.x) * 0.04
      group.rotation.z += (d * 0.12 - group.rotation.z) * 0.04
      const shudder = m === 'down' ? Math.sin(t * 34) * 0.04 : 0
      group.position.x += (pointer.x * 0.3 + sway + shudder - group.position.x) * 0.05
      group.position.y += (d * 0.5 - group.position.y) * 0.04

      renderer.render(scene, camera)
    }
    frame()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      cGeom.dispose(); cMat.dispose()
      nGeom.dispose(); nMat.dispose()
      lGeom.dispose(); lMat.dispose()
      tex.dispose(); renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className={className} aria-hidden="true" />
}
