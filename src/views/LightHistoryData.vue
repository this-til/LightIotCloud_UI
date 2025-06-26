<template>
    <div class="history-data-container sci-fi">
        <div class="history-data-container">
            <div class="time-range-selector">
                <el-date-picker v-model="timeRange" type="datetimerange" range-separator="至" start-placeholder="开始时间"
                    end-placeholder="结束时间" :shortcuts="timeShortcuts" @change="handleTimeRangeChange" />
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
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import * as echarts from "echarts"
import { getLightHistoryData } from "@/util/Api"
import { formatDateTime } from '@/util/TimeFormat'

const sciFiTheme = {
    // 整体背景色（你外层卡片已是深色，可设 transparent）
    backgroundColor: "transparent",

    // 全局字体 & 颜色
    textStyle: {
        fontFamily: "DIN, Roboto, 微软雅黑, sans-serif",
        color: "#06f6f1"
    },

    // 颜色调色盘：赛博绿 / 霓虹蓝 / 紫 / 珊瑚红
    color: ["#00ffea", "#0066ff", "#be8bff", "#ff5c5c"],

    // 坐标轴样式
    axisPointer: {
        lineStyle: { color: "#06f6f1" },
        crossStyle: { color: "#06f6f1" }
    },
    axisLine: { lineStyle: { color: "#06f6f1" } },
    axisLabel: { color: "#98c6ff" },
    splitLine: {
        lineStyle: {
            color: "rgba(255,255,255,.08)",
            type: "dashed"
        }
    },

    // 提示框
    tooltip: {
        backgroundColor: "rgba(10,15,30,.9)",
        borderColor: "#06f6f1",
        borderWidth: 1
    },

    // 网格线
    grid: { borderColor: "#06f6f1" },

    // 折线图默认样式（阴影发光）
    line: {
        lineStyle: {
            width: 2,
            shadowColor: "rgba(0,255,234,.6)",
            shadowBlur: 6
        },
        areaStyle: {
            opacity: 0.12
        },
        symbol: "none"
    }
}

echarts.registerTheme("sciFi", sciFiTheme)

const props = defineProps({
    device: Object
})

const router = useRouter()

// Chart refs
const temperatureChartRef = ref()
const humidityChartRef = ref()
const pm25ChartRef = ref()
const pm10ChartRef = ref()
const illuminationChartRef = ref()
const windSpeedChartRef = ref()

// Chart instances
const temperatureChart = ref(null)
const humidityChart = ref(null)
const pm25Chart = ref(null)
const pm10Chart = ref(null)
const illuminationChart = ref(null)
const windSpeedChart = ref(null)

// 存储所有图表实例的数组
const charts = ref([])

// Time range
const timeRange = ref(null)
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
            const chart = echarts.init(ref.value, "sciFi")
            charts.value.push(chart)
            instance.value = chart
        }
    })
}

// Update charts with data
const updateCharts = (data) => {
    const times = data.map(item => formatDateTime(item.time, 'short'))

    const updateChart = (chart, data, name) => {
        if (!chart) return

        const option = {
            tooltip: {
                trigger: "axis",
                formatter: (params) => {
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
                    formatter: (value) => {
                        return formatDateTime(value, 'chart')
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

    const timeRangeParam = {
        start: timeRange.value[0],
        end: timeRange.value[1]
    }

    try {
        const data = await getLightHistoryData(props.device.id, timeRangeParam)
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

    // Dispose all charts
    charts.value.forEach(chart => {
        chart?.dispose()
    })
})
</script>

<style scoped>
.sci-fi {
    background: rgba(0, 0, 0, 0.45);
}

/* 面板卡片（Element 的 el-card） */
.sci-fi .chart-card {
    background: rgba(20, 25, 45, 0.9);
    border: 1px solid #06f6f1;
    box-shadow: 0 0 8px #06f6f1;
    border-radius: 6px;
    transition: transform 0.2s, box-shadow 0.2s;
}

.sci-fi .chart-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 0 12px #06f6f1;
}

/* 卡片标题 */
.sci-fi .card-header {
    color: #06f6f1;
    letter-spacing: 1px;
    font-weight: 600;
    border-bottom: 1px solid #06f6f1;
    padding-bottom: 4px;
}

/* 时间选择器外观 */
.sci-fi .time-range-selector :deep(.el-date-editor) {
    background: rgba(10, 15, 30, 0.8);
    border-color: #06f6f1;
    color: #06f6f1;
}

.sci-fi .time-range-selector :deep(.el-date-editor .el-input__inner) {
    color: #e0f7fa;
    /* 正常文字 */
    background: rgba(10, 15, 30, 0.9);
    /* 如果需要加深输入框背景 */
}

.sci-fi .time-range-selector :deep(.el-date-editor .el-range-input) {
    color: #e6fcff !important;
    /* 明亮霓虹蓝白 */
}

/* 如果想一起提高 placeholder 的亮度（可选） */
.sci-fi .time-range-selector :deep(.el-date-editor .el-range-input::placeholder) {
    color: #a8f2ff !important;
}

.sci-fi .time-range-selector :deep(.el-date-editor .el-input__inner::placeholder) {
    color: #8fe8ff;
    /* 占位文字 */
}

/* 提亮分隔符和图标 */
.sci-fi .time-range-selector :deep(.el-range-separator),
.sci-fi .time-range-selector :deep(.el-input__suffix) {
    color: #06f6f1;
}

.sci-fi .time-range-selector :deep(.el-date-editor.el-input--suffix .el-input__icon) {
    color: #06f6f1;
}

/* Chart 容器可加背景网格或半透明色 */
.sci-fi .chart {
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(6, 246, 241, 0.3);
    border-radius: 4px;
}

/* 调整文字色：数据坐标 & 标签 */
.sci-fi .el-card__body,
.sci-fi .el-card__header {
    color: #ffffff;
}

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
