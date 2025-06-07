<template>
  <div class="light-detail-container">
    <el-card class="status-card">
      <template #header>
        <div class="card-header">
          <span>设备实时状态</span>
          <el-tag :type="lightData.online ? 'success' : 'danger'" size="small">
            {{ lightData.online ? '在线' : '离线' }}
          </el-tag>
        </div>
      </template>
      
      <div class="status-grid" v-if="lightData.online">
        <!-- 环境数据 -->
        <div class="status-section">
          <h3>环境数据</h3>
          <div class="data-grid">
            <el-card shadow="hover" class="data-card">
              <template #header>
                <div class="data-header">
<!--                  <el-icon><Thermometer /></el-icon>-->
                  <span>温度</span>
                </div>
              </template>
              <div class="data-value">{{ lightData.temperature }}°C</div>
            </el-card>
            
            <el-card shadow="hover" class="data-card">
              <template #header>
                <div class="data-header">
<!--                  <el-icon><WaterMeter /></el-icon>-->
                  <span>湿度</span>
                </div>
              </template>
              <div class="data-value">{{ lightData.humidity }}%</div>
            </el-card>
            
            <el-card shadow="hover" class="data-card">
              <template #header>
                <div class="data-header">
                  <el-icon><Monitor /></el-icon>
                  <span>PM2.5</span>
                </div>
              </template>
              <div class="data-value">{{ lightData.pm2_5 }} μg/m³</div>
            </el-card>
            
            <el-card shadow="hover" class="data-card">
              <template #header>
                <div class="data-header">
                  <el-icon><Monitor /></el-icon>
                  <span>PM10</span>
                </div>
              </template>
              <div class="data-value">{{ lightData.pm10 }} μg/m³</div>
            </el-card>
          </div>
        </div>

        <!-- 气象数据 -->
        <div class="status-section">
          <h3>气象数据</h3>
          <div class="data-grid">
            <el-card shadow="hover" class="data-card">
              <template #header>
                <div class="data-header">
                  <el-icon><WindPower /></el-icon>
                  <span>风速</span>
                </div>
              </template>
              <div class="data-value">{{ lightData.windSpeed }} m/s</div>
            </el-card>
            
            <el-card shadow="hover" class="data-card">
              <template #header>
                <div class="data-header">
                  <el-icon><Compass /></el-icon>
                  <span>风向</span>
                </div>
              </template>
              <div class="data-value">{{ lightData.windDirection }}°</div>
            </el-card>
            
            <el-card shadow="hover" class="data-card">
              <template #header>
                <div class="data-header">
                  <el-icon><Sunny /></el-icon>
                  <span>照明</span>
                </div>
              </template>
              <div class="data-value">{{ lightData.illumination }} lux</div>
            </el-card>
          </div>
        </div>

        <!-- 设备状态 -->
        <div class="status-section">
          <h3>设备状态</h3>
          <div class="data-grid">
            <el-card shadow="hover" class="data-card">
              <template #header>
                <div class="data-header">
                  <el-icon><Lightning /></el-icon>
                  <span>无线充电</span>
                </div>
              </template>
              <div class="data-value">
                <el-tag :type="lightState.wirelessChargingEnabled ? 'success' : 'info'">
                  {{ lightState.wirelessChargingEnabled ? '已启用' : '未启用' }}
                </el-tag>
              </div>
            </el-card>
            
            <el-card shadow="hover" class="data-card">
              <template #header>
                <div class="data-header">
                  <el-icon><Light /></el-icon>
                  <span>充电功率</span>
                </div>
              </template>
              <div class="data-value">{{ lightState.wirelessChargingPower }} W</div>
            </el-card>
          </div>
        </div>
      </div>
      
      <div v-else class="offline-message">
        <el-empty description="设备离线" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">

import { onMounted, onUnmounted, ref } from "vue"
import { useGraphqlStore } from "@/util/store"
import { subscriptionLightDataReportEventEvent, subscriptionLightStateReportEvent } from "@/util/api"
import type { LightData, LightState, unsubscribe } from "@/util/api"
import { useRoute } from "vue-router"
import {
  Monitor,
  WindPower,
  Compass,
  Sunny,
  Lightning,
} from '@element-plus/icons-vue'

const graphqlStore = useGraphqlStore()
const route = useRoute()

const lightState = ref<LightState>({})
const lightData = ref<LightData>({})

let unsubscriptionLightStateReportEvent: unsubscribe | null = null
let unsubscriptionLightDataReportEvent: unsubscribe | null = null

onMounted(() => {
  unsubscriptionLightStateReportEvent = subscriptionLightStateReportEvent(
    graphqlStore.client,
    Number.parseInt(route.query.id),
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
    graphqlStore.client,
    Number.parseInt(route.query.id),
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
.light-detail-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.status-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.status-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-section h3 {
  margin: 0;
  color: #606266;
  font-size: 16px;
  font-weight: 500;
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
}

.data-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  text-align: center;
  padding: 8px 0;
}

.offline-message {
  padding: 40px 0;
}
</style>