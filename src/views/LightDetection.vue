<template>
  <div class="detection-container">
    <div class="time-range-selector">
      <div class="left-controls">
        <el-switch
          v-model="realtimeEnabled"
          active-text="实时更新"
          @change="handleRealtimeToggle"
        />
      </div>
      <div class="right-controls">
        <template v-if="!realtimeEnabled">
          <el-date-picker
            v-model="timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            :shortcuts="timeShortcuts"
            @change="handleTimeRangeChange"
          />
        </template>
      </div>
    </div>

    <div v-loading="loading" class="detection-grid">
      <template v-if="keyframes.length > 0">
        <el-card v-for="keyframe in keyframes" :key="keyframe.id" class="detection-card">
          <div class="detection-header">
            <span class="detection-time">{{ new Date(keyframe.time).toLocaleString() }}</span>
          </div>
          <div class="detection-content">

            <div class="detection-image" @click="showOriginalImage(keyframe.id)">
              <div class="image-container">
                <img
                  v-if="!imageLoadErrors[keyframe.id]"
                  :src="imageUrls[keyframe.id]"
                  alt="Detection"
                  ref="imgRef"
                  @load="handleImageLoad(keyframe.id, $event)"
                />
                <canvas 
                  :id="`canvas-${keyframe.id}`" 
                  class="bounding-box-canvas"
                ></canvas>
                <div v-if="imageLoadErrors[keyframe.id]" class="image-error-message">
                  <el-icon>
                    <Picture />
                  </el-icon>
                  <span>图片加载失败</span>
                </div>
              </div>
            </div>

          </div>
        </el-card>
      </template>
      <el-empty v-else description="暂无检测数据" class="no-data-message" />
    </div>

    <div v-if="!realtimeEnabled" class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 30]"
        :total="totalCount"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from "vue"
import { useRoute } from "vue-router"
import { getDetectionKeyframes, subscriptionLightDetectionReportEvent, getDefWebSocketClient, getDetectionKeyframeCount, getImage } from "@/util/Api"
import type { DetectionKeyframe, TimeRange, Device } from "@/util/Api"
import { ElMessage } from "element-plus"
import { Picture } from "@element-plus/icons-vue"
import { getColorPreset } from "@/util/ColorPreset"
import { nextTick } from "vue"
import { drawBoundingBoxes } from '@/util/DrawBoundingBoxes'

const props = defineProps<{
  light: Device
}>()

const route = useRoute()
const lightId = Number(route.query.id)
const keyframes = ref<DetectionKeyframe[]>([])
const timeRange = ref<[Date, Date] | null>(null)
const loading = ref(false)
const pageSize = ref(10)
const realtimeEnabled = ref(true)
const currentPage = ref(1)
const totalCount = ref(0)
let unsubscribe: (() => void) | null = null

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

const imageCache = new Map<number, string>()
const imageUrls = ref<Record<number, string>>({})
const imageLoadErrors = ref<Record<number, boolean>>({})

// 存储图片引用
const imgRefs = ref<Record<number, HTMLImageElement | null>>({})
const handleTimeRangeChange = async () => {
  if (!timeRange.value) return

  loading.value = true
  try {
    const timeRangeParam: TimeRange = {
      start: new Date(timeRange.value[0].getTime() - timeRange.value[0].getTimezoneOffset() * 60000),
      end: new Date(timeRange.value[1].getTime() - timeRange.value[1].getTimezoneOffset() * 60000)
    }

    // 获取总帧数
    totalCount.value = await getDetectionKeyframeCount(lightId, timeRangeParam)

    // 获取分页数据
    const data = await getDetectionKeyframes(lightId, {
      current: currentPage.value,
      size: pageSize.value,
      total: totalCount.value
    }, timeRangeParam)

    if (!data || data.length === 0) {
      keyframes.value = []
      return
    }

    // 按时间降序排序
    keyframes.value = data.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  } catch (error) {
    console.error("Failed to fetch detection data:", error)
    ElMessage.error("获取检测数据失败")
    keyframes.value = []
  } finally {
    loading.value = false
  }
}

const handleRealtimeToggle = (value: boolean) => {
  if (value) {
    startRealtimeSubscription()
  } else {
    stopRealtimeSubscription()
  }
}

const startRealtimeSubscription = () => {
  const client = getDefWebSocketClient()
  if (!client) {
    ElMessage.error("WebSocket连接失败")
    realtimeEnabled.value = false
    return
  }

  unsubscribe = subscriptionLightDetectionReportEvent(
    client,
    lightId,
    {
      next: async (keyframe: DetectionKeyframe) => {
        keyframes.value.unshift(keyframe)
        if (keyframes.value.length > pageSize.value) {
          keyframes.value.pop()
        }
        totalCount.value++
        
        // 主动加载新图片
        await getImageUrl(keyframe.id)
      },
      error: (error) => {
        console.error("Detection subscription error:", error)
        ElMessage.error("实时更新连接错误")
        realtimeEnabled.value = false
      },
      complete: () => {
        console.log("Detection subscription completed")
        realtimeEnabled.value = false
      }
    }
  )
}

const stopRealtimeSubscription = () => {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}

const handleSizeChange = async (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  if (!realtimeEnabled.value) {
    await handleTimeRangeChange()
  }
}

const handleCurrentChange = async (val: number) => {
  currentPage.value = val
  if (!realtimeEnabled.value) {
    await handleTimeRangeChange()
  }
}

const getImageUrl = async (keyframeId: number) => {
  if (imageCache.has(keyframeId)) {
    imageUrls.value[keyframeId] = imageCache.get(keyframeId)!
    return
  }

  try {
    const blob = await getImage(keyframeId, true)
    const url = URL.createObjectURL(blob)
    imageCache.set(keyframeId, url)
    imageUrls.value[keyframeId] = url
    imageLoadErrors.value[keyframeId] = false
  } catch (error) {
    console.error("Failed to load image:", error)
    imageLoadErrors.value[keyframeId] = true
  }
}

const showOriginalImage = async (keyframeId: number) => {
  try {
    const blob = await getImage(keyframeId, false)
    const url = URL.createObjectURL(blob)

    // 创建图片预览元素
    const img = document.createElement("img")
    img.src = url
    img.style.maxWidth = "90vw"
    img.style.maxHeight = "90vh"
    img.style.objectFit = "contain"

    // 创建遮罩层
    const overlay = document.createElement("div")
    overlay.style.position = "fixed"
    overlay.style.top = "0"
    overlay.style.left = "0"
    overlay.style.width = "100vw"
    overlay.style.height = "100vh"
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)"
    overlay.style.display = "flex"
    overlay.style.justifyContent = "center"
    overlay.style.alignItems = "center"
    overlay.style.zIndex = "9999"
    overlay.style.cursor = "pointer"

    // 点击关闭预览
    overlay.onclick = () => {
      document.body.removeChild(overlay)
      URL.revokeObjectURL(url)
    }

    overlay.appendChild(img)
    document.body.appendChild(overlay)
  } catch (error) {
    console.error("Failed to load original image:", error)
    ElMessage.error("加载原图失败")
  }
}

// 修改函数名避免冲突
const drawBoundingBoxesForFrame = (keyframeId: number) => {
  const imgElement = imgRefs.value[keyframeId]
  if (!imgElement) return

  const canvas = document.getElementById(`canvas-${keyframeId}`) as HTMLCanvasElement
  if (!canvas) return
  
  // 设置canvas尺寸与图片显示尺寸一致
  const container = imgElement.parentElement
  if (!container) return
  
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // 获取当前关键帧
  const keyframe = keyframes.value.find(k => k.id === keyframeId)
  if (!keyframe) return
  
  // 计算图片在容器中的实际显示尺寸
  const imgAspect = 512 / 288 // 使用已知图片尺寸
  const containerAspect = container.clientWidth / container.clientHeight
  
  let displayWidth, displayHeight, offsetX, offsetY
  
  if (imgAspect > containerAspect) {
    // 宽度撑满容器
    displayWidth = container.clientWidth
    displayHeight = container.clientWidth / imgAspect
    offsetX = 0
    offsetY = (container.clientHeight - displayHeight) / 2
  } else {
    // 高度撑满容器
    displayHeight = container.clientHeight
    displayWidth = container.clientHeight * imgAspect
    offsetX = (container.clientWidth - displayWidth) / 2
    offsetY = 0
  }
  
 
  drawBoundingBoxes(ctx, keyframe.detections, {
    displayWidth,
    displayHeight,
    offsetX,
    offsetY
  }) 
}

// 添加图片加载处理
const handleImageLoad = (keyframeId: number, event: Event) => {
  const img = event.target as HTMLImageElement
  imgRefs.value[keyframeId] = img
  nextTick(() => {
    drawBoundingBoxesForFrame(keyframeId) // 使用新函数名
  })
}

// 添加窗口大小变化监听
window.addEventListener('resize', () => {
  keyframes.value.forEach(keyframe => {
    drawBoundingBoxesForFrame(keyframe.id) // 使用新函数名
  })
})

onMounted(() => {
  const end = new Date()
  const start = new Date()
  start.setTime(start.getTime() - 3600 * 1000 * 24)
  timeRange.value = [start, end]
  handleTimeRangeChange()
  startRealtimeSubscription()
  
  // 预加载图片
  keyframes.value.forEach(keyframe => {
    getImageUrl(keyframe.id)
  })
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', () => {
    keyframes.value.forEach(keyframe => {
      drawBoundingBoxesForFrame(keyframe.id)
    })
  })
})

// 监听 keyframes 变化，加载新图片
watch(keyframes, (newKeyframes) => {
  newKeyframes.forEach(keyframe => {
    if (!imageUrls.value[keyframe.id]) {
      getImageUrl(keyframe.id)
    }
  })
})

onUnmounted(() => {
  stopRealtimeSubscription()
  // 清理图片缓存
  imageCache.forEach(url => URL.revokeObjectURL(url))
  imageCache.clear()
  
  // 移除窗口大小变化监听
  window.removeEventListener('resize', () => {
    keyframes.value.forEach(keyframe => {
      drawBoundingBoxesForFrame(keyframe.id)
    })
  })
})
</script>

<style scoped>
.detection-container {
  padding: 20px;
}

.time-range-selector {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-controls {
  display: flex;
  align-items: center;
}

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

.detection-card {
  transition: all 0.3s ease;
}

.detection-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.detection-header {
  margin-bottom: 12px;
}

.detection-time {
  font-size: 14px;
  color: #606266;
}

.detection-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detection-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.detection-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.probability {
  font-size: 12px;
  color: #606266;
}

.detection-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.3s ease;
  position: relative;
  background-color: #f5f7fa;
  display: flex;
  justify-content: center;
  align-items: center;
}

.detection-image:hover {
  transform: scale(1.02);
}

.image-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.bounding-box-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.detection-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.detection-image img.image-error {
  display: none;
}

.image-error-message {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #909399;
  background-color: #f5f7fa;
}

.image-error-message .el-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.image-error-message span {
  font-size: 14px;
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.no-data-message {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style> 