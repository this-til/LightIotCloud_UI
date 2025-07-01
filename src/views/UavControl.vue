<template>
  <div class="uav-control-container sci-fi">
    <div class="control-container">
      <!-- 飞行控制面板 -->
      <div class="control-panels">
        <!-- 基础飞行控制 -->
        <div class="flight-control-panel">
          <h3 class="panel-title">飞行控制</h3>
          
          <div class="flight-buttons">
            <el-button class="flight-btn takeoff-btn" @click="handleTakeoff" :disabled="!device.online">
              <el-icon><TopRight /></el-icon>
              起飞
            </el-button>
            <el-button class="flight-btn land-btn" @click="handleLand" :disabled="!device.online">
              <el-icon><Bottom /></el-icon>
              降落
            </el-button>
            <el-button class="flight-btn return-btn" @click="handleReturnHome" :disabled="!device.online">
              <el-icon><HomeFilled /></el-icon>
              返航
            </el-button>
            <el-button class="flight-btn emergency-btn" @click="handleEmergencyStop" :disabled="!device.online">
              <el-icon><CircleClose /></el-icon>
              急停
            </el-button>
          </div>

          <!-- 飞行方向控制 -->
          <div class="direction-controls">
            <el-button class="direction-btn up-btn" @mousedown="startContinuousMove('up')"
                       @mouseup="stopContinuousMove" @mouseleave="stopContinuousMove">
              <el-icon><CaretTop /></el-icon>
            </el-button>
            <div class="middle-row">
              <el-button class="direction-btn left-btn" @mousedown="startContinuousMove('left')"
                         @mouseup="stopContinuousMove" @mouseleave="stopContinuousMove">
                <el-icon><CaretLeft /></el-icon>
              </el-button>
              <el-button class="direction-btn right-btn" @mousedown="startContinuousMove('right')"
                         @mouseup="stopContinuousMove" @mouseleave="stopContinuousMove">
                <el-icon><CaretRight /></el-icon>
              </el-button>
            </div>
            <el-button class="direction-btn down-btn" @mousedown="startContinuousMove('down')"
                       @mouseup="stopContinuousMove" @mouseleave="stopContinuousMove">
              <el-icon><CaretBottom /></el-icon>
            </el-button>
          </div>

          <!-- 高度控制 -->
          <div class="altitude-controls">
            <el-button class="altitude-btn" @mousedown="startContinuousMove('altitude_up')"
                       @mouseup="stopContinuousMove" @mouseleave="stopContinuousMove">
              <el-icon><Top /></el-icon>
              上升
            </el-button>
            <el-button class="altitude-btn" @mousedown="startContinuousMove('altitude_down')"
                       @mouseup="stopContinuousMove" @mouseleave="stopContinuousMove">
              <el-icon><Bottom /></el-icon>
              下降
            </el-button>
          </div>
        </div>

        <!-- 云台控制面板 -->
        <div class="gimbal-control-panel">
          <h3 class="panel-title">云台控制</h3>
          
          <div class="gimbal-controls">
            <el-button class="gimbal-btn" @mousedown="startGimbalMove('pitch_up')"
                       @mouseup="stopGimbalMove" @mouseleave="stopGimbalMove">
              <el-icon><CaretTop /></el-icon>
            </el-button>
            <div class="gimbal-middle-row">
              <el-button class="gimbal-btn" @mousedown="startGimbalMove('yaw_left')"
                         @mouseup="stopGimbalMove" @mouseleave="stopGimbalMove">
                <el-icon><CaretLeft /></el-icon>
              </el-button>
              <el-button class="gimbal-btn center-btn" @click="resetGimbal">
                <el-icon><Aim /></el-icon>
              </el-button>
              <el-button class="gimbal-btn" @mousedown="startGimbalMove('yaw_right')"
                         @mouseup="stopGimbalMove" @mouseleave="stopGimbalMove">
                <el-icon><CaretRight /></el-icon>
              </el-button>
            </div>
            <el-button class="gimbal-btn" @mousedown="startGimbalMove('pitch_down')"
                       @mouseup="stopGimbalMove" @mouseleave="stopGimbalMove">
              <el-icon><CaretBottom /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 模式控制面板 -->
        <div class="mode-control-panel">
          <h3 class="panel-title">飞行模式</h3>
          
          <div class="mode-controls">
            <el-select v-model="selectedFlightMode" @change="handleFlightModeChange" class="flight-mode-select">
              <el-option label="手动模式" value="manual" />
              <el-option label="自动模式" value="auto" />
              <el-option label="巡航模式" value="cruise" />
              <el-option label="定点模式" value="position" />
            </el-select>
          </div>

          <!-- 辅助功能 -->
          <div class="auxiliary-controls">
            <el-switch v-model="ledLights" @change="handleLedToggle" 
                       active-text="导航灯" inactive-text="导航灯" class="aux-switch" />
            <el-switch v-model="gpsHold" @change="handleGpsHoldToggle"
                       active-text="GPS锁定" inactive-text="GPS锁定" class="aux-switch" />
          </div>
        </div>
      </div>

      <!-- 视频监控区域 -->
      <div class="video-container">
        <video ref="videoRef" class="video-player" autoplay muted crossorigin="anonymous"></video>
        <div v-if="!isVideoLoaded" class="video-placeholder">
          <el-icon class="placeholder-icon">
            <VideoCamera />
          </el-icon>
          <span>无人机视频加载中...</span>
        </div>
        
        <!-- 视频覆盖信息 -->
        <div class="video-overlay">
          <div class="flight-info">
            <div class="info-item">
              <span class="info-label">高度:</span>
              <span class="info-value">{{ formatValue(flightData.altitude) }}m</span>
            </div>
            <div class="info-item">
              <span class="info-label">速度:</span>
              <span class="info-value">{{ formatValue(flightData.speed) }}m/s</span>
            </div>
            <div class="info-item">
              <span class="info-label">电量:</span>
              <span class="info-value">{{ formatValue(batteryLevel) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态信息栏 -->
    <div class="status-bar">
      <div class="status-section">
        <span class="status-label">飞行状态:</span>
        <el-tag :type="getStatusType(flightStatus)" size="small">{{ flightStatus }}</el-tag>
      </div>
      <div class="status-section">
        <span class="status-label">信号强度:</span>
        <el-progress :percentage="signalStrength" :show-text="false" style="width: 100px;" />
        <span>{{ signalStrength }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { 
  VideoCamera, TopRight, Bottom, HomeFilled, CircleClose, 
  CaretTop, CaretBottom, CaretLeft, CaretRight, Top, Aim
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  device: Object
})

const route = useRoute()
const videoRef = ref(null)
const isVideoLoaded = ref(false)

// 飞行控制状态
const selectedFlightMode = ref('manual')
const ledLights = ref(false)
const gpsHold = ref(false)

// 飞行数据
const flightStatus = ref('待机模式')
const flightData = ref({
  altitude: null,
  speed: null
})
const batteryLevel = ref(null)
const signalStrength = ref(0)

// 控制定时器
const moveTimer = ref(null)
const gimbalTimer = ref(null)

onMounted(async () => {
  const uavId = props.device.id
  console.log("UAV Control mounted for device:", uavId)
  
  // 模拟视频加载
  setTimeout(() => {
    isVideoLoaded.value = true
  }, 2000)
})

onUnmounted(() => {
  stopContinuousMove()
  stopGimbalMove()
})

// 飞行控制函数
const handleTakeoff = async () => {
  ElMessage({
    type: "info",
    title: "功能开发中",
    message: "起飞功能正在开发中",
    duration: 2000
  })
}

const handleLand = async () => {
  ElMessage({
    type: "info", 
    title: "功能开发中",
    message: "降落功能正在开发中",
    duration: 2000
  })
}

const handleReturnHome = async () => {
  ElMessage({
    type: "info",
    title: "功能开发中", 
    message: "返航功能正在开发中",
    duration: 2000
  })
}

const handleEmergencyStop = async () => {
  ElMessage({
    type: "warning",
    title: "功能开发中",
    message: "急停功能正在开发中", 
    duration: 2000
  })
}

// 连续移动控制
const startContinuousMove = (direction) => {
  stopContinuousMove()
  
  moveTimer.value = setInterval(() => {
    console.log(`执行移动: ${direction}`)
  }, 100)
}

const stopContinuousMove = () => {
  if (moveTimer.value) {
    clearInterval(moveTimer.value)
    moveTimer.value = null
  }
}

// 云台控制
const startGimbalMove = (direction) => {
  stopGimbalMove()
  
  gimbalTimer.value = setInterval(() => {
    console.log(`执行云台移动: ${direction}`)
  }, 100)
}

const stopGimbalMove = () => {
  if (gimbalTimer.value) {
    clearInterval(gimbalTimer.value)
    gimbalTimer.value = null
  }
}

const resetGimbal = () => {
  ElMessage({
    type: "info",
    title: "功能开发中",
    message: "云台复位功能正在开发中",
    duration: 2000
  })
}

// 模式控制
const handleFlightModeChange = (mode) => {
  ElMessage({
    type: "info",
    title: "功能开发中",
    message: `切换飞行模式功能正在开发中`,
    duration: 2000
  })
}

const handleLedToggle = (value) => {
  console.log(`LED灯: ${value ? '开启' : '关闭'}`)
}

const handleGpsHoldToggle = (value) => {
  console.log(`GPS锁定: ${value ? '开启' : '关闭'}`)
}

// 辅助函数
const formatValue = (value) => {
  if (value === undefined || value === null) return "--"
  if (typeof value === 'number') {
    return Number(value.toFixed(1)).toString()
  }
  return value.toString()
}

const getStatusType = (status) => {
  const statusMap = {
    '待机模式': '',
    '起飞模式': 'warning',
    '巡航模式': 'success',
    '悬停模式': 'info',
    '返航模式': 'warning',
    '降落模式': 'warning',
    '故障模式': 'danger'
  }
  return statusMap[status] || ''
}
</script>

<style scoped>
/* 基础布局 */
.uav-control-container {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: transparent;
}

.control-container {
  display: flex;
  gap: 20px;
  flex: 1;
}

.control-panels {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 280px;
}

/* 控制面板样式 */
.flight-control-panel,
.gimbal-control-panel,
.mode-control-panel {
  background: rgba(20, 25, 45, .9);
  border: 1px solid #06f6f1;
  box-shadow: 0 0 8px #06f6f1;
  border-radius: 12px;
  padding: 16px;
}

.panel-title {
  color: #00ffea;
  border-bottom: 1px solid rgba(6, 246, 241, .4);
  margin: 0 0 15px 0;
  padding-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

/* 飞行按钮 */
.flight-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 15px;
}

.flight-btn {
  height: 45px;
  font-size: 13px;
  background: rgba(0, 10, 20, .9);
  border: 1px solid rgba(0, 255, 234, .4);
  color: #8fe8ff;
  box-shadow: 0 0 4px rgba(0, 255, 234, .4);
}

.flight-btn:hover {
  color: #00ffea;
  box-shadow: 0 0 8px #00ffea;
  background: rgba(0, 10, 20, 1);
}

.emergency-btn {
  background: rgba(255, 87, 87, .2) !important;
  border-color: rgba(255, 87, 87, .6) !important;
  color: #ff6b6b !important;
}

.emergency-btn:hover {
  background: rgba(255, 87, 87, .3) !important;
  box-shadow: 0 0 8px #ff6b6b !important;
}

/* 方向控制 */
.direction-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 15px;
}

.middle-row {
  display: flex;
  gap: 20px;
  margin: 4px 0;
}

.direction-btn {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  background: rgba(0, 10, 20, .9);
  border: 1px solid rgba(0, 255, 234, .4);
  color: #8fe8ff;
  box-shadow: 0 0 4px rgba(0, 255, 234, .4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.direction-btn:hover {
  color: #00ffea;
  box-shadow: 0 0 8px #00ffea;
}

/* 高度控制 */
.altitude-controls {
  display: flex;
  gap: 8px;
}

.altitude-btn {
  flex: 1;
  height: 35px;
  font-size: 12px;
  background: rgba(0, 10, 20, .9);
  border: 1px solid rgba(0, 255, 234, .4);
  color: #8fe8ff;
}

.altitude-btn:hover {
  color: #00ffea;
  box-shadow: 0 0 6px #00ffea;
}

/* 云台控制 */
.gimbal-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.gimbal-middle-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.gimbal-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(0, 10, 20, .9);
  border: 1px solid rgba(0, 255, 234, .4);
  color: #8fe8ff;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gimbal-btn:hover {
  color: #00ffea;
  box-shadow: 0 0 6px #00ffea;
}

.center-btn {
  background: rgba(0, 255, 234, .2) !important;
}

/* 模式控制 */
.mode-controls {
  margin-bottom: 15px;
}

.flight-mode-select {
  width: 100%;
}

.auxiliary-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aux-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 视频区域 */
.video-container {
  position: relative;
  flex: 1;
  background: #000;
  border: 1px solid #06f6f1;
  box-shadow: 0 0 10px #06f6f1;
  border-radius: 16px;
  overflow: hidden;
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
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
  background: rgba(0, 0, 0, .9);
  color: #00ffea;
  z-index: 2;
}

.placeholder-icon {
  font-size: 64px;
  margin-bottom: 16px;
  color: #00ffea;
  text-shadow: 0 0 10px #00ffea;
}

/* 视频覆盖信息 */
.video-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 10, 20, .8);
  border: 1px solid rgba(0, 255, 234, .3);
  border-radius: 8px;
  padding: 10px;
  z-index: 3;
}

.flight-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.info-label {
  color: #8fe8ff;
  min-width: 40px;
}

.info-value {
  color: #00ffea;
  font-weight: 600;
}

/* 状态栏 */
.status-bar {
  display: flex;
  gap: 20px;
  padding: 10px 15px;
  background: rgba(20, 25, 45, .9);
  border: 1px solid #06f6f1;
  border-radius: 8px;
  align-items: center;
}

.status-section {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.status-label {
  color: #8fe8ff;
  font-weight: 500;
}

/* Element UI 组件自定义样式 */
:deep(.el-select .el-input__inner) {
  background: rgba(0, 10, 20, .8);
  border: 1px solid #00d8ff;
  color: #c8feff;
}

:deep(.el-switch.is-checked .el-switch__core) {
  background: #00ffff;
}

:deep(.el-switch .el-switch__core) {
  background: rgba(0, 255, 234, .25);
}

:deep(.el-switch .el-switch__button) {
  background: #001018;
  box-shadow: 0 0 4px #00ffff;
}

:deep(.el-progress-bar__outer) {
  background: rgba(0, 255, 234, .2);
}

:deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, #ff6b6b 0%, #00ffff 50%, #00ffea 100%);
}

/* 响应式 */
@media (max-width: 1200px) {
  .control-panels {
    width: 240px;
  }
  
  .flight-buttons {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .control-container {
    flex-direction: column;
  }
  
  .control-panels {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
  }
  
  .flight-control-panel,
  .gimbal-control-panel, 
  .mode-control-panel {
    min-width: 200px;
  }
}
</style> 