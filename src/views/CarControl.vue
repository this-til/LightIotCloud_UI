<template>
  <div class="car-control-container">
    <div class="control-panel">
      <h3 class="panel-title">车辆远程操控</h3>

      <div class="control-sections">
        <!-- 平移控制 -->
        <div class="control-section">
          <h4 class="section-title">平移控制</h4>
          <div class="direction-controls">
            <el-button class="direction-btn up-btn" :disabled="!car?.online"
              @mousedown="startContinuousControl('translationAdvance')" @mouseup="stopContinuousControl"
              @mouseleave="stopContinuousControl" @touchstart="startContinuousControl('translationAdvance')"
              @touchend="stopContinuousControl">
              <el-icon>
                <CaretTop />
              </el-icon>
              <span>前进 (W)</span>
            </el-button>
            <div class="middle-row">
              <el-button class="direction-btn left-btn" :disabled="!car?.online"
                @mousedown="startContinuousControl('translationLeft')" @mouseup="stopContinuousControl"
                @mouseleave="stopContinuousControl" @touchstart="startContinuousControl('translationLeft')"
                @touchend="stopContinuousControl">
                <el-icon>
                  <CaretLeft />
                </el-icon>
                <span>左移 (A)</span>
              </el-button>
              <el-button class="direction-btn right-btn" :disabled="!car?.online"
                @mousedown="startContinuousControl('translationRight')" @mouseup="stopContinuousControl"
                @mouseleave="stopContinuousControl" @touchstart="startContinuousControl('translationRight')"
                @touchend="stopContinuousControl">
                <el-icon>
                  <CaretRight />
                </el-icon>
                <span>右移 (D)</span>
              </el-button>
            </div>
            <el-button class="direction-btn down-btn" :disabled="!car?.online"
              @mousedown="startContinuousControl('translationRetreat')" @mouseup="stopContinuousControl"
              @mouseleave="stopContinuousControl" @touchstart="startContinuousControl('translationRetreat')"
              @touchend="stopContinuousControl">
              <el-icon>
                <CaretBottom />
              </el-icon>
              <span>后退 (S)</span>
            </el-button>
          </div>
        </div>

        <!-- 旋转控制 -->
        <div class="control-section">
          <h4 class="section-title">旋转控制</h4>
          <div class="angular-controls">
            <el-button class="angular-btn" :disabled="!car?.online" @mousedown="startContinuousControl('angularLeft')"
              @mouseup="stopContinuousControl" @mouseleave="stopContinuousControl"
              @touchstart="startContinuousControl('angularLeft')" @touchend="stopContinuousControl">
              <el-icon>
                <RefreshLeft />
              </el-icon>
              <span>左转 (Q)</span>
            </el-button>
            <el-button class="angular-btn" :disabled="!car?.online" @mousedown="startContinuousControl('angularRight')"
              @mouseup="stopContinuousControl" @mouseleave="stopContinuousControl"
              @touchstart="startContinuousControl('angularRight')" @touchend="stopContinuousControl">
              <el-icon>
                <RefreshRight />
              </el-icon>
              <span>右转 (E)</span>
            </el-button>
          </div>
        </div>

        <!-- 停止控制 -->
        <div class="control-section">
          <h4 class="section-title">停止控制</h4>
          <el-button class="stop-btn" type="danger" :disabled="!car?.online" @click="handleOperation('stop')">
            <el-icon>
              <VideoPause />
            </el-icon>
            <span>停止 (空格)</span>
          </el-button>
        </div>
      </div>

      <div class="status-info">
        <div class="status-item">
          <span>设备状态:</span>
          <span :class="['status-value', car?.online ? 'online' : 'offline']">
            {{ car?.online ? '在线' : '离线' }}
          </span>
        </div>
        <div class="keyboard-hints">
          <p>键盘操控: W前进 S后退 A左移 D右移 Q左转 E右转 空格停止</p>
        </div>
      </div>
    </div>
    <div class="video-container">
      <video ref="videoRef" class="video-player" autoplay muted crossorigin="anonymous"></video>
      <div v-if="!isPlaying" class="video-placeholder">
        <el-icon class="placeholder-icon">
          <VideoCamera />
        </el-icon>
        <span>视频加载中...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  CaretTop,
  CaretBottom,
  CaretLeft,
  CaretRight,
  RefreshLeft,
  RefreshRight,
  VideoPause,
  VideoCamera
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCarById, operationCar } from '@/util/Api'
import Hls from 'hls.js'

const route = useRoute()
const car = ref(null)
const videoRef = ref(null)
const isPlaying = ref(false)
let operationTimer = null
let currentOp = null

// 视频流相关
const streamUrl = ref(`http://192.168.117.34:8888/orbbec_cam/index.m3u8`)
const retryPause = 2000 // 重试间隔
let hls = null
let retryTimeout = null

// 远程控制请求
async function controlCar(op) {
  const carId = Number(route.query.id)
  if (!carId) {
    ElMessage.warning('设备ID无效')
    return
  }
  if (!car.value?.online) {
    ElMessage.warning('设备不在线，无法操控')
    return
  }
  try {
    const res = await operationCar(carId, op)
    if (res.resultType !== 'SUCCESSFUL') {
      ElMessage.error(`操作失败: ${res.message || '未知错误'}`)
    }
  } catch {
    ElMessage.error('操控请求失败，请检查网络连接')
  }
}

// 开始持续控制
function startContinuousControl(op) {
  stopContinuousControl()
  currentOp = op
  controlCar(op)
  operationTimer = setInterval(() => controlCar(op), 250)
}

// 停止持续控制
function stopContinuousControl() {
  clearInterval(operationTimer)
  operationTimer = null
  currentOp = null
}

// 单次停止按钮
async function handleOperation(op) {
  await controlCar(op)
}

// 视频加载相关函数
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.platform) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

const loadStream = () => {
  if (!videoRef.value) return

  // 清除之前的重试定时器
  if (retryTimeout) {
    clearTimeout(retryTimeout)
    retryTimeout = null
  }

  // 清除之前的HLS实例
  if (hls) {
    hls.destroy()
    hls = null
  }

  try {
    if (!streamUrl.value) {
      throw new Error('视频流URL不可用')
    }

    // Add CORS attribute to video element
    videoRef.value.crossOrigin = 'anonymous'

    // 优先使用hls.js
    if (Hls.isSupported() && !isIOS()) {
      hls = new Hls({
        maxLiveSyncPlaybackRate: 1.5,
        liveSyncDuration: 1,   // seconds
        liveMaxLatencyDuration: 2, // seconds
        debug: false,
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS错误:', data)
        if (data.fatal) {
          // 处理致命错误
          let errorMessage = '视频流错误'

          if (data.details === 'manifestIncompatibleCodecsError') {
            errorMessage = '视频流使用了浏览器不支持的编解码器'
          } else if (data.response && data.response.code === 404) {
            errorMessage = '视频流未找到'
          }

          ElMessage.error(`${errorMessage}, ${retryPause / 1000}秒后重试`)

          // 设置重试
          retryTimeout = setTimeout(() => {
            loadStream()
          }, retryPause)
        }
      })

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(streamUrl.value)
      })

      hls.on(Hls.Events.MANIFEST_LOADED, () => {
        isPlaying.value = true
      })

      hls.attachMedia(videoRef.value)

    } else if (videoRef.value.canPlayType('application/vnd.apple.mpegurl')) {
      // iOS设备使用原生HLS支持
      videoRef.value.src = streamUrl.value
      videoRef.value.addEventListener('loadedmetadata', () => {
        if (videoRef.value) {
          videoRef.value.play()
        }
        isPlaying.value = true
      })
    } else {
      throw new Error('您的浏览器不支持视频播放')
    }

  } catch (error) {
    console.error('视频流初始化失败:', error)
    ElMessage.error('视频连接失败: ' + error.message)

    // 设置重试
    retryTimeout = setTimeout(() => {
      loadStream()
    }, retryPause)
  }
}

// 键盘事件处理
function handleKeyDown(e) {
  if (currentOp) return
  const tag = e.target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  switch (e.key.toLowerCase()) {
    case 'w': e.preventDefault(); startContinuousControl('translationAdvance'); break
    case 's': e.preventDefault(); startContinuousControl('translationRetreat'); break
    case 'a': e.preventDefault(); startContinuousControl('translationLeft'); break
    case 'd': e.preventDefault(); startContinuousControl('translationRight'); break
    case 'q': e.preventDefault(); startContinuousControl('angularLeft'); break
    case 'e': e.preventDefault(); startContinuousControl('angularRight'); break
    case ' ': e.preventDefault(); handleOperation('stop'); break
  }
}

function handleKeyUp(e) {
  const mapKey = {
    w: 'translationAdvance',
    s: 'translationRetreat',
    a: 'translationLeft',
    d: 'translationRight',
    q: 'angularLeft',
    e: 'angularRight'
  }
  const cmd = mapKey[e.key.toLowerCase()]
  if (cmd === currentOp) stopContinuousControl()
}

onMounted(async () => {
  const id = Number(route.query.id)
  if (id) car.value = await getCarById(id)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  
  // 加载视频流
  loadStream()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  stopContinuousControl()
  
  // 清理重试定时器
  if (retryTimeout) {
    clearTimeout(retryTimeout)
  }

  // 清理HLS实例
  if (hls) {
    hls.destroy()
  }

  // 暂停视频
  if (videoRef.value) {
    videoRef.value.pause()
    videoRef.value.src = ''
  }
})
</script>

<style scoped>
.car-control-container {
  /* 深色星舰舱壁 */
  background: #0a0f1e;
  display: flex;
  justify-content: center;
  padding: 32px;
  height: 100%;
  flex-direction: row;
}

.control-panel {
  flex: 0 0 380px;
  padding: 32px 40px;
  overflow-y: auto;
  background: rgba(10, 15, 30, 0.85);
  border: 1px solid #06f6f1;
  border-right: none;
  border-radius: 0 18px 18px 0;
  box-shadow: 3px 0 14px rgba(0, 255, 234, .25),
    inset 0 0 6px rgba(0, 255, 234, .25);
}

.video-container {
  flex: 1 1 0;
  position: relative;
  overflow: hidden;
  background: #000;
  border-left: 1px solid #06f6f1;
  border-radius: 0 18px 18px 0;
  box-shadow: 0 0 14px rgba(0, 255, 234, .25);
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
  position: relative;
  z-index: 0;
}

.video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.9);
  color: #00ffea;
  z-index: 2;
}

.placeholder-icon {
  font-size: 64px;
  margin-bottom: 24px;
  color: #00ffea;
  text-shadow: 0 0 10px #00ffea;
  animation: placeholder-pulse 2s infinite ease-in-out;
}

@keyframes placeholder-pulse {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
}

/* ------- 若面板高度超屏，可滚动但隐藏滚动条 ------- */
.control-panel::-webkit-scrollbar {
  width: 0;
  height: 0;
}

/* ================= 标题 ================= */
.panel-title {
  margin: 0 0 26px;
  text-align: center;
  font-size: 26px;
  font-weight: 800;
  color: #00ffff;
  position: relative;
}

.panel-title::after {
  content: '';
  display: block;
  width: 180px;
  height: 2px;
  margin: 14px auto 0;
  background: linear-gradient(90deg, transparent, #00ffff 45%, transparent);
  filter: drop-shadow(0 0 6px #00ffff);
}

/* ================= 分段盒子 ================= */
.control-section {
  border: 1px solid rgba(0, 255, 234, 0.35);
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 24px;
  background: rgba(0, 255, 234, 0.05);
  box-shadow: inset 0 0 6px rgba(0, 255, 234, 0.25);
}

.section-title {
  margin: 0 0 18px;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: #00ffff;
}

/* ================= 通用按钮底样式 ================= */
.direction-btn,
.angular-btn,
.stop-btn {
  border-radius: 10px !important;
  font-size: 13px;
  font-weight: 600;
  color: #e6fcff;
  background: rgba(0, 255, 234, 0.15);
  border: 1px solid #00ffea;
  transition: transform .18s, box-shadow .18s, filter .2s;
}

.direction-btn:disabled,
.angular-btn:disabled,
.stop-btn:disabled {
  opacity: .35;
  filter: grayscale(0.6);
}

/* ================= 方向按钮 ================= */
.direction-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.middle-row {
  display: flex;
  gap: 60px;
}

.direction-btn {
  width: 110px;
  height: 58px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.direction-btn:hover:not(:disabled),
.direction-btn:focus-visible:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 0 10px #00ffea;
}

/* ================= 旋转按钮 ================= */
.angular-controls {
  display: flex;
  justify-content: center;
  gap: 48px;
}

.angular-btn {
  width: 140px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.angular-btn:hover:not(:disabled) {
  transform: translateY(-2px) rotateZ(-1deg);
  box-shadow: 0 0 10px #00ffea;
}

/* ================= 停止按钮 ================= */
.control-section:has(.stop-btn) {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stop-btn {
  width: 200px;
  height: 66px;
  color: #fff;
  background: rgba(245, 108, 108, 0.18);
  border: 1px solid #f56c6c;
}

.stop-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 0 14px #f56c6c;
}

/* ================= 状态 & 文案 ================= */
.status-info {
  margin-top: 18px;
  padding: 16px;
  text-align: center;
  border: 1px solid rgba(0, 255, 234, 0.35);
  border-radius: 10px;
  background: rgba(0, 255, 234, 0.05);
  box-shadow: inset 0 0 4px rgba(0, 255, 234, 0.3);
  color: #e6fcff;
  font-size: 14px;
}

.status-value.online {
  color: #00e676;
  text-shadow: 0 0 6px #00e676;
}

.status-value.offline {
  color: #ff5252;
  text-shadow: 0 0 6px #ff5252;
}

.keyboard-hints {
  margin-top: 6px;
  color: #8ab8ff;
  font-size: 12px;
  line-height: 1.4;
}
</style>
