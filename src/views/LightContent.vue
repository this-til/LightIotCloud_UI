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
            <el-slider
              v-model="brightness"
              :min="0"
              :max="1000"
              :step="1"
              :disabled="!device.online"
              @change="handleBrightnessChange"
              class="custom-slider"
            />
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
              <el-switch
                v-model="autoBrightness"
                :disabled="!device.online"
                @change="handleAutoBrightnessChange"
                active-text="开启"
                inactive-text="关闭"
                class="custom-switch"
              />
            </div>

            <!-- 卷帘门开关 -->
            <div class="control-row">
              <div class="control-label-wrapper">
                <span class="control-label">卷帘门开关</span>
                <span class="control-desc">控制卷帘门的开闭</span>
              </div>
              <el-switch
                v-model="rollingDoorOpen"
                :disabled="!device.online"
                @change="handleRollingDoorChange"
                active-text="开启"
                inactive-text="关闭"
                class="custom-switch"
              />
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
            <span>温度</span>
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
            <div>{{ formatValue(lightState.power) }} W</div>
            <div class="sub-values">
              <span>{{ formatValue(lightState.electricity) }} A</span>
              <span>{{ formatValue(lightState.voltage) }} V</span>
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
            <div>{{ formatValue(lightState.wirelessChargingPower) }} W</div>
            <div class="sub-values">
              <span>{{ formatValue(lightState.wirelessChargingElectricity) }} A</span>
              <span>{{ formatValue(lightState.wirelessChargingVoltage) }} V</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { getDefWebSocketClient, subscriptionLightDataReportEventEvent, subscriptionLightStateReportEvent, setLightGear, setAutomaticGear, setRollingDoor, SUCCESSFUL } from "@/util/Api"
import type { Device, LightData, LightState, unsubscribe } from "@/util/Api"
import { useRoute } from "vue-router"
import { Monitor, WindPower, Compass, Sunny, Lightning, Connection } from "@element-plus/icons-vue"
import { computedAsync } from "@vueuse/core"
import { ElNotification } from "element-plus"

const props = defineProps<{
  device: Device
}>()

const route = useRoute()

const lightData = ref<LightData>({} as LightData)
const lightState = ref<LightState>({} as LightData)
const brightness = ref(50)
const autoBrightness = ref(false)
const rollingDoorOpen = ref(false)

let unsubscriptionLightStateReportEvent: unsubscribe | null = null
let unsubscriptionLightDataReportEvent: unsubscribe | null = null

onMounted(async () => {
  const lightId: number = props.device.id

  unsubscriptionLightStateReportEvent = subscriptionLightStateReportEvent(
    getDefWebSocketClient(),
    lightId,
    {
      next(value: LightState) {
        lightState.value = value
        console.log("new LightState:", value)
      },
      complete(): void {
      },
      error(error: unknown): void {
      }
    }
  )

  unsubscriptionLightDataReportEvent = subscriptionLightDataReportEventEvent(
    getDefWebSocketClient(),
    lightId,
    {
      next(value: LightData) {
        lightData.value = value
        console.log("new LightData:", value)
      },
      complete(): void {
      },
      error(error: unknown): void {
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

const handleBrightnessChange = async (value: number) => {
  try {
    const result = await setLightGear(Number(route.query.id), value)
    if (result === SUCCESSFUL) {
      ElNotification({
        type: "success",
        title: "设置成功",
        message: `亮度已设置为 ${value}%`,
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

const handleAutoBrightnessChange = async (value: boolean) => {
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

const handleRollingDoorChange = async (value: boolean) => {
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

// 添加一个格式化函数
const formatValue = (value: number | undefined): string => {
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
</style> 