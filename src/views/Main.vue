<template>
  <div class="detection-container">
    <!-- 粒子效果，在所有页面渲染，并带上 particles 类 -->
    <vue-particles v-if="showDecor" id="tsparticles" class="particles" :options="particlesOptions"
      :class="{ dim: !isBright }" />

    <div v-if="showDecor" class="global-map" :class="{ dim: !isBright }">
      <div class="map1"></div>
      <div class="map2"></div>
      <div class="map3"></div>
    </div>

    <!-- 主布局 -->
    <el-container class="common-container">
      <el-header height="70px" class="common-header">
        <div class="header-content">
          <div class="button-group">
            <!-- 四个按钮 -->
            <el-button type="text" @click="onMenuClick('main')" class="menu-btn">
              <span>主界面</span>
              <!--              <el-badge :value="0" class="badge" />-->
            </el-button>
            <el-button type="text" @click="onMenuClick('light')" class="menu-btn">
              <span>智能灯杆</span>
              <!--              <el-badge :value="0" class="badge" />-->
            </el-button>
            <el-button type="text" @click="onMenuClick('car')" class="menu-btn">
              <span>巡检小车</span>
              <!--              <el-badge :value="0" class="badge" />-->
            </el-button>
            <el-button type="text" @click="onMenuClick('uav')" class="menu-btn">
              <span>无人机</span>
              <!--              <el-badge :value="0" class="badge" />-->
            </el-button>
          </div>
          <h1 class="title">智慧城市感算智协一体化照明系统</h1>
        </div>
      </el-header>

      <el-main class="main-content">
        <RouterView />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import router from '@/router'
import {
  createDefWebSocketClient,
  getDefWebSocketClient,
  getToken,
  OnlineState,
  subscriptionDeviceOnlineStateSwitchEvent,
} from '@/util/Api'
import { ElNotification } from 'element-plus'

// 粒子配置：小颗粒 + 缓慢漂浮 + 连接线
const particlesOptions = {
  fullScreen: {
    // 由我们自己定位，禁用默认全屏
    enable: false,
  },
  background: {
    // 透明背景，方便叠到界面上
    color: { value: 'transparent' },
  },
  particles: {
    // 1) 数量与分布
    number: {
      value: 80,
      density: { enable: true, area: 800 },
    },

    // 2) 颜色：三种霓蓝随机
    color: { value: ['#00ffff', '#06f6f1', '#009dff'] },

    // 3) 形状与大小：圆点 + 轻微闪烁
    shape: { type: ['circle', 'edge'] },
    size: {
      value: 3,
      random: { enable: true, minimumValue: 1 },
      animation: { enable: true, speed: 4, minimumValue: 0.5, sync: false },
    },

    // 4) 透明度呼吸
    opacity: {
      value: 0.5,
      random: { enable: true, minimumValue: 0.2 },
      animation: { enable: true, speed: 1.5, minimumValue: 0.2, sync: false },
    },

    // 5) 连接线 + 三角网格
    links: {
      enable: true,
      distance: 130,
      color: '#00ffff',
      opacity: 0.25,
      width: 1,
      triangles: { enable: true, color: '#008cff', opacity: 0.08 },
    },

    // 6) 漂移速度
    move: {
      enable: true,
      speed: 1,
      direction: 'none',
      straight: false,
      outModes: { default: 'out' },
    },

    // 7) 随机闪烁点
    twinkle: {
      particles: { enable: true, frequency: 0.05, color: '#ffffff', opacity: 1 },
    },

    // 8) 自带发光
    shadow: { enable: true, blur: 5, color: '#00ffff' },
  },

  // 9) 悬停排斥交互
  interactivity: {
    events: { onHover: { enable: true, mode: 'repulse' }, resize: true },
    modes: { repulse: { distance: 120, speed: 0.6 } },
  },

  detectRetina: true, // HiDPI 适配
}

const route = useRoute()
const isBright = ref(true) // 控制背景亮度

const hideDecorRoutes = ['/light/monitor', '/uav']   // 注意用小写
const showDecor = computed(() =>
  !hideDecorRoutes.some(p => route.path.toLowerCase().startsWith(p))
)

// 监听路由变化，主界面保持亮度，其他页面暗化
watch(
  () => route.path,
  (newPath) => {
    if (newPath === '/main') {
      isBright.value = true
    } else {
      isBright.value = false
    }
  },
  { immediate: true },
)

function onMenuClick(type) {
  switch (type) {
    case 'main':
      isBright.value = true // 主界面保持亮度
      router.push({ path: '/Dashboard' })
      break
    case 'light':
      isBright.value = false // 其他页面触发暗化
      router.push({ path: '/deviceList/LIGHT' })
      break
    case 'car':
      isBright.value = false // 其他页面触发暗化
      router.push({ path: '/deviceList/CAR' })
      break
    case 'uav':
      isBright.value = false // 其他页面触发暗化
      router.push({ path: '/UAV' })
      break
  }
}

let unsubscribeDeviceOnlineStateSwitchEvent = null

onMounted(() => {
  // 鉴权检查
  if (getToken() === '') {
    router.push({ path: '/' })
    return
  }

  // 建立 WebSocket
  if (!getDefWebSocketClient()) {
    createDefWebSocketClient()
  }

  // 订阅设备上下线通知
  unsubscribeDeviceOnlineStateSwitchEvent = subscriptionDeviceOnlineStateSwitchEvent(
    getDefWebSocketClient(),
    {
      next(value) {
        ElNotification({
          type: value.onlineState === OnlineState.ONLINE ? 'success' : 'warning',
          title: value.onlineState === OnlineState.ONLINE ? '设备上线' : '设备离线',
          message: value.device.name,
        })
      },
      error() { },
      complete() { },
    },
  )
})

onUnmounted(() => {
  if (unsubscribeDeviceOnlineStateSwitchEvent) {
    unsubscribeDeviceOnlineStateSwitchEvent()
    unsubscribeDeviceOnlineStateSwitchEvent = null
  }
})
</script>

<style scoped>
/* ========== 顶栏与按钮 ========== */
.detection-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.common-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 0;
}

.common-header {
  background: rgba(0, 10, 20, 0.95);
  border: 1px solid #00ffea;
  box-shadow: 0 0 8px #00ffea;
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.header-content {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
}

.button-group {
  display: flex;
  gap: 16px;
}

.menu-btn {
  display: flex;
  align-items: center;
  border: 1px solid rgba(0, 255, 234, 0.6);
  border-radius: 6px;
  padding: 8px 14px;
  box-shadow: inset 0 0 4px rgba(0, 255, 234, 0.2);
  color: #8fe8ff;
  transition:
    border-color 0.3s,
    box-shadow 0.3s,
    color 0.3s;
}

.menu-btn:hover {
  border-color: #00ffea;
  box-shadow: 0 0 8px #00ffea;
  color: #00ffea;
}

.title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 22px;
  font-weight: 800;
  color: #00ffff;
  z-index: 1;
}

.main-content {
  flex: 1;
  padding: 24px;
  background: #0a0f1e;
  overflow: auto;
}

.particles {
  position: fixed;
  top: 100px;
  /* 跳过顶部 header */
  left: 0;
  width: 100vw;
  height: calc(100vh - 100px);
  z-index: 0;
  /* 在旋转球下方 */
  pointer-events: none;
  /* 事件穿透 */
}

/* 如果你还挂了 <canvas> 直入 body，可以加上同样的定位 */
#tsparticles+canvas {
  position: fixed !important;
  top: 100px !important;
  left: 0 !important;
  width: 100vw !important;
  height: calc(100vh - 100px) !important;
  z-index: 0 !important;
  pointer-events: none !important;
}

.particles,
#tsparticles+canvas {
  /* 保险：同时覆盖生成的 <canvas> */
  z-index: 2 !important;
  filter: drop-shadow(0 0 6px #00ffff) blur(0.4px) brightness(300%);
  opacity: 1;
  transition:
    filter 1.5s ease,
    opacity 1.5s ease;
}

.particles.dim,
.particles.dim+canvas {
  /* 同步降低亮度 + 半透明 */
  filter: drop-shadow(0 0 6px #00ffff) blur(0.4px) brightness(100%);
  opacity: 0.3;
}

/* ========== 全屏旋转背景层 ========== */
.global-map {
  position: fixed;
  top: 100px;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  pointer-events: none;
  overflow: hidden;

  /* 初始：非常亮且完全不透明 */
  filter: brightness(300%);
  opacity: 1;
  transition:
    filter 1.5s ease,
    opacity 1.5s ease;
}

.global-map.dim {
  /* 暗淡：恢复到正常亮度，并半透明 */
  filter: brightness(100%);
  opacity: 0.3;
}

/* 公共图层定位 + 背景图 */
.global-map .map1,
.global-map .map2,
.global-map .map3 {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-size: 100% 100%;
  transition: opacity 1.5s ease;
  /* 额外保底一下 */
}

/* 你想要的“亮”状态下各球的不透明度 */
.global-map .map1 {
  width: 45vw;
  height: 45vw;
  max-width: 820px;
  max-height: 820px;
  background-image: url(@/images/map.png);
  opacity: 0.35;
}

.global-map .map2 {
  width: 58vw;
  height: 58vw;
  max-width: 1080px;
  max-height: 1080px;
  background-image: url(@/images/lbx.png);
  opacity: 0.75;
  animation: spinCW 20s linear infinite;
}

.global-map .map3 {
  width: 50vw;
  height: 50vw;
  max-width: 930px;
  max-height: 930px;
  background-image: url(@/images/jt.png);
  opacity: 0.85;
  animation: spinCCW 14s linear infinite;
}

/* dim 状态下，平滑降回你原来的半透明 */
.global-map.dim .map1 {
  opacity: 0.25;
}

.global-map.dim .map2 {
  opacity: 0.3;
}

.global-map.dim .map3 {
  opacity: 0.22;
}

@keyframes spinCW {
  from {
    transform: translate(-50%, -50%) rotate(0);
  }

  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes spinCCW {
  from {
    transform: translate(-50%, -50%) rotate(0);
  }

  to {
    transform: translate(-50%, -50%) rotate(-360deg);
  }
}
</style>
