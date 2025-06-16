<template>
  <div class="history-data-container">
    <div class="time-range-selector">
      <el-date-picker
        v-model="timeRange"
        type="datetimerange"
        range-separator="至"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        :shortcuts="timeShortcuts"
        @change="handleTimeRangeChange"
      />
    </div>

    <div class="charts-container">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>温度 (°C)</span>
              </div>
            </template>
            <div ref="temperatureChartRef" class="chart"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>湿度 (%)</span>
              </div>
            </template>
            <div ref="humidityChartRef" class="chart"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mt-20">
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>PM2.5 (μg/m³)</span>
              </div>
            </template>
            <div ref="pm25ChartRef" class="chart"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>PM10 (μg/m³)</span>
              </div>
            </template>
            <div ref="pm10ChartRef" class="chart"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mt-20">
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>光照强度 (lux)</span>
              </div>
            </template>
            <div ref="illuminationChartRef" class="chart"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>风速 (m/s)</span>
              </div>
            </template>
            <div ref="windSpeedChartRef" class="chart"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { useRoute } from "vue-router"
import * as echarts from "echarts"
import type { EChartsOption } from "echarts"
import { getLightHistoryData } from "@/util/Api"
import type { LightData, TimeRange, Device } from "@/util/Api"

const props = defineProps<{
  light: Device
}>()

const route = useRoute()
const lightId = Number(route.query.id)

// Chart refs
const temperatureChartRef = ref<HTMLElement>()
const humidityChartRef = ref<HTMLElement>()
const pm25ChartRef = ref<HTMLElement>()
const pm10ChartRef = ref<HTMLElement>()
const illuminationChartRef = ref<HTMLElement>()
const windSpeedChartRef = ref<HTMLElement>()

// Chart instances
const temperatureChart = ref<echarts.ECharts | null>(null)
const humidityChart = ref<echarts.ECharts | null>(null)
const pm25Chart = ref<echarts.ECharts | null>(null)
const pm10Chart = ref<echarts.ECharts | null>(null)
const illuminationChart = ref<echarts.ECharts | null>(null)
const windSpeedChart = ref<echarts.ECharts | null>(null)

// 存储所有图表实例的数组
const charts = ref<echarts.ECharts[]>([])

// Time range
const timeRange = ref<[Date, Date] | null>(null)
const timeShortcuts = [
  {
    text: "最近一小时",
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000)
      return [start, end]
    }
  },
  {
    text: "最近一天",
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24)
      return [start, end]
    }
  },
  {
    text: "最近一周",
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  }
]

// Initialize charts
const initCharts = () => {
  const chartRefs = [
    { ref: temperatureChartRef, instance: temperatureChart },
    { ref: humidityChartRef, instance: humidityChart },
    { ref: pm25ChartRef, instance: pm25Chart },
    { ref: pm10ChartRef, instance: pm10Chart },
    { ref: illuminationChartRef, instance: illuminationChart },
    { ref: windSpeedChartRef, instance: windSpeedChart }
  ]

  chartRefs.forEach(({ ref, instance }) => {
    if (ref.value) {
      const chart = echarts.init(ref.value)
      charts.value.push(chart)
      instance.value = chart
    }
  })
}

// Update charts with data
const updateCharts = (data: LightData[]) => {
  const times = data.map(item => new Date(item.time).toLocaleString())
  
  const updateChart = (chart: echarts.ECharts | null, data: (number | undefined)[], name: string) => {
    if (!chart) return
    
    const option: EChartsOption = {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const time = params[0].axisValue
          const value = params[0].value
          return `${time}<br/>${name}: ${value}`
        }
      },
      xAxis: {
        type: "category",
        data: times,
        axisLabel: {
          rotate: 0,
          interval: Math.floor(times.length / 10),
          formatter: (value: string) => {
            const date = new Date(value)
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
          }
        }
      },
      yAxis: {
        type: "value",
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed'
          }
        }
      },
      series: [{
        data: data,
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 2
        },
        areaStyle: {
          opacity: 0.1
        }
      }],
      grid: {
        left: "3%",
        right: "4%",
        bottom: "8%",
        containLabel: true
      }
    }
    
    chart.setOption(option)
  }

  updateChart(temperatureChart.value, data.map(item => item.temperature), "温度")
  updateChart(humidityChart.value, data.map(item => item.humidity), "湿度")
  updateChart(pm25Chart.value, data.map(item => item.pm2_5), "PM2.5")
  updateChart(pm10Chart.value, data.map(item => item.pm10), "PM10")
  updateChart(illuminationChart.value, data.map(item => item.illumination), "光照强度")
  updateChart(windSpeedChart.value, data.map(item => item.windSpeed), "风速")
}

// Handle time range change
const handleTimeRangeChange = async () => {
  if (!timeRange.value) return

  const timeRangeParam: TimeRange = {
    start: timeRange.value[0],
    end: timeRange.value[1]
  }

  try {
    const data = await getLightHistoryData(lightId, timeRangeParam)
    updateCharts(data)
  } catch (error) {
    console.error("Failed to fetch history data:", error)
  }
}

// Handle window resize
const handleResize = () => {
  charts.value.forEach(chart => {
    chart?.resize()
  })
}

// Handle page visibility change
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    // When page becomes visible, re-adjust chart size
    handleResize()
  }
}

onMounted(() => {
  initCharts()
  window.addEventListener('resize', handleResize)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // Set default time range to last 24 hours
  const end = new Date()
  const start = new Date()
  start.setTime(start.getTime() - 3600 * 1000 * 24)
  timeRange.value = [start, end]
  handleTimeRangeChange()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  charts.value.forEach(chart => {
    chart?.dispose()
  })
  charts.value = []
})
</script>

<style scoped>
.history-data-container {
  padding: 20px;
}

.time-range-selector {
  margin-bottom: 20px;
}

.charts-container {
  margin-top: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart {
  height: 300px;
  width: 100%;
}

.mt-20 {
  margin-top: 20px;
}
</style>