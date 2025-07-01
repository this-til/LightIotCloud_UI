<template>
  <div class="dashboard-container">
    <!-- ============ 左侧统计栏 ============ -->
    <div class="stats-sidebar">
      <h3 class="sidebar-title">系统概览</h3>

      <!-- 设备统计 -->
      <div class="stats-section">
        <h4 class="section-title">设备状态</h4>
        <div class="stats-cards">
          <div class="stat-card total">
            <div class="stat-icon"><el-icon>
                <Monitor />
              </el-icon></div>
            <div class="stat-content">
              <div class="stat-value">{{ deviceStats.total }}</div>
              <div class="stat-label">注册设备</div>
            </div>
          </div>
          <div class="stat-card online">
            <div class="stat-icon"><el-icon>
                <VideoPlay />
              </el-icon></div>
            <div class="stat-content">
              <div class="stat-value">{{ deviceStats.online }}</div>
              <div class="stat-label">在线设备</div>
            </div>
          </div>
          <div class="stat-card offline">
            <div class="stat-icon"><el-icon>
                <VideoPause />
              </el-icon></div>
            <div class="stat-content">
              <div class="stat-value">{{ deviceStats.offline }}</div>
              <div class="stat-label">离线设备</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 消息统计 -->
      <div class="stats-section">
        <h4 class="section-title">消息统计</h4>
        <div class="stats-cards">
          <div class="stat-card messages">
            <div class="stat-icon"><el-icon>
                <ChatDotSquare />
              </el-icon></div>
            <div class="stat-content">
              <div class="stat-value">{{ messageStats.total }}</div>
              <div class="stat-label">当日消息</div>
            </div>
          </div>
          <div class="stat-card alerts">
            <div class="stat-icon"><el-icon>
                <Warning />
              </el-icon></div>
            <div class="stat-content">
              <div class="stat-value">{{ messageStats.alerts }}</div>
              <div class="stat-label">异常上报</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 实时状态 -->
      <div class="stats-section">
        <h4 class="section-title">实时监控</h4>
        <div class="status-indicators">
          <div class="status-item">
            <span class="status-dot online"></span><span class="status-text">系统运行正常</span>
          </div>
          <div class="status-item">
            <span class="status-dot"></span><span class="status-text">WebSocket 已连接</span>
          </div>
          <div class="status-item">
            <span class="status-dot" :class="{ online: lastUpdateTime }"></span>
            <span class="status-text">
              {{ lastUpdateTime ? `最后更新: ${formatTime(lastUpdateTime)}` : '等待数据...' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 中央 3-D 地图 ============ -->
    <div class="map-panel">
      <el-button v-if="drillStack.length" class="back-btn" size="small" type="primary"
        @click="drillBack">返回上一级</el-button>

      <div ref="mapRef" class="china-map"></div>
<!--      <div ref="threeRef" class="three-view">
        <div class="cam-info">
          Camera →
          X: {{ cam.x.toFixed(2) }}&nbsp;
          Y: {{ cam.y.toFixed(2) }}&nbsp;
          Z: {{ cam.z.toFixed(2) }}
        </div>
      </div>-->
    </div>

    <!-- ============ 右侧分布栏 ============ -->
    <div class="stats-sidebar right-panel">
      <h3 class="sidebar-title">设备状态分布</h3>

      <div class="stats-section">
        <h4 class="section-title">在线状态</h4>
        <div class="stats-cards">
          <div class="stat-card online">
            <div class="stat-icon"><el-icon>
                <VideoPlay />
              </el-icon></div>
            <div class="stat-content">
              <div class="stat-value">{{ deviceStats.online }}</div>
              <div class="stat-label">
                在线设备 ({{ onlinePercentage.toFixed(1) }}%)
              </div>
            </div>
          </div>
          <div class="stat-card offline">
            <div class="stat-icon"><el-icon>
                <VideoPause />
              </el-icon></div>
            <div class="stat-content">
              <div class="stat-value">{{ deviceStats.offline }}</div>
              <div class="stat-label">
                离线设备 ({{ offlinePercentage.toFixed(1) }}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h4 class="section-title">设备类型</h4>
        <div class="stats-cards">
          <div class="stat-card total">
            <div class="stat-icon"><el-icon>
                <Sunny />
              </el-icon></div>
            <div class="stat-content">
              <div class="stat-value">{{ Math.floor(deviceStats.total * 0.6) }}</div>
              <div class="stat-label">智能灯杆</div>
            </div>
          </div>
          <div class="stat-card total">
            <div class="stat-icon"><el-icon>
                <Van />
              </el-icon></div>
            <div class="stat-content">
              <div class="stat-value">{{ Math.floor(deviceStats.total * 0.3) }}</div>
              <div class="stat-label">巡检小车</div>
            </div>
          </div>
          <div class="stat-card total">
            <div class="stat-icon"><el-icon>
                <Connection />
              </el-icon></div>
            <div class="stat-content">
              <div class="stat-value">{{ Math.floor(deviceStats.total * 0.1) }}</div>
              <div class="stat-label">无人机</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/* ---------- 基础依赖 ---------- */
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import {
  Monitor, VideoPlay, VideoPause, ChatDotSquare, Warning,
  Sunny, Van, Connection
} from '@element-plus/icons-vue'
import {
  getDefWebSocketClient,
  subscriptionDeviceOnlineStateSwitchEvent,
  OnlineState
} from '@/util/Api'

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import lampGlbUrl from '@/model/灯杆.glb?url'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

/* ---------- ECharts 依赖 ---------- */
import * as echarts from 'echarts'
import chinaGeo from '@/map/中华人民共和国.json'
import hubeiGeo from '@/map/湖北省.json'
import huangshiGeo from '@/map/黄石市.json'
import { ElMessage } from 'element-plus'

/* ---------- 路由 ---------- */
const router = useRouter()

/* ---------- 统计数据 ---------- */
const deviceStats = ref({ total: 0, online: 0, offline: 0 })
const messageStats = ref({ total: 0, alerts: 0 })
const lastUpdateTime = ref(null)
const recentLogs = ref([])

/* ----- 百分比 ----- */
const onlinePercentage = computed(() =>
  deviceStats.value.total
    ? (deviceStats.value.online / deviceStats.value.total) * 100
    : 0
)
const offlinePercentage = computed(() =>
  deviceStats.value.total
    ? (deviceStats.value.offline / deviceStats.value.total) * 100
    : 0
)

/* ----- 工具函数 ----- */
const formatTime = (ts) =>
  ts
    ? new Date(ts).toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    })
    : ''
const addLog = (msg) => {
  recentLogs.value.unshift({ id: Date.now(), time: Date.now(), message: msg })
  if (recentLogs.value.length > 10) recentLogs.value.pop()
}

// threejs相关

const threeRef = ref(null)
let lampModel = null

/* Three.js 相关变量 */
let renderer, scene, camera, clock, controls
let animationId
scene = new THREE.Scene()

const cam = reactive({ x: 0, y: 0, z: 0 })
function initThree() {
  if (!threeRef.value) return

  /* 基本实例化 */
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)        // 透明背景也可以

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })

  const w = threeRef.value.clientWidth
  const h = threeRef.value.clientHeight
  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)


  /* === OrbitControls === */
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true        // 阻尼更顺滑
  controls.dampingFactor = 0.1
  controls.autoRotate = false          // 由用户自己转
  controls.maxPolarAngle = Math.PI / 2 // 限制俯仰（可选）
  controls.update()

  renderer.setSize(w, h)
  threeRef.value.appendChild(renderer.domElement)

  /* 光源 */
  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const dir = new THREE.DirectionalLight(0xffffff, 1)
  dir.position.set(3, 10, 8)
  scene.add(dir)

  /* ↓↓↓ 灯杆模型，演示用 BoxGeometry 占位 ↓↓↓ */
  // 替换成 GLTFLoader 直接 load 你的 lamp.glb
  const gltfLoader = new GLTFLoader()
  gltfLoader.load(lampGlbUrl, (gltf) => {
    /* === 载入 & 基础处理 === */
    lampModel = gltf.scene
    lampModel.scale.set(1, 1, 1)
    scene.add(lampModel)

    /* === 1. 底座对齐到 y = 0 === */
    const box = new THREE.Box3().setFromObject(lampModel)
    lampModel.position.y -= box.min.y          // 把底座压到地面

    /* === 2. 整体抬高 LIFT 米 === */
    const LIFT = 1
    lampModel.position.y += LIFT

    /* === 3. 给名为 “灯杆” 的网格换材质 === */
    const sciFiBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0066ff,
      emissive: 0x0088ff,
      emissiveIntensity: 0.6,
      metalness: 0.5,
      roughness: 0.6
    })
    lampModel.traverse((child) => {
      if (child.isMesh && child.name === '灯杆') {
        child.material.dispose?.()
        child.material = sciFiBlueMat
      }
    })

    /* === 4. 重新计算抬高后的中心点，设为 OrbitControls 旋转中心 === */
    const newBox = new THREE.Box3().setFromObject(lampModel)   // 已含偏移
    const center = newBox.getCenter(new THREE.Vector3())
    controls.target.copy(center)
    controls.update()

    /* === 5. 相机放到你想要的视角 === */
    camera.position.set(0, 1.47, -3.84)   // 可随时微调
    controls.update()                     // 再更新一次

    /* === 6. 刷新 HUD 显示 === */
    cam.x = camera.position.x
    cam.y = camera.position.y
    cam.z = camera.position.z
  })

  /* 渲染循环 */
  clock = new THREE.Clock()
  const animate = () => {
    animationId = requestAnimationFrame(animate)
    controls?.update()
    if (lampModel) {
      lampModel.rotation.y += 0.02
    }              // 自转
    renderer.render(scene, camera)
    cam.x = camera.position.x
    cam.y = camera.position.y
    cam.z = camera.position.z
  }
  animate()

  /* 处理窗口缩放 */
  window.addEventListener('resize', handleResize)
}

function handleResize() {
  if (!renderer) return
  const w = threeRef.value.clientWidth
  const h = threeRef.value.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

/* 销毁 */
function disposeThree() {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', handleResize)
  renderer?.dispose()
  scene?.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose?.()
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.())
      else obj.material.dispose?.()
    }
  })
  threeRef.value?.removeChild(renderer.domElement)
}

/* ---------- 地图相关 ---------- */
const mapRef = ref(null)
let mapChart = null
const drillStack = ref([])

/* ✨ 演示用散点数据 */
const scatterData = [
  { name: '北京', value: [116.46, 39.92] },
  { name: '上海', value: [121.48, 31.22] },
  { name: '广州', value: [113.23, 23.16] },
]

/* ===== 伪 3-D 地图 Option 生成器 ===== */
function buildMapOption(mapName) {
  const layerCfg = [
    { dy: 0, z: 0, border: 'rgba(58,149,253,0.8)', shadow: 'rgba(172,122,255,0.5)', bw: 1 },
    { dy: 1, z: -1, border: 'rgba(58,149,253,0.6)', shadow: 'rgba(65,214,255,0.6)', bw: 1 },
    { dy: 2, z: -2, border: 'rgba(58,149,253,0.4)', shadow: 'rgba(29,111,165,1)', bw: 1 },
    { dy: 3, z: -3, border: 'rgba(58,149,253,0.4)', shadow: 'rgba(29,111,165,0.8)', bw: 5 }
  ]

  const topGeo = {
    map: mapName,
    aspectScale: 1,
    zoom: 0.9,
    layoutCenter: ['50%', '50%'],
    layoutSize: '100%',
    roam: false,
    label: { show: false, color: '#fff' },
    itemStyle: {
      areaColor: {
        type: 'linear',
        x: 1200,
        y: 0,
        x2: 0,
        y2: 0,
        colorStops: [
          { offset: 0, color: 'rgba(3,27,78,0.75)' },
          { offset: 1, color: 'rgba(58,149,253,0.75)' }
        ],
        global: true
      },
      borderColor: '#c0f3fb',
      borderWidth: 0.8
    },
    emphasis: {
      itemStyle: { areaColor: 'rgba(0,254,233,0.6)' },
      label: { show: true, color: '#fff' }
    }
  }

  const bgGeos = layerCfg.map((l) => ({
    type: 'map',
    map: mapName,
    zlevel: l.z,
    aspectScale: 1,
    zoom: 0.9,
    layoutCenter: ['50%', `${50 + l.dy}%`],
    layoutSize: '100%',
    roam: false,
    silent: true,
    itemStyle: {
      borderWidth: l.bw,
      borderColor: l.border,
      shadowColor: l.shadow,
      shadowOffsetY: 5 + l.dy * 5,
      shadowBlur: 15,
      areaColor: 'rgba(5,21,35,0.1)'
    }
  }))

  return {
    tooltip: { trigger: 'item' },
    geo: [topGeo, ...bgGeos],
    series: [
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: scatterData,
        symbolSize: 10,
        label: { formatter: '{b}', position: 'right', show: true },
        itemStyle: { color: '#f4e925', shadowBlur: 10, shadowColor: '#333' }
      }
    ]
  }
}

/* ===== 初始化地图 ===== */
function initChinaMap() {
  if (!mapRef.value) return
  mapChart = echarts.init(mapRef.value)

  echarts.registerMap('china-root', chinaGeo)
  echarts.registerMap('湖北省', hubeiGeo)
  echarts.registerMap('黄石市', huangshiGeo)
  mapChart.setOption(buildMapOption('china-root'))

  /* 点击下钻：按需加载省/市 GeoJSON */
  mapChart.on('click', async (params) => {
    const { name } = params

    /* (1) 已经静态注册就直接下钻 */
    if (echarts.getMap(name)) {
      drillStack.value.push(name)
      mapChart.setOption(buildMapOption(name), true) // true=merge
      return
    }

    /* (2) 否则尝试按旧逻辑远程拉取（可选） */
    try {
      const nextUrl =
        drillStack.value.length === 0
          ? `/maps/${name}.json`
          : `/maps/${drillStack.value[0]}/${name}.json`

      const res = await fetch(nextUrl)
      if (!res.ok) throw new Error()
      const geoJson = await res.json()

      echarts.registerMap(name, geoJson)
      drillStack.value.push(name)
      mapChart.setOption(buildMapOption(name), true)
    } catch {
      ElMessage.warning('暂未准备好该地图数据')
    }
  })
}

/* 返回 */
function drillBack() {
  if (!drillStack.value.length) return
  drillStack.value.pop()
  const target = drillStack.value.slice(-1)[0] || 'china-root'
  mapChart.setOption(buildMapOption(target), true)
}

/* ===== 统计数据拉取（示例） ===== */
const loadStatistics = async () => {
  deviceStats.value = { total: 42, online: 35, offline: 7 }
  messageStats.value = { total: 1248, alerts: 3 }
  lastUpdateTime.value = Date.now()
  addLog('系统统计数据已更新')
}

/* ===== 生命周期 ===== */
let unsubscribeDeviceState = null
let interval = null

onMounted(async () => {
  await loadStatistics()
  initChinaMap()
  initThree()

  const client = getDefWebSocketClient()
  if (client) {
    unsubscribeDeviceState = subscriptionDeviceOnlineStateSwitchEvent(client, {
      next: (val) => {
        if (val.onlineState === OnlineState.ONLINE) {
          deviceStats.value.online++
          deviceStats.value.offline--
          addLog(`设备 ${val.device.name} 上线`)
        } else {
          deviceStats.value.online--
          deviceStats.value.offline++
          addLog(`设备 ${val.device.name} 离线`)
        }
        lastUpdateTime.value = Date.now()
      },
      error: () => addLog('设备状态监听异常')
    })
  }

  interval = setInterval(loadStatistics, 30_000)
})

onUnmounted(() => {
  interval && clearInterval(interval)
  unsubscribeDeviceState && unsubscribeDeviceState()
  mapChart && mapChart.dispose()
  disposeThree()
})
</script>

<style scoped>
/* —— 布局 —— */
.dashboard-container {
  display: flex;
  height: 100%;
  gap: 24px;
  justify-content: space-between;
}

.map-panel {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}

.three-view {
  position: absolute;
  left: 12px;
  /* 你可以自己调 */
  bottom: 12px;
  width: 220px;
  /* 建议写死，便于像素对齐 */
  height: 220px;
  pointer-events: auto;
  /* 不抢地图事件；需要交互就删掉 */
  border-radius: 6px;
  overflow: hidden;
  /* 可选：裁掉多余内容 */
  box-shadow: 0 0 8px #00baff inset, 0 0 8px #00baff;
}

.cam-info {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-size: 11px;
  color: #ffffff;
  text-shadow: 0 0 4px #000;
  user-select: none;
}

.china-map {
  flex: 1;
  min-height: 480px;
  width: 100%;
  border: 1px solid rgba(0, 255, 255, .2);
  border-radius: 6px;
}

.back-btn {
  position: absolute;
  top: 8px;
  left: 12px;
  z-index: 2;
}

/* —— 左右栏（原样） —— */
.stats-sidebar {
  width: 320px;
  background: rgba(10, 15, 30, 0.95);
  border: 1px solid #06f6f1;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 0 20px rgba(6, 246, 241, 0.3);
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.stats-sidebar::-webkit-scrollbar {
  width: 0;
  height: 0
}

.sidebar-title {
  color: #00ffff;
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 24px;
  text-align: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(6, 246, 241, 0.3);
}

.stats-section {
  margin-bottom: 32px
}

.section-title {
  color: #8fe8ff;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  padding-left: 8px;
  border-left: 3px solid #00ffea;
}

.stats-cards {
  display: flex;
  flex-direction: column;
  gap: 12px
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(0, 255, 234, .1);
  border: 1px solid rgba(0, 255, 234, .3);
  border-radius: 8px;
  transition: .3s
}

.stat-card:hover {
  background: rgba(0, 255, 234, .15);
  box-shadow: 0 0 12px rgba(0, 255, 234, .4);
  transform: translateY(-2px)
}

.stat-icon {
  margin-right: 12px;
  font-size: 24px;
  color: #00ffea
}

.stat-content {
  flex: 1
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #fff
}

.stat-label {
  font-size: 12px;
  color: #8fe8ff;
  margin-top: 4px
}

.stat-card.total .stat-icon {
  color: #00d8ff
}

.stat-card.online .stat-icon {
  color: #00e676
}

.stat-card.offline .stat-icon {
  color: #ff5252
}

.stat-card.messages .stat-icon {
  color: #ffab00
}

.stat-card.alerts .stat-icon {
  color: #ff6d00
}

.status-indicators {
  display: flex;
  flex-direction: column;
  gap: 12px
}

.status-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 255, 234, .05);
  border-radius: 6px
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
  margin-right: 12px;
  animation: pulse 2s infinite
}

.status-dot.online {
  background: #00e676
}

.status-text {
  font-size: 13px;
  color: #c8feff
}

@keyframes pulse {

  0%,
  100% {
    opacity: .5
  }

  50% {
    opacity: 1
  }
}

.right-panel {
  width: 300px;
  margin-left: auto
}

/* —— 响应式 —— */
@media (max-width:1200px) {
  .dashboard-container {
    flex-direction: column;
    gap: 20px
  }

  .stats-sidebar,
  .right-panel {
    width: 100%
  }
}
</style>
