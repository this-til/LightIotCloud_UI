<template>
  <div ref="container" class="car-scene"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineExpose } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

// 容器引用
const container = ref(null)

// Three.js 核心对象
let renderer, scene, camera, controls, loader, mixer, clock
let gltfModel, wheels = [], radar, radarBeam
let pillarLeft, pillarRight

// 键盘状态
const keysPressed = { KeyW: false, KeyS: false, KeyA: false, KeyD: false }

// 对外暴露：按下和松开方法
function pressKey(code) { keysPressed[code] = true }
function releaseKey(code) { keysPressed[code] = false }

defineExpose({ pressKey, releaseKey })

onMounted(() => {
  // 场景初始化
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x070c16)

  // 相机
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.position.set(-5.80, 1.19, -0.09)
  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.value.appendChild(renderer.domElement)

  // 灯光
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1)
  hemi.position.set(0, 20, 0)
  scene.add(hemi)
  const dir = new THREE.DirectionalLight(0xffffff, 0.8)
  dir.position.set(5, 10, 7.5)
  scene.add(dir)

  // 控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // const axes = new THREE.AxesHelper(30) // 30 表示轴长，可自行调整
  // scene.add(axes)

  controls.addEventListener('change', () => {
    const { x, y, z } = camera.position
    console.log(`Camera ⇢ x:${x.toFixed(2)}  y:${y.toFixed(2)}  z:${z.toFixed(2)}`)
  })

  // 模型加载
  loader = new GLTFLoader()
  clock = new THREE.Clock()
  loader.load(
    '/src/model/无人小车.glb',
    gltf => {
      gltfModel = gltf.scene
      scene.add(gltfModel)

      const radarName = '雷达旋转体'
      const wheelNames = ['右前轮', '右后轮', '左前轮', '左后轮']
      const chassisName = '底盘'

      const radarObj = gltfModel.getObjectByName(radarName)
      const wheelObjs = wheelNames
        .map(n => gltfModel.getObjectByName(n))
        .filter(Boolean)          // 过滤掉 null

      // 再把它同步给全局 wheels 数组，供 animate() 使用
      wheels.length = 0
      wheels.push(...wheelObjs)
      const chassisObj = gltfModel.getObjectByName(chassisName)
      gltfModel.scale.set(0.6, 0.6, 0.6)
      radar = radarObj
      /* --------- 统一赛博蓝材质 ---------- */
      const cyberBlueMat = new THREE.MeshPhysicalMaterial({
        color: 0x0000ff,           // 主色
        emissive: 0x00bbff,        // 自发光蓝
        emissiveIntensity: 0.6,
        metalness: 0.5,
        roughness: 0.6,
        transparent: true,
        opacity: 0.4,
      })

        ;[...wheelObjs, radarObj, chassisObj].forEach(obj => {
          if (obj) obj.material = cyberBlueMat
        })

      /* ② 给雷达加绿色扫描线 */
      if (radarObj) {
        if (radarObj) {
          const beamLen = 180        // 扫描长度：60 (原来 30 的 2 倍)
          const beamRadius = 0.5      // 粗细：越小越像激光
          const yOffset = -0.55     // 向下偏移 0.15 米（模型坐标系）

          // 用圆柱体模拟光束：radiusTop radiusBottom 一样 ⇒ 细长“管”
          const beamGeom = new THREE.CylinderGeometry(
            beamRadius, beamRadius, beamLen, 8, 1, true /* openEnded */
          )

          const beamMat = new THREE.MeshPhysicalMaterial({
            color: 0x0000ff,           // 主色
            emissive: 0x00bbff,        // 自发光蓝
            emissiveIntensity: 2.0,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1,
            metalness: 0.3,
          })

          const beamMesh = new THREE.Mesh(beamGeom, beamMat)

          // 调整姿态：圆柱默认 Y 轴为长轴 ⇒ 让它朝 -Z
          beamMesh.rotation.x = Math.PI / 2          // 倒到 X 轴，长轴 ⇒ Z
          beamMesh.position.set(0, yOffset, -beamLen / 2) // 末端对齐雷达正前方

          radarBeam = beamMesh
          radarObj.add(radarBeam)     // 跟随雷达一起旋转
        }
      }
      // 创建柱子
      const pillarHeight = 10
      const sideOffset = 20
      const pillarGeo = new THREE.BoxGeometry(2, pillarHeight, 2)
      pillarLeft = new THREE.Mesh(pillarGeo, cyberBlueMat.clone())
      pillarRight = new THREE.Mesh(pillarGeo, cyberBlueMat.clone())
      pillarLeft.position.set(100, pillarHeight / 2, -sideOffset)
      pillarRight.position.set(100, pillarHeight / 2, sideOffset)
      scene.add(pillarLeft, pillarRight)
      animate()
    },
    xhr => console.log(`加载进度: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`),
    error => console.error('加载模型出错:', error)
  )

  window.addEventListener('resize', onWindowResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize)
  mixer?.stopAllAction()
  renderer.dispose()
  controls.dispose()
})

function onWindowResize() {
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  mixer?.update(delta)

  /* === 0. 雷达自转 === */
  radar && (radar.rotation.y += 0.02)

  /* === 1. 常量 === */
  const lateralSpeed = 0.25      // A/D 速度
  const rotateSpeed = 0.01   // Q/E 角速度
  const respawnFrontDist = 120    // 重生时放到车头前多远
  const rearThreshold = -40    // “掉队”阈值（相对前向）
  const sideOffset = 30     // 柱子左右距离
  const pillarHeight = 10

  /* === 2. 朝向向量 === */
  const forwardDir = new THREE.Vector3(1, 0, 0)       // 如果模型前方不是 +X 就改
    .applyQuaternion(gltfModel.quaternion)
    .normalize()

  const rightDir = new THREE.Vector3().copy(forwardDir)
    .cross(new THREE.Vector3(0, 1, 0))
    .normalize()

  /* === 3. 键盘控制 === */
  // Q / E 原地转向
  if (keysPressed.KeyQ) gltfModel.rotation.y += rotateSpeed
  if (keysPressed.KeyE) gltfModel.rotation.y -= rotateSpeed

  /* === 4. 轮子自转（正向 = -z，反向 = +z；按需改 x/y） === */
  if (keysPressed.KeyW && wheels) wheels.forEach(w => w.rotation.z -= 0.1)
  if (keysPressed.KeyS && wheels) wheels.forEach(w => w.rotation.z += 0.1)

  /* === 5. 柱子随车体转向 === */
  const deltaAng = (keysPressed.KeyQ ? rotateSpeed :
    (keysPressed.KeyE ? -rotateSpeed : 0))
  if (deltaAng !== 0) {
    const carPos = gltfModel.position
    const tmpRel = new THREE.Vector3()
    const tmpRot = new THREE.Vector3()
      ;[pillarLeft, pillarRight].forEach(pillar => {
        if (!pillar) return
        tmpRel.copy(pillar.position).sub(carPos)
        tmpRot.copy(tmpRel).applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaAng)
        pillar.position.copy(carPos).add(tmpRot)
      })
  }

  /* === 6. 柱子前后 / 横向移动（景物倒流） === */
  const sceneForwardSpeed = 0.5      // 视觉前后速度（比原先 2 慢）
  const sceneLateralSpeed = 0.5    // 视觉左右速度

  if (keysPressed.KeyW) {
    pillarLeft.position.addScaledVector(forwardDir, -sceneForwardSpeed)
    pillarRight.position.addScaledVector(forwardDir, -sceneForwardSpeed)
  }
  if (keysPressed.KeyS) {
    pillarLeft.position.addScaledVector(forwardDir, sceneForwardSpeed)
    pillarRight.position.addScaledVector(forwardDir, sceneForwardSpeed)
  }
  if (keysPressed.KeyD) {          // 车想左移 ⇒ 场景右移
    pillarLeft.position.addScaledVector(rightDir, sceneLateralSpeed)
    pillarRight.position.addScaledVector(rightDir, sceneLateralSpeed)
  }
  if (keysPressed.KeyA) {          // 车想右移 ⇒ 场景左移
    pillarLeft.position.addScaledVector(rightDir, -sceneLateralSpeed)
    pillarRight.position.addScaledVector(rightDir, -sceneLateralSpeed)
  }

  /* === 7. 柱子重生判定 === */
  const carPos = gltfModel.position
  const sideRespawnDist = 60    // 你自己设置左右重生的阈值
    ;[[pillarLeft, -sideOffset], [pillarRight, sideOffset]].forEach(([pillar, so]) => {
      if (!pillar) return

      // 1. 计算相对向量
      const rel = new THREE.Vector3().copy(pillar.position).sub(carPos)
      const projF = rel.dot(forwardDir)  // 前后投影
      const projL = rel.dot(rightDir)    // 左右投影

      // 2. 前后重生（和你原来的一样）
      if (projF < rearThreshold || projF > respawnFrontDist) {
        const sign = projF < 0 ? 1 : -1
        pillar.position.copy(
          carPos.clone()
            .addScaledVector(forwardDir, sign * respawnFrontDist)
            .addScaledVector(rightDir, so)
        )
        pillar.position.y = pillarHeight / 2
        return
      }

      // 3. 左右重生（新增的逻辑）
      if (projL < -sideRespawnDist || projL > sideRespawnDist) {
        const sign = projL < 0 ? 1 : -1
        // 保持原来前后距离 projF，只重置左右到对侧
        pillar.position.copy(
          carPos.clone()
            .addScaledVector(forwardDir, projF)
            .addScaledVector(rightDir, sign * sideRespawnDist)
        )
        pillar.position.y = pillarHeight / 2
      }
    })

  /* === 8. 渲染 === */
  controls.update()
  renderer.render(scene, camera)
}
</script>

<style scoped>
.car-scene {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
