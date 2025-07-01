<template>
  <div class="detection-container sci-fi">
    <div class="monitor-container">
      <!-- 控制面板容器（上下布局） -->
      <div class="control-panels">
        <!-- PTZ控制面板 -->
        <div class="ptz-control-panel">
          <h3 class="panel-title">云台控制</h3>

          <div class="direction-controls">
            <el-button class="direction-btn up-btn" @mousedown="startContinuousControl('up')"
                       @mouseup="stopContinuousControl" @mouseleave="stopContinuousControl"
                       @touchstart="startContinuousControl('up')" @touchend="stopContinuousControl">
              <el-icon>
                <CaretTop />
              </el-icon>
            </el-button>
            <div class="middle-row">
              <el-button class="direction-btn left-btn" @mousedown="startContinuousControl('left')"
                         @mouseup="stopContinuousControl" @mouseleave="stopContinuousControl"
                         @touchstart="startContinuousControl('left')" @touchend="stopContinuousControl">
                <el-icon>
                  <CaretLeft />
                </el-icon>
              </el-button>
              <el-button class="direction-btn right-btn" @mousedown="startContinuousControl('right')"
                         @mouseup="stopContinuousControl" @mouseleave="stopContinuousControl"
                         @touchstart="startContinuousControl('right')" @touchend="stopContinuousControl">
                <el-icon>
                  <CaretRight />
                </el-icon>
              </el-button>
            </div>
            <el-button class="direction-btn down-btn" @mousedown="startContinuousControl('down')"
                       @mouseup="stopContinuousControl" @mouseleave="stopContinuousControl"
                       @touchstart="startContinuousControl('down')" @touchend="stopContinuousControl">
              <el-icon>
                <CaretBottom />
              </el-icon>
            </el-button>
          </div>
        </div>

        <!-- 新增模型选择面板 -->
        <div class="model-control-panel">
          <h3 class="panel-title">模型选择</h3>

          <div class="model-controls">
            <el-checkbox-group v-model="selectedModels" @change="handleModelChange"
                               class="enlarged-checkbox-group">
              <el-checkbox v-for="model in modelOptions" :key="model" :label="model" :border="true">{{
                  model }}</el-checkbox>
            </el-checkbox-group>
          </div>

          <!-- 火灾检测进度条 -->
          <div v-if="isFireModelActive" class="fire-detection-progress">
            <div class="progress-label">
              <span>火灾检测警报</span>
              <span class="progress-text">{{ fireProgress }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: fireProgress + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="video-container">
        <video ref="videoRef" class="video-player" autoplay muted crossorigin="anonymous"></video>
        <canvas ref="canvasRef" class="bounding-box-canvas"></canvas>
        <div v-if="!isPlaying" class="video-placeholder">
          <el-icon class="placeholder-icon">
            <VideoCamera />
          </el-icon>
          <span>视频加载中...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { VideoCamera, CaretTop, CaretBottom, CaretLeft, CaretRight, ZoomIn, ZoomOut } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import Hls from 'hls.js'
import { getColorPreset, colorPresetMap } from '@/util/ColorPreset'
import {
  subscriptionLightSustainedDetectionReportEvent,
  getDefWebSocketClient,
  setSustainedDetection,
  closeSustainedDetection,
  ptzControl,
  dispatch,
  interrupt,
  setRollingDoor,
  setUavBaseStationCover,
  setUavBaseStationClamp,
  SUCCESSFUL,
  getCarById,
  operationCar,
  broadcastFileCar
} from '@/util/Api'
import { drawBoundingBoxes } from '@/util/DrawBoundingBoxes'

const props = defineProps({
  device: Object
})

const route = useRoute()
const videoRef = ref(null)
const isPlaying = ref(false)
const canvasRef = ref(null)
let unsubscribeSustained = null
const detections = ref([])

const streamUrl = ref(`http://192.168.117.3:8888/hik_cam/index.m3u8`)

// 添加模型选项和选择状态
const modelOptions = Object.keys(colorPresetMap);
const selectedModels = ref([]);

// 添加定时器变量
const ptzTimer = ref(null)
const currentDirection = ref(null)

// 火灾检测相关变量
const fireProgress = ref(0) // 火灾检测进度 0-100
const fireDetectionCount = ref(0) // 火灾检测计数
const maxFireDetections = 10 // 触发警报所需的检测次数
const progressDecayInterval = ref(null) // 进度衰减定时器
const lastFireDetectionTime = ref(0) // 最后一次检测到火灾的时间
const alertTriggered = ref(false) // 警报触发标志，确保单次选择只触发一次

const batchLock = reactive({ rolling: false, cover: false, clamp: false })

// 车控制相关的
/* ———————————————————————————*
 | 2. 车辆状态 & 定时器                                      |
 *———————————————————————————*/
const car = ref(null)             // 车辆在线状态等（可选，用来判断 offline）
const carTimer = ref(null)            // setInterval 句柄
const currentCarOp = ref(null)            // 当前持续动作

/* ———————————————————————————*
 | 3. 指令封装                                              |
 *———————————————————————————*/
const controlCar = async (op) => {
  const id = 16 //TODO 实际获取车的 id
  if (!id) return ElMessage.warning('车辆ID无效')
  if (car.value && !car.value.online) return ElMessage.warning('车辆离线')
  try {
    const res = await operationCar(id, op)
    if (res.resultType !== 'SUCCESSFUL') {
      ElMessage.error(`车辆指令失败: ${res.message || '未知错误'}`)
    }
  } catch {
    ElMessage.error('车辆操控请求失败')
  }
}

const startCar = (op) => {
  stopCar()
  currentCarOp.value = op
  controlCar(op)
  carTimer.value = setInterval(() => controlCar(op), 250)
}

const stopCar = () => {
  if (carTimer.value) clearInterval(carTimer.value)
  carTimer.value = null
  currentCarOp.value = null
  controlCar('stop')
}

/* ———————————————————————————*
 | 4. 键盘监听 (WASD / Q E / Space)                         |
 *———————————————————————————*/
const handleKeyDown = (e) => {
  if (e.repeat) return
  const k = e.key.toLowerCase()
  if (['input', 'textarea'].includes((e.target.tagName || '').toLowerCase())) return

  switch (k) {
    case 'w': startCar('translationAdvance'); e.preventDefault(); break
    case 's': startCar('translationRetreat'); e.preventDefault(); break
    case 'a': startCar('translationLeft'); e.preventDefault(); break
    case 'd': startCar('translationRight'); e.preventDefault(); break
    case 'q': startCar('angularLeft'); e.preventDefault(); break
    case 'e': startCar('angularRight'); e.preventDefault(); break
    case ' ': controlCar('stop'); e.preventDefault(); break
  }
}

const handleKeyUp = (e) => {
  const k = e.key.toLowerCase()
  const map = {
    w: 'translationAdvance', s: 'translationRetreat', a: 'translationLeft', d: 'translationRight', q: 'angularLeft', e: 'angularRight'
  }
  if (map[k] && currentCarOp.value === map[k]) stopCar()
}

/**
 * 统一开/关三项
 * @param {boolean} state  true=开  false=关
 */
const batchSwitch = async (state) => {
  const id = Number(route.query.id)
  if (!id) {
    ElMessage.error('ID 无效')
    return
  }

  /* ===== 卷帘门 ===== */
  if (!batchLock.rolling) {
    batchLock.rolling = true
    setRollingDoor(id, state)
      .finally(() => (batchLock.rolling = false))
  }

  /* ===== 基站盖板 ===== */
  if (!batchLock.cover) {
    batchLock.cover = true
    setUavBaseStationCover(id, state)
      .finally(() => (batchLock.cover = false))
  }

  /* ===== 基站夹具 ===== */
  if (!batchLock.clamp) {
    batchLock.clamp = true
    setUavBaseStationClamp(id, state)
      .finally(() => (batchLock.clamp = false))
  }
}

/**
 * 处理数字键播放音频
 * @param {string} key 按下的数字键
 */
const handleBroadcastAudio = async (key) => {
  const carId = 16
  if (!carId) {
    ElMessage.warning('车辆ID无效')
    return
  }

  // 检查车辆是否在线
  if (car.value && !car.value.online) {
    ElMessage.warning('车辆离线，无法播放音频')
    return
  }

  // 定义数字键对应的音频内容
  const audioMap = {
    '1': '正在建图，请稍候',
    '2': '开始寻找着火点',
    '3': '发现着火目标，正在前往',
    '4': '已到达着火地点，开始灭火',
    '5': '完成灭火操作，正在返航'
  }

  const audioContent = audioMap[key]
  if (!audioContent) {
    return
  }

  try {
    const result = await broadcastFileCar(carId, audioContent)
    if (result.resultType !== 'SUCCESSFUL') {
      ElMessage.error(`播放音频失败: ${result.message || '未知错误'}`)
    }
  } catch (error) {
    console.error('播放音频请求失败:', error)
    ElMessage.error('播放音频请求失败，请检查网络连接')
  }
}

const onKeydown = async (e) => {
  if (e.repeat) return
  const key = e.key.toLowerCase()
  if (key === 'j') {          // 批量开
    batchSwitch(true)
  } else if (key === 'k') {   // 批量关
    batchSwitch(false)
  } else if (key === 'h') {   // 中断
    try {
      const result = await interrupt()
      if (result !== 'SUCCESSFUL') {
        ElMessage.error('中断操作失败')
      }
    } catch (error) {
      console.error('中断操作请求失败:', error)
      ElMessage.error('中断操作请求失败，请检查网络连接')
    }
  } else if (['1', '2', '3', '4', '5'].includes(key)) {
    // 数字键播放音频
    await handleBroadcastAudio(key)
  }
}
// 计算属性：是否激活火灾模型
const isFireModelActive = computed(() => {
  return selectedModels.value.includes('火灾')
})

// 火灾检测处理函数
const handleFireDetection = (detectionResults) => {
  if (!isFireModelActive.value) {
    console.log('火灾模型未激活，当前选择的模型:', selectedModels.value)
    return
  }

  console.log('火灾检测状态:', {
    selectedModels: selectedModels.value,
    detectionCount: detectionResults.length,
    currentProgress: fireProgress.value,
    alertTriggered: alertTriggered.value,
    fireDetectionCount: fireDetectionCount.value
  })

  // 检查是否有火灾检测结果
  // 根据ColorPreset.js中火灾模型的定义，检测项目包括：火、烟
  const fireDetected = detectionResults.some(detection =>
      detection.item && (
        detection.item === '火' ||
        detection.item === '烟' ||
        detection.item.includes('火') ||
        detection.item.includes('烟') ||
        detection.item.toLowerCase().includes('fire') ||
        detection.item.toLowerCase().includes('smoke') ||
        detection.item.toLowerCase().includes('flame')
      )
  )

  if (fireDetected) {
    lastFireDetectionTime.value = Date.now()
    fireDetectionCount.value++

    // 更新进度条
    fireProgress.value = Math.min((fireDetectionCount.value / maxFireDetections) * 100, 100)

    // 检查是否达到触发条件，且未曾触发过警报
    if (fireDetectionCount.value >= maxFireDetections && fireProgress.value >= 100 && !alertTriggered.value) {
      triggerFireAlert()
    }

    // 重新启动衰减定时器
    startProgressDecay()

    // 可选：打印检测到的火灾项目用于调试
    const fireItems = detectionResults
      .filter(detection =>
          detection.item && (
            detection.item === '火' ||
            detection.item === '烟' ||
            detection.item.includes('火') ||
            detection.item.includes('烟') ||
            detection.item.toLowerCase().includes('fire') ||
            detection.item.toLowerCase().includes('smoke') ||
            detection.item.toLowerCase().includes('flame')
          )
      )
      .map(detection => detection.item)

    if (fireItems.length > 0) {
      console.log('检测到火灾项目:', fireItems, '置信度:',
        detectionResults
          .filter(d => fireItems.includes(d.item))
          .map(d => d.probability)
      )
    }
  }
}

// 启动进度衰减定时器
const startProgressDecay = () => {
  // 清除现有定时器
  if (progressDecayInterval.value) {
    clearInterval(progressDecayInterval.value)
  }

  // 每秒检查一次，如果超过3秒没有检测到火灾，开始衰减
  progressDecayInterval.value = setInterval(() => {
    const timeSinceLastDetection = Date.now() - lastFireDetectionTime.value

    if (timeSinceLastDetection > 3000) { // 3秒无检测开始衰减
      if (fireProgress.value > 0) {
        fireDetectionCount.value = Math.max(0, fireDetectionCount.value - 1)
        fireProgress.value = Math.max(0, (fireDetectionCount.value / maxFireDetections) * 100)

        // 当进度降到50%以下时，重置警报标志，允许重新触发
        if (fireProgress.value < 50 && alertTriggered.value) {
          alertTriggered.value = false
          console.log('火灾检测进度下降，重置警报标志')
        }
      }

      // 如果进度为0，停止定时器
      if (fireProgress.value === 0) {
        clearInterval(progressDecayInterval.value)
        progressDecayInterval.value = null
      }
    }
  }, 1000)
}

// 触发火灾警报
const triggerFireAlert = async () => {
  // 防止重复触发
  if (fireProgress.value < 100 || alertTriggered.value) return

  // 设置警报触发标志
  alertTriggered.value = true

  ElMessage({
    message: '🔥 火灾警报！检测到持续火源，请立即处理！',
    type: 'error',
    duration: 10000,
    showClose: true
  })

  // 调用调度函数
  try {
    const result = await dispatch()
    if (result === 'SUCCESSFUL') {
      console.log('调度通知发送成功')
    } else {
      console.error('调度通知发送失败:', result)
      ElMessage.warning('警报调度失败，请手动联系相关人员')
    }
  } catch (error) {
    console.error('调度通知发送异常:', error)
    ElMessage.warning('警报调度异常，请手动联系相关人员')
  }

  // 这里可以添加更多的警报逻辑，如：
  // - 发送通知到服务器
  // - 触发声音警报
  // - 记录警报日志
  console.warn('🔥 火灾警报触发！时间:', new Date().toLocaleTimeString(), {
    detectionCount: fireDetectionCount.value,
    progress: fireProgress.value,
    alertTriggered: alertTriggered.value
  })

  // 可以在这里调用自定义的警报处理函数
  // handleCustomFireAlert()
}

// 重置火灾检测状态
const resetFireDetection = () => {
  fireProgress.value = 0
  fireDetectionCount.value = 0
  lastFireDetectionTime.value = 0
  alertTriggered.value = false // 重置警报触发标志

  if (progressDecayInterval.value) {
    clearInterval(progressDecayInterval.value)
    progressDecayInterval.value = null
  }

  console.log('火灾检测状态已重置')
}

// 处理模型选择变化
const handleModelChange = async (value) => {
  // 确保只能选择一个或全部关闭
  if (value.length > 1) {
    selectedModels.value = [value[value.length - 1]];
  } else {
    selectedModels.value = value
  }

  // 重置火灾检测状态
  resetFireDetection()

  const lightId = Number(route.query.id)
  if (!lightId) {
    ElMessage.warning('设备ID无效')
    return
  }

  try {
    if (selectedModels.value.length > 0) {
      // 调用设置持续检测
      const result = await setSustainedDetection(
        lightId,
        selectedModels.value[0]
      )

      if (result === 'SUCCESSFUL') {
        ElMessage.success(`已激活模型: ${selectedModels.value[0]}`)
      } else {
        ElMessage.error(`激活模型失败: ${selectedModels.value[0]}`)
      }
    } else {
      // 调用关闭持续检测
      const result = await closeSustainedDetection(lightId)

      if (result === 'SUCCESSFUL') {
        ElMessage.success('已关闭持续检测')
        // 清空检测结果
        detections.value = []
        // 清除画布上的检测框
        clearCanvas()
      } else {
        ElMessage.error('关闭持续检测失败')
      }
    }
  } catch (error) {
    console.error('模型操作失败:', error)
    ElMessage.error('模型操作失败，请检查网络连接')
  }
}

// 清空画布的函数
const clearCanvas = () => {
  if (!canvasRef.value) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 清除整个画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

// 云台控制函数
const controlPTZ = async (direction) => {
  const lightId = Number(route.query.id)
  if (!lightId) {
    ElMessage.warning('设备ID无效')
    return
  }

  try {
    // 将方向映射为 API 需要的格式
    let ptzCommand
    switch (direction) {
      case 'up':
        ptzCommand = 'TILT_UP'
        break
      case 'down':
        ptzCommand = 'TILT_DOWN'
        break
      case 'left':
        ptzCommand = 'PAN_LEFT'
        break
      case 'right':
        ptzCommand = 'PAN_RIGHT'
        break
      default:
        ElMessage.warning('未知的方向指令')
        return
    }

    // 调用云台控制 API
    const result = await ptzControl(lightId, ptzCommand)

    if (result === 'SUCCESSFUL') {
      // 成功时不显示消息，避免频繁弹出
    } else {
      ElMessage.error(`云台控制: ${direction} 失败`)
    }
  } catch (error) {
    console.error('云台控制请求失败:', error)
    ElMessage.error(`云台控制请求失败: ${error.message}`)
  }
}

// 开始持续控制
const startContinuousControl = (direction) => {
  // 清除现有定时器
  stopContinuousControl()

  // 设置当前方向
  currentDirection.value = direction

  // 立即执行一次控制
  controlPTZ(direction)

  // 设置定时器每0.5秒执行一次
  ptzTimer.value = setInterval(() => {
    if (currentDirection.value) {
      controlPTZ(currentDirection.value)
    }
  }, 500)
}

// 停止持续控制
const stopContinuousControl = () => {
  if (ptzTimer.value) {
    clearInterval(ptzTimer.value)
    ptzTimer.value = null
  }
  currentDirection.value = null
}

const retryPause = 2000; // 重试间隔
let hls = null;
let retryTimeout = null;

const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.platform) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const loadStream = () => {
  if (!videoRef.value) return;

  // 清除之前的重试定时器
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }

  // 清除之前的HLS实例
  if (hls) {
    hls.destroy();
    hls = null;
  }

  try {
    if (!streamUrl.value) {
      throw new Error('视频流URL不可用');
    }

    // Add CORS attribute to video element
    videoRef.value.crossOrigin = 'anonymous';

    // 优先使用hls.js
    if (Hls.isSupported() && !isIOS()) {
      hls = new Hls({
        maxLiveSyncPlaybackRate: 1.5,
        liveSyncDuration: 1,   // seconds
        liveMaxLatencyDuration: 2, // seconds
        debug: false,
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS错误:', data);
        if (data.fatal) {
          // 处理致命错误
          let errorMessage = '视频流错误';

          if (data.details === 'manifestIncompatibleCodecsError') {
            errorMessage = '视频流使用了浏览器不支持的编解码器';
          } else if (data.response && data.response.code === 404) {
            errorMessage = '视频流未找到';
          }

          ElMessage.error(`${errorMessage}, ${retryPause / 1000}秒后重试`);

          // 设置重试
          retryTimeout = setTimeout(() => {
            loadStream();
          }, retryPause);
        }
      });

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(streamUrl.value);
      });

      hls.on(Hls.Events.MANIFEST_LOADED, () => {
        isPlaying.value = true;
      });

      hls.attachMedia(videoRef.value);

    } else if (videoRef.value.canPlayType('application/vnd.apple.mpegurl')) {
      // iOS设备使用原生HLS支持
      videoRef.value.src = streamUrl.value;
      videoRef.value.addEventListener('loadedmetadata', () => {
        if (videoRef.value) {
          videoRef.value.play();
        }
        isPlaying.value = true;
      });
    } else {
      throw new Error('您的浏览器不支持视频播放');
    }

  } catch (error) {
    console.error('视频流初始化失败:', error);
    ElMessage.error('视频连接失败: ' + error.message);

    // 设置重试
    retryTimeout = setTimeout(() => {
      loadStream();
    }, retryPause);
  }
}

// 计算视频显示区域信息
const getVideoDisplayInfo = () => {
  if (!videoRef.value) return { displayWidth: 0, displayHeight: 0, offsetX: 0, offsetY: 0 }

  const video = videoRef.value
  const container = video.parentElement
  if (!container) return { displayWidth: 0, displayHeight: 0, offsetX: 0, offsetY: 0 }

  const videoAspect = video.videoWidth / video.videoHeight
  const containerAspect = container.clientWidth / container.clientHeight

  let displayWidth, displayHeight, offsetX, offsetY

  if (videoAspect > containerAspect) {
    // 宽度撑满容器
    displayWidth = container.clientWidth
    displayHeight = container.clientWidth / videoAspect
    offsetX = 0
    offsetY = (container.clientHeight - displayHeight) / 2
  } else {
    // 高度撑满容器
    displayHeight = container.clientHeight
    displayWidth = container.clientHeight * videoAspect
    offsetX = (container.clientWidth - displayWidth) / 2
    offsetY = 0
  }

  return { displayWidth, displayHeight, offsetX, offsetY }
}

// 绘制检测框
const drawDetections = () => {
  if (!canvasRef.value || !videoRef.value) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 获取视频显示信息
  const displayInfo = getVideoDisplayInfo()

  // Get video source dimensions
  const sourceWidth = videoRef.value.videoWidth
  const sourceHeight = videoRef.value.videoHeight

  // Pass source dimensions to draw function
  drawBoundingBoxes(ctx, detections.value, displayInfo, sourceWidth, sourceHeight)
}

// 订阅持续检测事件
const subscribeToSustainedDetection = () => {
  const client = getDefWebSocketClient()
  if (!client) {
    console.error("WebSocket client not available")
    return
  }

  const lightId = Number(route.query.id)
  if (!lightId) return

  unsubscribeSustained = subscriptionLightSustainedDetectionReportEvent(
    client,
    lightId,
    {
      next: (newDetections) => {
        // 直接赋值给响应式对象
        detections.value = newDetections

        // 处理火灾检测
        handleFireDetection(newDetections)

        drawDetections()
      },
      error: (error) => {
        console.error("Sustained detection subscription error:", error)
      },
      complete() {
      },
    }
  )
}

onMounted(async () => {
  const id = Number(route.query.carId || route.query.id)
  if (id) try { car.value = await getCarById(id) } catch { }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  loadStream()
  // 添加视频元数据加载事件
  if (videoRef.value) {
    videoRef.value.addEventListener('loadedmetadata', () => {
      // 初始化canvas
      if (canvasRef.value && videoRef.value && videoRef.value.parentElement) {
        const container = videoRef.value.parentElement
        canvasRef.value.width = container ? container.clientWidth : 0
        canvasRef.value.height = container ? container.clientHeight : 0
      }
      // 订阅持续检测事件
      subscribeToSustainedDetection()
    })
  }
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(async () => {
  stopCar()
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  // 退出页面时取消模型选择
  if (selectedModels.value.length > 0) {
    const lightId = Number(route.query.id)
    if (lightId) {
      try {
        await closeSustainedDetection(lightId)
        console.log('页面退出时已关闭持续检测')
      } catch (error) {
        console.error('页面退出时关闭持续检测失败:', error)
      }
    }
  }

  // 清理火灾检测定时器
  resetFireDetection()

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

  // 取消订阅
  if (unsubscribeSustained) {
    unsubscribeSustained()
  }

  // 确保组件卸载时清除定时器
  stopContinuousControl()

  window.removeEventListener('keydown', onKeydown)
})

// 添加窗口大小变化监听
window.addEventListener('resize', () => {
  if (canvasRef.value && videoRef.value && videoRef.value.parentElement) {
    const container = videoRef.value.parentElement
    canvasRef.value.width = container ? container.clientWidth : 0
    canvasRef.value.height = container ? container.clientHeight : 0
    drawDetections()
  }
})
</script>

<style scoped>
/* ===== Sci‑Fi 全局背景 & 通用控件 ===== */
.sci-fi {
  background: rgba(0, 0, 0, .45);
}

/* ========== Switch ========= */
.sci-fi :deep(.el-switch__core) {
  background: rgba(255, 255, 255, .12);
}

.sci-fi :deep(.el-switch.is-checked .el-switch__core) {
  background: #00ffea;
}

.sci-fi :deep(.el-switch__button) {
  background: #0a0f1e;
  box-shadow: 0 0 4px #00ffea;
}

/* ========== 日期选择器 ========= */
.sci-fi :deep(.el-date-editor) {
  background: rgba(0, 10, 20, .85);
  border: 1px solid #00d8ff;
  color: #c8feff;
  box-shadow: 0 0 6px #00d8ff inset;
}

.sci-fi :deep(.el-date-editor:hover),
.sci-fi :deep(.el-date-editor.is-active),
.sci-fi :deep(.el-date-editor .el-input__inner:focus) {
  border-color: #00ffea;
  box-shadow: 0 0 8px #00ffea;
}

.sci-fi :deep(.el-date-editor .el-input__inner),
.sci-fi :deep(.el-date-editor .el-range-input) {
  background: transparent;
  border: none;
  color: #e6fcff;
}

.sci-fi :deep(.el-date-editor .el-input__prefix),
.sci-fi :deep(.el-date-editor .el-input__suffix),
.sci-fi :deep(.el-range-separator) {
  color: #00ffea;
}

/* 日期面板 */
.sci-fi :deep(.el-picker-panel) {
  background: rgba(0, 10, 20, .95);
  border: 1px solid #00d8ff;
  box-shadow: 0 0 10px #00d8ff;
}

.sci-fi :deep(.el-date-table th) {
  color: #00ffea;
  border-bottom: 1px solid rgba(0, 255, 234, .3);
}

.sci-fi :deep(.el-date-table td) {
  color: #c8feff;
}

.sci-fi :deep(.el-date-table td.available:hover) {
  background: rgba(0, 255, 234, .2);
  color: #00ffea;
}

.sci-fi :deep(.el-date-table td.current),
.sci-fi :deep(.el-date-table td.start-date),
.sci-fi :deep(.el-date-table td.end-date) {
  background: #00ffea;
  color: #0a0f1e;
}

/* ========== 分页 ========= */
.sci-fi :deep(.el-pagination) {
  color: #8fe8ff;
}

.sci-fi :deep(.el-pagination .el-pager li) {
  background: rgba(0, 10, 20, .8);
  border: 1px solid rgba(0, 255, 234, .4);
  color: #8fe8ff;
  transition: all .2s;
}

.sci-fi :deep(.el-pagination .el-pager li:hover) {
  background: rgba(0, 255, 234, .15);
  color: #00ffea;
  box-shadow: 0 0 6px #00ffea;
}

.sci-fi :deep(.el-pagination .el-pager li.is-active) {
  background: #00ffea;
  color: #0a0f1e;
  border-color: #00ffea;
  box-shadow: 0 0 8px #00ffea;
}

.sci-fi :deep(.el-pagination button) {
  background: rgba(0, 10, 20, .6);
  border: 1px solid rgba(0, 255, 234, .4);
  color: #8fe8ff;
}

.sci-fi :deep(.el-pagination button:hover) {
  background: rgba(0, 255, 234, .15);
  color: #00ffea;
  box-shadow: 0 0 6px #00ffea;
}

.sci-fi :deep(.el-pagination button:disabled) {
  background: rgba(0, 0, 0, .1);
  border-color: rgba(0, 255, 234, .1);
  color: rgba(143, 232, 255, .3);
}

.sci-fi :deep(.el-select .el-input__inner),
.sci-fi :deep(.el-pagination__jump .el-input__inner) {
  background: rgba(0, 10, 20, .8);
  border: 1px solid #00d8ff;
  color: #c8feff;
}

.sci-fi :deep(.el-select-dropdown__item) {
  color: #c8feff;
}

.sci-fi :deep(.el-select-dropdown__item.hover),
.sci-fi :deep(.el-select-dropdown__item.is-hovering) {
  background: rgba(0, 255, 234, .2);
  color: #00ffea;
}

/* ========== Detection 卡片&布局 ========= */
.detection-container {
  padding: 20px;
  background: transparent;
}

.time-range-selector {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-controls,
.right-controls {
  display: flex;
  align-items: center;
}

.detection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
  gap: 20px;
  min-height: 200px;
}

.sci-fi .detection-card {
  background: rgba(20, 25, 45, .9);
  border: 1px solid #06f6f1;
  box-shadow: 0 0 8px #06f6f1;
  border-radius: 6px;
  transition: transform .2s, box-shadow .2s;
}

.sci-fi .detection-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 0 12px #06f6f1;
}

.sci-fi .detection-time {
  color: #8fe8ff;
}

.sci-fi .detection-image {
  background: rgba(10, 15, 30, .7);
  border: 1px solid rgba(6, 246, 241, .3);
}

.sci-fi .detection-image:hover {
  transform: scale(1.03);
  box-shadow: 0 0 8px #06f6f1;
}

.sci-fi .image-error-message {
  color: #06f6f1;
  background: rgba(10, 15, 30, .8);
}

.sci-fi .image-error-message .el-icon {
  font-size: 36px;
  color: #00ffea;
}

.sci-fi .image-error-message span {
  font-size: 14px;
}

.no-data-message {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* ========== Monitor / PTZ 控制  ========= */
.sci-fi .monitor-container {
  background: transparent;
}

.sci-fi .control-panels {
  width: 240px;
}

.sci-fi .ptz-control-panel,
.sci-fi .model-control-panel {
  background: rgba(20, 25, 45, .9);
  border: 1px solid #06f6f1;
  box-shadow: 0 0 8px #06f6f1;
  border-radius: 12px;
  padding: 20px;
  transition: all .3s;
}

.sci-fi .panel-title {
  color: #00ffea;
  border-bottom: 1px solid rgba(6, 246, 241, .4);
}

/* Direction & Zoom Buttons */
.sci-fi .direction-btn,
.sci-fi .zoom-controls .el-button {
  background: rgba(0, 10, 20, .9);
  border: 1px solid rgba(0, 255, 234, .4);
  color: #8fe8ff;
  box-shadow: 0 0 4px rgba(0, 255, 234, .4);
}

.sci-fi .direction-btn:hover,
.sci-fi .zoom-controls .el-button:hover {
  color: #00ffea;
  box-shadow: 0 0 8px #00ffea;
  background: rgba(0, 10, 20, 1);
}

.sci-fi .direction-btn:active,
.sci-fi .zoom-controls .el-button:active {
  background: #00ffea;
  color: #0a0f1e;
  box-shadow: 0 0 6px #00ffea inset;
}

/* Speed & Model panels */
.sci-fi .speed-control {
  background: rgba(0, 10, 20, .6);
  border: 1px solid rgba(0, 255, 234, .3);
}

.sci-fi .model-controls {
  background: rgba(0, 10, 20, .6);
}

/* Checkbox neon */
.sci-fi :deep(.enlarged-checkbox-group .el-checkbox__input .el-checkbox__inner) {
  border: 1px solid #00ffea;
  background: transparent;
}

.sci-fi :deep(.enlarged-checkbox-group .el-checkbox__input.is-checked .el-checkbox__inner) {
  background: #00ffea;
  border-color: #00ffea;
}

.sci-fi :deep(.enlarged-checkbox-group .el-checkbox__label) {
  color: #c8feff;
}

/* Video container */
.sci-fi .video-container {
  background: #000;
  border: 1px solid #06f6f1;
  box-shadow: 0 0 10px #06f6f1;
  border-radius: 16px;
}

.sci-fi .video-placeholder {
  background: rgba(0, 0, 0, .9);
  color: #00ffea;
}

.sci-fi .placeholder-icon {
  color: #00ffea;
  text-shadow: 0 0 10px #00ffea;
}

/* Canvas above video */
.sci-fi .bounding-box-canvas {
  pointer-events: none;
}


.monitor-container {
  padding: 15px;
  height: 100%;
  display: flex;
  flex-direction: row;
  gap: 20px;
  background-color: transparent;
}

.control-panels {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 220px;
  margin-right: auto;
}

.ptz-control-panel {
  background: linear-gradient(145deg, #ffffff, #f5f7fa);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(235, 238, 245, 0.7);
  transition: all 0.3s ease;
}

.panel-title {
  margin: 0 0 15px 0;
  text-align: center;
  color: #409EFF;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 12px;
}

.model-controls {
  margin-bottom: 20px;
  padding: 10px 15px 15px 15px;
  border-radius: 8px;
}

.model-controls span {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #409EFF;
  font-weight: 600;
}

.el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.el-checkbox {
  margin-right: 0;
}

.direction-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.middle-row {
  display: flex;
  gap: 30px;
  margin: 8px 0;
}

.direction-btn {
  width: 32px;
  height: 32px;
  font-size: 18px;
  border-radius: 50%;
  transition: all 0.2s ease;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
  background: linear-gradient(145deg, #f8f8f8, #e6e6e6);
  color: #606266;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
}

.direction-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(64, 158, 255, 0.3);
  color: #409EFF;
  background: linear-gradient(145deg, #f8f8f8, #f0f7ff);
}

.direction-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 5px rgba(64, 158, 255, 0.2);
}

.zoom-controls {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 12px;
}

.zoom-controls .el-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  font-size: 18px;
  transition: all 0.2s ease;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
  background: linear-gradient(145deg, #f8f8f8, #e6e6e6);
  color: #606266;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
}

.zoom-controls .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
  color: #409EFF;
  background: linear-gradient(145deg, #f8f8f8, #f0f7ff);
}

.zoom-controls .el-button:active {
  transform: translateY(0);
  background: #f0f7ff;
}

.speed-control {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: rgba(64, 158, 255, 0.05);
  border-radius: 6px;
}

.speed-control span {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  margin-bottom: 2px;
}

.video-container {
  position: relative;
  flex: 1;
  height: calc(100vh - 200px);
  background-color: #000;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.1);
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
  background-color: rgba(0, 0, 0, 0.9);
  color: #fff;
  z-index: 2;
}

.placeholder-icon {
  font-size: 64px;
  margin-bottom: 24px;
  color: #909399;
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

/* 新增模型面板样式 */
.model-control-panel {
  background: linear-gradient(145deg, #ffffff, #f5f7fa);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(235, 238, 245, 0.7);
  transition: all 0.3s ease;
}

/* 调整整体布局 */
.monitor-container {
  padding: 15px;
  height: 100%;
  display: flex;
  flex-direction: row;
  gap: 20px;
  background-color: transparent;
}

/* 模型选择区域样式 */
.model-controls {
  margin-bottom: 0;
  padding: 10px 15px 15px 15px;
  border-radius: 8px;
}

.model-controls span {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #409EFF;
  font-weight: 600;
}

/* 统一面板样式 */
.ptz-control-panel,
.model-control-panel {
  background: linear-gradient(145deg, #ffffff, #f5f7fa);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(235, 238, 245, 0.7);
  transition: all 0.3s ease;
}

/* 调整复选框组间距 */
.enlarged-checkbox-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: -10px;
}

.enlarged-checkbox-group :deep(.el-checkbox) {
  transform: scale(1.2);
  margin: 4px 0;
}

/* 调整模型控制区域 */
.model-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0px 15px 15px 15px;
}

/* 新增canvas样式 */
.bounding-box-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  /* 确保在视频之上 */
}

/* 火灾检测进度条样式 */
.fire-detection-progress {
  margin-top: 16px;
  background: linear-gradient(145deg, #ffebee, #fce4ec);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 87, 87, 0.3);
  box-shadow: 0 2px 8px rgba(255, 87, 87, 0.15);
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #d32f2f;
  font-weight: 600;
}

.progress-text {
  font-family: 'Courier New', monospace;
  color: #c62828;
  font-weight: 700;
}

.progress-bar {
  height: 10px;
  background: rgba(255, 87, 87, 0.15);
  border-radius: 5px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 87, 87, 0.3);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff5757 0%, #ff3030 50%, #ff0000 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
  box-shadow: 0 0 10px rgba(255, 87, 87, 0.6);
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: progress-shine 2s infinite;
}

@keyframes progress-shine {
  0% {
    left: -100%;
  }

  100% {
    left: 100%;
  }
}

/* Sci-fi风格的火灾进度条 */
.sci-fi .fire-detection-progress {
  background: rgba(20, 25, 45, 0.95);
  border: 1px solid rgba(255, 87, 87, 0.5);
  box-shadow: 0 0 15px rgba(255, 87, 87, 0.3);
}

.sci-fi .progress-label {
  color: #ff6b6b;
  text-shadow: 0 0 5px rgba(255, 107, 107, 0.5);
}

.sci-fi .progress-text {
  color: #ff4757;
  text-shadow: 0 0 3px rgba(255, 71, 87, 0.7);
}

.sci-fi .progress-bar {
  background: rgba(255, 87, 87, 0.15);
  border: 1px solid rgba(255, 87, 87, 0.3);
  box-shadow: 0 0 5px rgba(255, 87, 87, 0.2) inset;
}

.sci-fi .progress-fill {
  background: linear-gradient(90deg,
  rgba(255, 87, 87, 0.8) 0%,
  rgba(255, 48, 48, 0.9) 50%,
  rgba(255, 0, 0, 1) 100%);
  box-shadow:
    0 0 10px rgba(255, 87, 87, 0.8),
    0 0 20px rgba(255, 87, 87, 0.4);
  animation: fire-pulse 1.5s ease-in-out infinite alternate;
}

@keyframes fire-pulse {
  0% {
    box-shadow:
      0 0 10px rgba(255, 87, 87, 0.8),
      0 0 20px rgba(255, 87, 87, 0.4);
  }

  100% {
    box-shadow:
      0 0 15px rgba(255, 87, 87, 1),
      0 0 30px rgba(255, 87, 87, 0.6);
  }
}
</style>
