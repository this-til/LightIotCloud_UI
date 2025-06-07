<template>
  <div class="content-grid">
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
          <div class="data-value">{{ lightData.temperature }}°C</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Monitor />
            </el-icon>
            <span>湿度</span>
          </div>
          <div class="data-value">{{ lightData.humidity }}%</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Monitor />
            </el-icon>
            <span>PM2.5</span>
          </div>
          <div class="data-value">{{ lightData.pm2_5 }} μg/m³</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Monitor />
            </el-icon>
            <span>PM10</span>
          </div>
          <div class="data-value">{{ lightData.pm10 }} μg/m³</div>
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
          <div class="data-value">{{ lightData.windSpeed }} m/s</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Compass />
            </el-icon>
            <span>风向</span>
          </div>
          <div class="data-value">{{ lightData.windDirection }}°</div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Sunny />
            </el-icon>
            <span>环境光亮</span>
          </div>
          <div class="data-value">{{ lightData.illumination }} lux</div>
        </el-card>
      </div>
    </div>

    <!-- 设备状态 -->
    <div class="content-section">
      <div class="section-header">
        <h2>设备状态</h2>
      </div>
      <div class="data-grid">
        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Lightning />
            </el-icon>
            <span>无线充电</span>
          </div>
          <div class="data-value">
            <el-tag :type="lightState.wirelessChargingEnabled ? 'success' : 'info'" :effect="lightState.wirelessChargingEnabled ? 'light' : 'plain'">
              {{ lightState.wirelessChargingEnabled ? "已启用" : "未启用" }}
            </el-tag>
          </div>
        </el-card>

        <el-card shadow="hover" class="data-card">
          <div class="data-header">
            <el-icon class="data-icon">
              <Monitor />
            </el-icon>
            <span>充电功率</span>
          </div>
          <div class="data-value">{{ lightState.wirelessChargingPower }} W</div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"
import { useGraphqlStore } from "@/util/store"
import { subscriptionLightDataReportEventEvent, subscriptionLightStateReportEvent } from "@/util/api"
import type { LightData, LightState, unsubscribe } from "@/util/api"
import { useRoute } from "vue-router"
import { Monitor, WindPower, Compass, Sunny, Lightning } from "@element-plus/icons-vue"

const graphqlStore = useGraphqlStore()
const route = useRoute()

const lightData = ref<LightData>({})
const lightState = ref<LightState>({})

let unsubscriptionLightStateReportEvent: unsubscribe | null = null
let unsubscriptionLightDataReportEvent: unsubscribe | null = null

onMounted(() => {
  const lightId: number = Number.parseInt(route.query.id)

  unsubscriptionLightStateReportEvent = subscriptionLightStateReportEvent(
    graphqlStore.getClient(),
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
    graphqlStore.getClient(),
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
</style> 