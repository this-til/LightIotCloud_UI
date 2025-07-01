<!-- UavViewer.vue -->
<template>
  <div class="viewer-wrapper">
    <div class="viewer" ref="wrap"></div>
    <div class="altimeter">
      <div class="alt-scale">
        <!-- 外框固定 100% -->
        <div class="alt-fill" :style="{ height: (altRatio * 100) + '%' }"></div>
      </div>
      <div class="alt-label">{{ droneAlt.toFixed(1) }} m</div>
    </div>

    <div class="cam-info">
      Camera →
      X: {{ cam.x }}&nbsp;
      Y: {{ cam.y }}&nbsp;
      Z: {{ cam.z }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { AxesHelper } from 'three'

/* ——— DOM & 相机坐标 ——— */
const wrap = ref(null)
const cam = ref({ x: 0, y: 0, z: 0 })

/* ——— Three.js 变量 ——— */
let scene, camera, renderer, controls
let leftLid, rightLid      // 舱盖
let drone, propellers = [] // 无人机根节点 & 四桨叶
const loader = new GLTFLoader()
const clock = new THREE.Clock()

/* ——— 盖板、飞行、旋翼状态变量 ——— */
let lidProg = 0, lidTarget = 0        // 0=合拢,1=全开
let rotorSpd = 0, rotorMax = 30       // rad/s
let phase = 'idle'                      // 状态机
let flyTheta = 0                           // 围绕角度
const flyH = 5.0, flyR = 2            // 悬停高度&半径
const takeoffUpVel = 1.2                    // m/s 起飞上升速
const landDownVel = 1.2                    // m/s 降落下落速
const landingThreshold = 0.25       // m 降落阈值

// 海拔仪
const droneAlt = ref(0)        // 当前高度
const altRatio = ref(0)        // 0–1 比例(用于 tape)

/* flyH = 5   →  100% */
const ALT_MAX = flyH            // 若将来想飞更高只改这里

// 无人机拆解
let droneExploded            // 剖视副本
const explodeGap = 0.6       // 部件之间的 Y 间隔
const explodeOrigin = new THREE.Vector3(-5, 5, 15)  // 左上角原点 (x,y,z)

/* ====================================================================
   1) 初始化场景
==================================================================== */
function init() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x20232a)

  const { clientWidth: w, clientHeight: h } = wrap.value
  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 500)
  camera.position.set(7.56, 3.48, 0.09)
  updateCam()

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(w, h)
  wrap.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 3, 0)
  controls.update()
  controls.addEventListener('change', updateCam)

  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dir = new THREE.DirectionalLight(0xffffff, 1)
  const hemi = new THREE.HemisphereLight(0x66aaff, 0x202020, 0.8)
  scene.add(hemi)

  /* 赛博蓝边缘光，让上盖边缘亮起来 */
  const rim = new THREE.PointLight(0x0099ff, 6, 10)
  rim.position.set(0, 2.5, 5)     // 摄像机上方偏前
  scene.add(rim)
  dir.position.set(5, 10, 7)
  scene.add(dir)

  // const axes = new AxesHelper(2)
  // scene.add(axes)

  /* ☆ 侧向点光：给盖板打高光 */
  const lidLight = new THREE.PointLight(0xffffff, 4, 6) // (颜色, 强度, 距离)
  lidLight.position.set(2.5, 1.5, 0)                   // 机坪右侧稍高
  scene.add(lidLight)
  // scene.add(new THREE.PointLightHelper(lidLight, 0.2)) // 如需调试可开 helper

  loadModels()
}

/* ====================================================================
   2) 加载模型
==================================================================== */
function loadModels() {
  /* 停机坪 */
  loader.load('/src/model/停机坪.glb', gltf => {
    const base = gltf.scene
    leftLid = base.getObjectByName('左边图形')
    rightLid = base.getObjectByName('右边图形')
    if (!leftLid || !rightLid) console.warn('⚠️ 盖板节点名不匹配！')

    base.traverse(o => {
      if (o.isMesh) o.material = new THREE.MeshStandardMaterial({
        color: 0x555555, metalness: 0.4, roughness: 0.6
      })
    })
    base.scale.set(1.2, 1.2, 1.2)
    scene.add(base)
  })

  /* 无人机 */
  loader.load('/src/model/无人机.glb', gltf => {
    drone = gltf.scene

      // 找四桨叶
      ;['前桨叶', '右桨叶', '后桨叶', '左桨叶'].forEach(n => {
        const b = drone.getObjectByName(n)
        if (b) propellers.push(b)
        else console.warn(`⚠️ 未找到桨叶节点 ${n}`)
      })

    drone.traverse(o => {
      if (o.isMesh) o.material = new THREE.MeshStandardMaterial({
        color: 0x0066ff,
        emissive: 0x0088ff,
        emissiveIntensity: 0.6,
        metalness: 0.5,
        roughness: 0.6
      })
    })
    drone.scale.set(0.6, 0.6, 0.6)
    drone.position.set(0, 0.25, 0)      // 停机坪中心起飞点
    scene.add(drone)

    /* ---------------- 剖视副本 ---------------- */
    const raw = drone.clone(true)         // 先克隆
    droneExploded = new THREE.Group()     // 包一层组方便整体平移
    droneExploded.add(raw)

    // 拿到各部件
    const bodyE = raw.getObjectByName('机身') || raw
    const bladesE = ['前桨叶', '右桨叶', '后桨叶', '左桨叶']
      .map(n => droneExploded.getObjectByName(n))
      .filter(Boolean)

    const partsE = [bodyE, ...bladesE]

    // 统一材质调暗避免分不清
    partsE.forEach(m => {
      m.traverse(o => {
        if (o.isMesh) {
          o.material = o.material.clone()
          o.material.emissiveIntensity = 0.2
          o.material.color.multiplyScalar(0.8)
        }
      })
    })

    // 定位：整体向左平移，再按 Y 递增排开
    partsE.forEach((p, idx) => {
      p.position.set(
        explodeOrigin.x,
        explodeOrigin.y + idx * explodeGap,
        explodeOrigin.z
      )
    })

    scene.add(droneExploded)
  })
}

/* ====================================================================
   3) 盖板插值
==================================================================== */
function updateLid(p) {
  if (!leftLid || !rightLid) return
  const r = Math.PI / 1.7 * p
  const l = -Math.PI / 1.7 * p
  rightLid.rotation.x = r
  leftLid.rotation.x = l
}

/* ====================================================================
   4) 主动画循环
==================================================================== */
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()

  if (!drone) {
    controls.update()
    renderer.render(scene, camera)
    return
  }

  /* 4-A 盖板缓动 */
  lidProg += (lidTarget - lidProg) * 0.01
  updateLid(lidProg)

  /* 4-B 状态机 */
  switch (phase) {
    /* =============== 开盖阶段 =============== */
    case 'opening':
      // 盖板快开完就进入 takeoff
      if (lidProg > 0.98) phase = 'takeoff'
      break

    /* =============== 起飞上升 =============== */
    case 'takeoff':
      rotorSpd += (rotorMax - rotorSpd) * 0.05        // 加速桨叶
      drone.position.y += takeoffUpVel * dt
      if (drone.position.y >= flyH) {
        drone.position.y = flyH
        phase = 'hover'
      }
      break

    /* =============== 悬停绕圈 =============== */
    case 'hover':
      rotorSpd += (rotorMax - rotorSpd) * 0.05
      flyTheta += 1.0 * dt                            // 1rad/s 绕圈
      drone.position.x = flyR * Math.cos(flyTheta)
      drone.position.z = flyR * Math.sin(flyTheta)
      break

    /* =============== 返航降落 =============== */
    case 'return':
      /* 2-A 始终保持桨叶高速 */
      rotorSpd += (rotorMax - rotorSpd) * 0.05

      /* 2-B 回到停机坪中心并下降 */
      drone.position.x += (-drone.position.x) * 0.05
      drone.position.z += (-drone.position.z) * 0.05
      drone.position.y -= landDownVel * dt

      /* 2-C 到达地面 → 进入 landing 阶段 */
      if (drone.position.y <= landingThreshold) {
        drone.position.y = landingThreshold
        phase = 'landing'
      }
      break

    /* =============== 已落地 — 开始减速 =============== */
    case 'landing':
      /* 3-A 先让桨叶慢慢降速 */
      rotorSpd += (0 - rotorSpd) * 0.03

      /* 3-B 判定桨速足够低且已在中心 → 关盖 */
      if (rotorSpd < 0.5 &&
        Math.hypot(drone.position.x, drone.position.z) < 0.05) {
        phase = 'closing'
        lidTarget = 0
      }
      break

    /* =============== 关盖等待完成 =============== */
    case 'closing':
      rotorSpd += (0 - rotorSpd) * 0.03
      if (lidProg < 0.02) phase = 'idle'
      break
  }

  /* 4-C 旋转桨叶 */
  propellers.forEach(b => { b.rotation.y += rotorSpd * dt })

  controls.update()
  // 爬升仪实时动画
  droneAlt.value = drone.position.y
  altRatio.value = Math.min(droneAlt.value / ALT_MAX, 1)
  renderer.render(scene, camera)
}

/* ====================================================================
   5) 事件 & 工具
==================================================================== */
function updateCam() {
  cam.value = {
    x: camera.position.x.toFixed(2),
    y: camera.position.y.toFixed(2),
    z: camera.position.z.toFixed(2)
  }
}

function onKeyDown(e) {
  if (e.key !== 'w' && e.key !== 'W') return

  if (phase === 'idle' || phase === 'closing') {
    // 第一次 W：开始开盖
    phase = 'opening'
    lidTarget = 1
  } else if (phase === 'hover') {
    // 第二次 W：开始返航
    phase = 'return'
  }
}

function resize() {
  const { clientWidth: w, clientHeight: h } = wrap.value
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

/* ====================================================================
   6) Vue 生命周期
==================================================================== */
onMounted(() => {
  init()
  animate()
  window.addEventListener('resize', resize)
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  window.removeEventListener('keydown', onKeyDown)
  controls?.removeEventListener('change', updateCam)
  renderer?.dispose()
  controls?.dispose()
})
</script>

<style scoped>
.viewer-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.viewer {
  width: 100%;
  height: 100%;
}

.cam-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, .55);
  color: #00e4ff;
  font-family: monospace;
  font-size: 14px;
  border-radius: 4px;
  user-select: none;
}

.altimeter {
  position: absolute;
  top: 10%;
  right: 20px;
  width: 48px;
  height: 60%;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  /* 纯展示 */
}

.alt-scale {
  flex: 1;
  width: 12px;
  border: 2px solid #00e4ff;
  background: rgba(0, 0, 0, 0.3);
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 0 6px #00e4ff;
  position: relative;
}

.alt-fill {
  width: 100%;
  background: linear-gradient(0deg, #00e4ff 0%, #008cff 60%, #0040ff 100%);
  transition: height 0.2s linear;
  position: absolute;
  bottom: 0;
  /* ★ 贴住底边，向上生长 */
}

.alt-label {
  margin-top: 6px;
  color: #00e4ff;
  font-family: monospace;
  font-size: 14px;
  text-shadow: 0 0 4px #008cff;
  user-select: none;
}
</style>
