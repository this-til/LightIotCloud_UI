<template>
  <div class="content-grid">
    <!-- 飞行控制 -->
    <div class="content-section">
      <div class="section-header">
        <h2>飞行控制</h2>
      </div>
      <div class="control-section">
        <div class="control-item">
          <div class="horizontal-control-group">
            <!-- 起飞/降落 -->
            <div class="control-row">
              <div class="control-label-wrapper">
                <span class="control-label">起飞/降落</span>
                <span class="control-desc">控制无人机起飞或降落</span>
              </div>
              <el-switch v-model="takeoffLanding" :disabled="!(device?.online) ?? false" @change="handleTakeoffLandingChange"
                active-text="起飞" inactive-text="降落" class="custom-switch" />
            </div>

            <!-- 返回基站 -->
            <div class="control-row">
              <div class="control-label-wrapper">
                <span class="control-label">返回基站</span>
                <span class="control-desc">自动返回充电基站</span>
              </div>
              <el-button type="primary" :disabled="!(!device?.online ?? false)" @click="handleReturnToBase" class="custom-button">
                返航
              </el-button>
            </div>

            <!-- 飞行模式 -->
            <div class="control-row">
              <div class="control-label-wrapper">
                <span class="control-label">飞行模式</span>
                <span class="control-desc">选择飞行模式</span>
              </div>
              <el-select v-model="flightMode" :disabled="!(device?.online)" @change="handleFlightModeChange" class="custom-select">
                <el-option label="手动模式" value="manual" />
                <el-option label="自动模式" value="auto" />
                <el-option label="巡航模式" value="cruise" />
                <el-option label="定点模式" value="position" />
              </el-select>
            </div>

            <!-- LED灯控制 -->
            <div class="control-row">
              <div class="control-label-wrapper">
                <span class="control-label">导航灯</span>
                <span class="control-desc">控制无人机LED导航灯</span>
              </div>
              <el-switch v-model="ledLights" :disabled="!(device?.online)" @change="handleLedLightsChange"
                active-text="开启" inactive-text="关闭" class="custom-switch" />
            </div>

          </div>
        </div>

        <!-- 云台控制 -->
        <div class="control-item">
          <div class="control-row">
            <div class="control-label-wrapper">
              <span class="control-label">云台俯仰角</span>
              <span class="control-value">{{ gimbalPitch }}°</span>
            </div>
            <el-slider v-model="gimbalPitch" :min="-90" :max="30" :step="1" :disabled="!(device?.online)"
              @change="handleGimbalPitchChange" class="custom-slider" />
          </div>
        </div>
      </div>
    </div>

    <!-- 飞行状态 -->
    <div class="content-section">
      <div class="section-header">
        <h2>飞行状态</h2>
      </div>
      <div class="data-grid">
        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Position />
            </el-icon>
            <span>飞行状态</span>
          </div>
          <div class="data-value">
            <el-tag :type="getFlightStatusType(flightStatus)" size="large">
              {{ flightStatus }}
            </el-tag>
          </div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <TopRight />
            </el-icon>
            <span>飞行高度</span>
          </div>
          <div class="data-value">{{ formatValue(flightData.altitude) }} m</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Odometer />
            </el-icon>
            <span>飞行速度</span>
          </div>
          <div class="data-value">{{ formatValue(flightData.speed) }} m/s</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Compass />
            </el-icon>
            <span>飞行方向</span>
          </div>
          <div class="data-value">{{ formatValue(flightData.heading) }}°</div>
        </el-card>
      </div>
    </div>

    <!-- GPS与导航 -->
    <div class="content-section">
      <div class="section-header">
        <h2>GPS与导航</h2>
      </div>
      <div class="data-grid">
        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Location />
            </el-icon>
            <span>纬度</span>
          </div>
          <div class="data-value">{{ formatValue(gpsData.latitude) }}°</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Location />
            </el-icon>
            <span>经度</span>
          </div>
          <div class="data-value">{{ formatValue(gpsData.longitude) }}°</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Promotion />
            </el-icon>
            <span>卫星数量</span>
          </div>
          <div class="data-value">{{ formatValue(gpsData.satellites) }} 颗</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <CircleCheck />
            </el-icon>
            <span>GPS精度</span>
          </div>
          <div class="data-value">{{ formatValue(gpsData.accuracy) }} m</div>
        </el-card>
      </div>
    </div>

    <!-- 电池与功率 -->
    <div class="content-section">
      <div class="section-header">
        <h2>电池与功率</h2>
      </div>
      <div class="power-grid">

        <!-- 主电池 -->
        <el-card shadow="hover" class="power-card">
          <div class="power-header">
            <el-icon class="power-icon">
              <Lightning />
            </el-icon>
            <span>主电池</span>
          </div>
          <div class="power-value">
            <div>{{ formatValue(batteryData.mainBattery?.percentage) }}%</div>
            <div class="sub-values">
              <span>{{ formatValue(batteryData.mainBattery?.voltage) }} V</span>
              <span>{{ formatValue(batteryData.mainBattery?.current) }} A</span>
            </div>
          </div>
        </el-card>

        <!-- 备用电池 -->
        <el-card shadow="hover" class="power-card">
          <div class="power-header">
            <el-icon class="power-icon">
              <Connection />
            </el-icon>
            <span>备用电池</span>
          </div>
          <div class="power-value">
            <div>{{ formatValue(batteryData.backupBattery?.percentage) }}%</div>
            <div class="sub-values">
              <span>{{ formatValue(batteryData.backupBattery?.voltage) }} V</span>
              <span>{{ formatValue(batteryData.backupBattery?.current) }} A</span>
            </div>
          </div>
        </el-card>

        <!-- 续航时间 -->
        <el-card shadow="hover" class="power-card">
          <div class="power-header">
            <el-icon class="power-icon">
              <Clock />
            </el-icon>
            <span>剩余续航</span>
          </div>
          <div class="power-value">
            <div>{{ formatValue(batteryData.remainingTime) }} 分钟</div>
            <div class="sub-values">
              <span>预估飞行时间</span>
            </div>
          </div>
        </el-card>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRoute } from "vue-router"
import { Position, TopRight, Odometer, Compass, Location, Promotion, CircleCheck, Lightning, Connection, Clock } from "@element-plus/icons-vue"
import { ElNotification } from "element-plus"

const props = defineProps({
  device: Object
})

const route = useRoute()

// 飞行控制状态
const takeoffLanding = ref(false)
const flightMode = ref('manual')
const ledLights = ref(false)
const gimbalPitch = ref(0)

// 飞行数据
const flightStatus = ref('待机模式')
const flightData = ref({
  altitude: null,
  speed: null,
  heading: null
})

// GPS数据
const gpsData = ref({
  latitude: null,
  longitude: null,
  satellites: null,
  accuracy: null
})

// 电池数据
const batteryData = ref({
  mainBattery: {
    percentage: null,
    voltage: null,
    current: null
  },
  backupBattery: {
    percentage: null,
    voltage: null,
    current: null
  },
  remainingTime: null
})

onMounted(async () => {
  const uavId = props.device.id

  // TODO: 当后台接口可用时，在这里订阅无人机状态事件
  console.log("UAV Content mounted for device:", uavId)

  // 模拟一些初始数据（可选）
  // simulateData()
})

onUnmounted(() => {
  // TODO: 取消订阅无人机状态事件
  console.log("UAV Content unmounted")
})

// 控制处理函数
const handleTakeoffLandingChange = async (value) => {
  try {
    // TODO: 调用无人机起飞/降落API
    ElNotification({
      type: "info",
      title: "功能开发中",
      message: `${value ? "起飞" : "降落"}功能正在开发中`,
      duration: 2000
    })
  } catch (error) {
    console.error("起飞/降落控制失败:", error)
    ElNotification({
      type: "error",
      title: "控制失败",
      message: "起飞/降落控制时发生错误",
      duration: 2000
    })
  }
}

const handleReturnToBase = async () => {
  try {
    // TODO: 调用无人机返航API
    ElNotification({
      type: "info",
      title: "功能开发中",
      message: "返航功能正在开发中",
      duration: 2000
    })
  } catch (error) {
    console.error("返航控制失败:", error)
    ElNotification({
      type: "error",
      title: "控制失败",
      message: "返航控制时发生错误",
      duration: 2000
    })
  }
}

const handleFlightModeChange = async (value) => {
  try {
    // TODO: 调用无人机飞行模式设置API
    ElNotification({
      type: "info",
      title: "功能开发中",
      message: `切换到${getFlightModeName(value)}功能正在开发中`,
      duration: 2000
    })
  } catch (error) {
    console.error("飞行模式设置失败:", error)
    ElNotification({
      type: "error",
      title: "设置失败",
      message: "飞行模式设置时发生错误",
      duration: 2000
    })
  }
}

const handleLedLightsChange = async (value) => {
  try {
    // TODO: 调用无人机LED控制API
    ElNotification({
      type: "info",
      title: "功能开发中",
      message: `LED导航灯${value ? "开启" : "关闭"}功能正在开发中`,
      duration: 2000
    })
  } catch (error) {
    console.error("LED控制失败:", error)
    ElNotification({
      type: "error",
      title: "控制失败",
      message: "LED控制时发生错误",
      duration: 2000
    })
  }
}

const handleGimbalPitchChange = async (value) => {
  try {
    // TODO: 调用无人机云台控制API
    ElNotification({
      type: "info",
      title: "功能开发中",
      message: `云台俯仰角设置为${value}°功能正在开发中`,
      duration: 2000
    })
  } catch (error) {
    console.error("云台控制失败:", error)
    ElNotification({
      type: "error",
      title: "控制失败",
      message: "云台控制时发生错误",
      duration: 2000
    })
  }
}

// 辅助函数
const formatValue = (value) => {
  if (value === undefined || value === null) return "--"

  // 根据不同类型的值进行格式化
  if (typeof value === 'number') {
    // GPS坐标保留6位小数
    if (value >= -180 && value <= 180 && (value.toString().includes('.') && value.toString().split('.')[1].length > 2)) {
      return value.toFixed(6)
    }
    // 其他数值保留1位小数
    return Number(value.toFixed(1)).toString()
  }

  return value.toString()
}

const getFlightStatusType = (status) => {
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

const getFlightModeName = (mode) => {
  const modeMap = {
    'manual': '手动模式',
    'auto': '自动模式',
    'cruise': '巡航模式',
    'position': '定点模式'
  }
  return modeMap[mode] || mode
}

// 模拟数据函数（可选）
const simulateData = () => {
  // 可以在这里设置一些模拟数据用于界面测试
  // flightStatus.value = '待机模式'
  // flightData.value = {
  //   altitude: 0,
  //   speed: 0,
  //   heading: 0
  // }
}
</script>

<style scoped>
.content-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  flex: 1;
}

.content-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.section-header {
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.data-card {
  transition: all 0.3s ease;
}

.data-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.data-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  margin-bottom: 12px;
}

.data-icon {
  color: #409eff;
  font-size: 18px;
}

.data-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  text-align: center;
  padding: 8px 0;
}

.data-value :deep(.el-tag) {
  font-size: 16px;
  padding: 4px 12px;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.control-item {
  display: flex;
  flex-direction: column;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 0;
}

.control-label-wrapper {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.control-desc {
  font-size: 12px;
  color: #909399;
}

.control-value {
  font-size: 12px;
  color: #909399;
}

:deep(.custom-slider) {
  flex: 1;
  margin-right: 16px;
}

:deep(.custom-slider .el-slider__runway) {
  height: 4px;
}

:deep(.custom-slider .el-slider__bar) {
  height: 4px;
  background-color: var(--el-color-primary);
}

:deep(.custom-slider.is-disabled .el-slider__runway) {
  background-color: #f5f7fa;
}

:deep(.custom-slider.is-disabled .el-slider__bar) {
  background-color: #c0c4cc;
}

:deep(.custom-switch) {
  margin-left: 8px;
}

:deep(.custom-select) {
  width: 120px;
  margin-left: 8px;
}

:deep(.custom-button) {
  margin-left: 8px;
}

/* 添加功率网格样式 */
.power-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.power-card {
  transition: all 0.3s ease;
  text-align: center;
}

.power-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.power-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #606266;
  margin-bottom: 12px;
}

.power-icon {
  color: #409eff;
  font-size: 36px;
  margin-bottom: 8px;
}

.power-value {
  font-size: 26px;
  font-weight: 600;
  color: #303133;
  text-align: center;
  padding: 8px 0;
}

.power-value .sub-values {
  display: flex;
  justify-content: space-around;
  font-size: 18px;
  margin-top: 8px;
  color: #606266;
}

.horizontal-control-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.horizontal-control-group .control-row {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.control-label-wrapper {
  min-width: 140px;
  margin-right: 16px;
}

:deep(.custom-switch) {
  margin-left: 0;
}

/* Sci-fi 样式 */
.content-section,
.data-card,
.power-card {
  background: rgba(0, 10, 20, 0.70);
  border: 1px solid rgba(0, 255, 234, 0.35);
  backdrop-filter: blur(6px);
  box-shadow: 0 0 6px rgba(0, 255, 234, 0.25);
}

.data-card:hover,
.power-card:hover {
  box-shadow: 0 0 10px rgba(0, 255, 234, 0.45);
}

.section-header h2 {
  color: #00ffff;
}

.data-header,
.power-header {
  color: #8fe8ff;
}

.data-icon,
.power-icon {
  color: #00b4ff;
}

.data-value,
.power-value {
  color: #e0ffff;
}

.power-value .sub-values,
.control-desc,
.control-value {
  color: #8fe8ff;
}

.control-label {
  color: #e0ffff;
}

/* Slider 样式 */
:deep(.custom-slider .el-slider__runway) {
  background: rgba(0, 255, 234, .20);
}

:deep(.custom-slider .el-slider__bar) {
  background: #00ffff;
}

:deep(.custom-slider .el-slider__button) {
  width: 12px;
  height: 12px;
  border: 2px solid #00ffff;
  background: #001018;
}

:deep(.custom-slider.is-disabled .el-slider__runway) {
  background: rgba(255, 255, 255, .12);
}

:deep(.custom-slider.is-disabled .el-slider__bar) {
  background: rgba(255, 255, 255, .25);
}

:deep(.custom-slider.is-disabled .el-slider__button) {
  border-color: rgba(255, 255, 255, .3);
}

/* Switch 样式 */
:deep(.custom-switch .el-switch__core) {
  background: rgba(0, 255, 234, .25);
}

:deep(.custom-switch.is-checked .el-switch__core) {
  background: #00ffff;
}

:deep(.custom-switch .el-switch__button) {
  background: #001018;
  box-shadow: 0 0 4px #00ffff;
}

/* Select 样式 */
:deep(.custom-select .el-input__inner) {
  background: rgba(0, 10, 20, .8);
  border: 1px solid #00d8ff;
  color: #c8feff;
}

:deep(.custom-select .el-input__inner:focus) {
  border-color: #00ffea;
  box-shadow: 0 0 8px #00ffea;
}

/* Button 样式 */
:deep(.custom-button) {
  background: rgba(0, 10, 20, .9);
  border: 1px solid rgba(0, 255, 234, .4);
  color: #8fe8ff;
  box-shadow: 0 0 4px rgba(0, 255, 234, .4);
}

:deep(.custom-button:hover) {
  color: #00ffea;
  box-shadow: 0 0 8px #00ffea;
  background: rgba(0, 10, 20, 1);
}

.content-grid {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
</style>
