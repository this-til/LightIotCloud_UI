<template>
  <div class="content-grid">
    <!-- 设备控制 -->
    <div class="content-section">
      <div class="section-header">
        <h2>设备控制</h2>
      </div>
      <div class="control-section">
        <div class="control-item">
          <div class="control-row">
            <div class="control-label-wrapper">
              <span class="control-label">亮度调节</span>
              <span class="control-value">{{ brightness }}%</span>
            </div>
            <el-slider v-model="brightness" :min="0" :max="1000" :step="1" :disabled="!device.online"
              @change="handleBrightnessChange" class="custom-slider" />
          </div>
        </div>

        <div class="control-item">
          <div class="horizontal-control-group">
            <!-- 自动亮度调节 -->
            <div class="control-row">
              <div class="control-label-wrapper">
                <span class="control-label">自动亮度调节</span>
                <span class="control-desc">根据环境光线自动调整亮度</span>
              </div>
              <el-switch v-model="autoBrightness" :disabled="!device.online" @change="handleAutoBrightnessChange"
                active-text="开启" inactive-text="关闭" class="custom-switch" />
            </div>

            <!-- 卷帘门开关 -->
            <div class="control-row">
              <div class="control-label-wrapper">
                <span class="control-label">卷帘门开关</span>
                <span class="control-desc">控制卷帘门的开闭</span>
              </div>
              <el-switch v-model="rollingDoorOpen" :disabled="!device.online" @change="handleRollingDoorChange"
                active-text="开启" inactive-text="关闭" class="custom-switch" />
            </div>

            <!-- 无人机基站盖板 -->
            <div class="control-row">
              <div class="control-label-wrapper">
                <span class="control-label">基站盖板</span>
                <span class="control-desc">控制无人机基站盖板开闭</span>
              </div>
              <el-switch v-model="uavBaseStationCoverOpen" :disabled="!device.online" @change="handleUavBaseStationCoverChange"
                active-text="开启" inactive-text="关闭" class="custom-switch" />
            </div>

            <!-- 无人机基站夹具 -->
            <div class="control-row">
              <div class="control-label-wrapper">
                <span class="control-label">基站夹具</span>
                <span class="control-desc">控制无人机基站夹具开闭</span>
              </div>
              <el-switch v-model="uavBaseStationClampOpen" :disabled="!device.online" @change="handleUavBaseStationClampChange"
                active-text="开启" inactive-text="关闭" class="custom-switch" />
            </div>

            <!-- 对讲按钮 -->
            <div class="control-row" v-if="enabledIntercomSwitch">
              <div class="control-label-wrapper">
                <span class="control-label">对讲开关</span>
                <span class="control-desc">启用以打开设备对讲功能</span>
              </div>
              <el-switch v-model="intercomSwitchOpen" :disabled="!device.online" @change="handleIntercomSwitchChange"
                         active-text="开启" inactive-text="关闭" class="custom-switch" />
            </div>

          </div>

        </div>
      </div>
    </div>

    <!-- 环境数据 -->
    <div class="content-section">
      <div class="section-header">
        <h2>环境数据</h2>
      </div>
      <div class="data-grid">
        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Monitor />
            </el-icon>
            <span >温度</span>
          </div>
          <div class="data-value">{{ formatValue(lightData.temperature) }}°C</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Monitor />
            </el-icon>
            <span>湿度</span>
          </div>
          <div class="data-value">{{ formatValue(lightData.humidity) }}%</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Monitor />
            </el-icon>
            <span>PM2.5</span>
          </div>
          <div class="data-value">{{ formatValue(lightData.pm2_5) }} μg/m³</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Monitor />
            </el-icon>
            <span>PM10</span>
          </div>
          <div class="data-value">{{ formatValue(lightData.pm10) }} μg/m³</div>
        </el-card>
      </div>
    </div>

    <!-- 气象数据 -->
    <div class="content-section">
      <div class="section-header">
        <h2>气象数据</h2>
      </div>
      <div class="data-grid">
        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <WindPower />
            </el-icon>
            <span>风速</span>
          </div>
          <div class="data-value">{{ formatValue(lightData.windSpeed) }} m/s</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Compass />
            </el-icon>
            <span>风向</span>
          </div>
          <div class="data-value">{{ formatValue(lightData.windDirection) }}°</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Sunny />
            </el-icon>
            <span>环境光亮</span>
          </div>
          <div class="data-value">{{ formatValue(lightData.illumination) }} lux</div>
        </el-card>
      </div>
    </div>

    <!-- 设备状态 -->
    <div class="content-section">
      <div class="section-header">
        <h2>设备状态</h2>
      </div>
      <div class="power-grid">

        <!-- 设备功率 -->
        <el-card shadow="hover" class="power-card">
          <div class="power-header">
            <el-icon class="power-icon">
              <Lightning />
            </el-icon>
            <span>设备功率</span>
          </div>
          <div class="power-value">
            <div>{{ formatValue(lightState.selfPower?.power) }} W</div>
            <div class="sub-values">
              <span>{{ formatValue(lightState.selfPower?.electricity) }} A</span>
              <span>{{ formatValue(lightState.selfPower?.voltage) }} V</span>
            </div>
          </div>
        </el-card>

        <!-- 无线充电功率 -->
        <el-card shadow="hover" class="power-card">
          <div class="power-header">
            <el-icon class="power-icon">
              <Connection />
            </el-icon>
            <span>无线充电功率</span>
          </div>
          <div class="power-value">
            <div>{{ formatValue(lightState.wirelessChargingPower?.power) }} W</div>
            <div class="sub-values">
              <span>{{ formatValue(lightState.wirelessChargingPower?.electricity) }} A</span>
              <span>{{ formatValue(lightState.wirelessChargingPower?.voltage) }} V</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"
import {
  getDefWebSocketClient, subscriptionLightDataReportEventEvent, createDefWebSocketClient,
  subscriptionLightStateReportEvent, setLightGear, setAutomaticGear, setRollingDoor,
  setUavBaseStationCover, setUavBaseStationClamp, SUCCESSFUL
} from "@/util/Api"
import { useRoute } from "vue-router"
import { Monitor, WindPower, Compass, Sunny, Lightning, Connection } from "@element-plus/icons-vue"
import { computedAsync } from "@vueuse/core"
import { ElNotification } from "element-plus"
import { cos } from 'three/nodes'

const enabledIntercomSwitch = true
const intercomSwitchOpen = ref(false)

const handleIntercomSwitchChange = (value) => {
  ElNotification({
    type: "success",
    title: "设置成功",
    message: `语音对讲功能已${value ? "开启" : "关闭"}`,
    duration: 2000
  })
}

const props = defineProps({
  device: Object
})

const route = useRoute()

const lightData = ref({})
const lightState = ref({})
const brightness = ref(50)
const autoBrightness = ref(true)
const rollingDoorOpen = ref(false)
const uavBaseStationCoverOpen = ref(false)
const uavBaseStationClampOpen = ref(false)

let unsubscriptionLightStateReportEvent = null
let unsubscriptionLightDataReportEvent = null

onMounted(async () => {
  const lightId = props.device.id

  if (getDefWebSocketClient() == null) {
    createDefWebSocketClient()
  }

  unsubscriptionLightStateReportEvent = subscriptionLightStateReportEvent(
    getDefWebSocketClient(),
    Number(lightId),
    {
      next(value) {
        lightState.value = value
        console.log("new LightState:", value)
      },
      complete() {
      },
      error(error) {
      }
    }
  )

  unsubscriptionLightDataReportEvent = subscriptionLightDataReportEventEvent(
    getDefWebSocketClient(),
    Number(lightId),
    {
      next(value) {
        lightData.value = value
        console.log("new LightData:", value)
      },
      complete() {
      },
      error(error) {
      }
    }
  )
})

onUnmounted(() => {
  if (unsubscriptionLightStateReportEvent != null) {
    unsubscriptionLightStateReportEvent()
    unsubscriptionLightStateReportEvent = null
  }
  if (unsubscriptionLightDataReportEvent != null) {
    unsubscriptionLightDataReportEvent()
    unsubscriptionLightDataReportEvent = null
  }
})

const handleBrightnessChange = async (value) => {
  try {
    const result = await setLightGear(Number(route.query.id), value)
    if (result === SUCCESSFUL) {
      const displayValue = value / 10
      ElNotification({
        type: "success",
        title: "设置成功",
        message: `亮度已设置为 ${displayValue}%`,
        duration: 2000
      })
    } else {
      ElNotification({
        type: "error",
        title: "设置失败",
        message: "亮度设置失败，请重试",
        duration: 2000
      })
    }
  } catch (error) {
    console.error("设置亮度失败:", error)
    ElNotification({
      type: "error",
      title: "设置失败",
      message: "设置亮度时发生错误",
      duration: 2000
    })
  }
}

const handleAutoBrightnessChange = async (value) => {
  try {
    const result = await setAutomaticGear(Number(route.query.id), value)
    if (result === SUCCESSFUL) {
      ElNotification({
        type: "success",
        title: "设置成功",
        message: `自动亮度调节已${value ? "开启" : "关闭"}`,
        duration: 2000
      })
    } else {
      ElNotification({
        type: "error",
        title: "设置失败",
        message: "自动亮度设置失败，请重试",
        duration: 2000
      })
    }
  } catch (error) {
    console.error("设置自动亮度失败:", error)
    ElNotification({
      type: "error",
      title: "设置失败",
      message: "设置自动亮度时发生错误",
      duration: 2000
    })
  }
}

const handleRollingDoorChange = async (value) => {
  try {
    const result = await setRollingDoor(Number(route.query.id), value)
    if (result === SUCCESSFUL) {
      ElNotification({
        type: "success",
        title: "设置成功",
        message: `卷帘门已${value ? "开启" : "关闭"}`,
        duration: 2000
      })
    } else {
      ElNotification({
        type: "error",
        title: "设置失败",
        message: "卷帘门设置失败，请重试",
        duration: 2000
      })
    }
  } catch (error) {
    console.error("设置卷帘门失败:", error)
    ElNotification({
      type: "error",
      title: "设置失败",
      message: "设置卷帘门时发生错误",
      duration: 2000
    })
  }
}

const handleUavBaseStationCoverChange = async (value) => {
  try {
    const result = await setUavBaseStationCover(Number(route.query.id), value)
    if (result === SUCCESSFUL) {
      ElNotification({
        type: "success",
        title: "设置成功",
        message: `无人机基站盖板已${value ? "开启" : "关闭"}`,
        duration: 2000
      })
    } else {
      ElNotification({
        type: "error",
        title: "设置失败",
        message: "无人机基站盖板设置失败，请重试",
        duration: 2000
      })
    }
  } catch (error) {
    console.error("设置无人机基站盖板失败:", error)
    ElNotification({
      type: "error",
      title: "设置失败",
      message: "设置无人机基站盖板时发生错误",
      duration: 2000
    })
  }
}

const handleUavBaseStationClampChange = async (value) => {
  try {
    const result = await setUavBaseStationClamp(Number(route.query.id), value)
    if (result === SUCCESSFUL) {
      ElNotification({
        type: "success",
        title: "设置成功",
        message: `无人机基站夹具已${value ? "开启" : "关闭"}`,
        duration: 2000
      })
    } else {
      ElNotification({
        type: "error",
        title: "设置失败",
        message: "无人机基站夹具设置失败，请重试",
        duration: 2000
      })
    }
  } catch (error) {
    console.error("设置无人机基站夹具失败:", error)
    ElNotification({
      type: "error",
      title: "设置失败",
      message: "设置无人机基站夹具时发生错误",
      duration: 2000
    })
  }
}

// 添加一个格式化函数
const formatValue = (value) => {
  if (value === undefined || value === null) return "--"

  // 处理特殊值：风向角度
  if (value === lightData.value.windDirection) {
    // 风向角度保留整数
    return Math.round(value).toString()
  }

  // 其他值保留一位小数
  return Number(value.toFixed(1)).toString()
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
  font-size: 24px;
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
  font-size: 20px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.control-desc {
  font-size: 12px;
  color: #909399;
}

.control-value {
  font-size: 16px;
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

.switch-group {
  display: flex;
  gap: 16px;
  align-items: center;
}

.rolling-door-switch {
  margin-left: 8px;
}

.horizontal-control-group {
  display: flex;
  gap: 16px;
}

.horizontal-control-group .control-row {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.control-label-wrapper {
  min-width: 100px;
  margin-right: 16px;
}

:deep(.custom-switch) {
  margin-left: 0;
}

.content-section,
.data-card,
.power-card {
  background: rgba(0, 10, 20, 0.70);
  /* 半透明深蓝 */
  border: 1px solid rgba(0, 255, 234, 0.35);
  /* 霓虹青描边 */
  backdrop-filter: blur(6px);
  box-shadow: 0 0 6px rgba(0, 255, 234, 0.25);
}

/* 悬停时光晕更强，保持原有位移 */
.data-card:hover,
.power-card:hover {
  box-shadow: 0 0 10px rgba(0, 255, 234, 0.45);
}

/* === 标题 & 文本颜色 =========================================== */
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

/* === Slider：轨道 + 滑块 ======================================= */
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

/* 禁用态淡化 */
:deep(.custom-slider.is-disabled .el-slider__runway) {
  background: rgba(255, 255, 255, .12);
}

:deep(.custom-slider.is-disabled .el-slider__bar) {
  background: rgba(255, 255, 255, .25);
}

:deep(.custom-slider.is-disabled .el-slider__button) {
  border-color: rgba(255, 255, 255, .3);
}

/* === Switch：霓虹样式 ========================================= */
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

.content-grid {
  flex: 1 1 auto;
  /* 可收，也可撑 */
  min-height: 0;
  /* 关键：允许向内收缩 */
  overflow-y: auto;
  /* 超出就出现纵向滚动条 */
}

/* 如果外层 el-main 或其它包裹容器也有 flex，最好一并加 */
.main-content {
  /* 你的 el-main class */
  min-height: 0;
  /* 同理，允许内部滚动容器收缩 */
}
</style>

<style>
/* 1 | 让根、#app、el-container 全都 100% 高，否则内部算不出剩余空间 */
html,
body,
#app {
  height: 100%;
}

/* 2 | 让 el-container / el-main 也能缩、能滚 */
.el-container {
  min-height: 0;
}

/* 若你的外层是 el-container */
.el-main.main-content {
  /* main-content 是上层给的 class */
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* 允许子 flex 项收缩 */
  overflow-y: auto;
  /* 真正出现滚动条的地方 */
}

/* 3 | content-grid 里如果还想再细分滚动，也保持 min-height:0 */
.content-grid {
  min-height: 0;
}

/* 这一句可放在 scoped，也可放在全局 */

.section-header h2         { font-size: 20px; }   /* 18 → 20 */
.data-header span          { font-size: 20px; }   /* 16 → 20 */
.power-header span         { font-size: 20px; }   /* 新增功率标题 */
.data-value                { font-size: 30px; }   /* 26 → 30 */
.power-value               { font-size: 32px; }   /* 28 → 32 */
.power-value .sub-values   { font-size: 24px; }   /* 20 → 24 */

.control-label             { font-size: 18px; }   /* 16 → 18 */
.control-desc,
.control-value             { font-size: 14px; }   /* 12 → 14 */
</style>
