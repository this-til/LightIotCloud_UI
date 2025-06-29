<template>
  <div class="detection-container sci-fi">
    <div class="detection-container">
      <div class="time-range-selector">
        <div class="left-controls">
          <el-switch v-model="realtimeEnabled" active-text="实时更新" @change="handleRealtimeToggle" />
        </div>
        <div class="right-controls">
          <template v-if="!realtimeEnabled">
            <el-date-picker v-model="timeRange" type="datetimerange" range-separator="至" start-placeholder="开始时间"
              end-placeholder="结束时间" :shortcuts="timeShortcuts" @change="handleTimeRangeChange" />
          </template>
        </div>
      </div>

      <div v-loading="loading" class="detection-grid">
        <template v-if="keyframes.length > 0">
          <el-card v-for="keyframe in keyframes" :key="keyframe.id" class="detection-card">
            <div class="detection-header">
              <span class="detection-time">{{ formatDateTime(keyframe.time) }}</span>
            </div>
            <div class="detection-content">

              <div class="detection-image" @click="showOriginalImage(keyframe.id)">
                <div class="image-container">
                  <img v-if="!imageLoadErrors[keyframe.id]" :src="imageUrls[keyframe.id]" alt="Detection" ref="imgRef"
                    @load="handleImageLoad(keyframe.id, $event)" />
                  <canvas :id="`canvas-${keyframe.id}`" class="bounding-box-canvas"></canvas>
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
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 30]"
          :total="totalCount" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
          @current-change="handleCurrentChange" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue"
import { useRoute } from "vue-router"
import { getDetectionKeyframes, subscriptionLightDetectionReportEvent, getDefWebSocketClient, getDetectionKeyframeCount, getImage } from "@/util/Api"
import { ElMessage } from "element-plus"
import { Picture } from "@element-plus/icons-vue"
import { getColorPreset } from "@/util/ColorPreset"
import { nextTick } from "vue"
import { drawBoundingBoxes } from '@/util/DrawBoundingBoxes'
import { formatDateTime } from '@/util/TimeFormat'

const props = defineProps({
  device: Object
})

const route = useRoute()
const keyframes = ref([])
const timeRange = ref(null)
const loading = ref(false)
const pageSize = ref(10)
const realtimeEnabled = ref(true)
const currentPage = ref(1)
const totalCount = ref(0)
let unsubscribe = null

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

const imageCache = new Map()
const imageUrls = ref({})
const imageLoadErrors = ref({})

// 存储图片引用
const imgRefs = ref({})
const handleTimeRangeChange = async () => {
  if (!timeRange.value) return

  loading.value = true
  try {
    const timeRangeParam = {
      start: new Date(timeRange.value[0].getTime() - timeRange.value[0].getTimezoneOffset() * 60000),
      end: new Date(timeRange.value[1].getTime() - timeRange.value[1].getTimezoneOffset() * 60000)
    }

    // 获取总帧数
    totalCount.value = await getDetectionKeyframeCount(props.device.id, timeRangeParam)

    // 获取分页数据
    const data = await getDetectionKeyframes(props.device.id, {
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

const handleRealtimeToggle = (value) => {
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
    props.device.id,
    {
      next: async (keyframe) => {
        // 检查是否已存在相同ID的数据，避免重复
        const existingIndex = keyframes.value.findIndex(k => k.id === keyframe.id)
        if (existingIndex === -1) {
          // 新数据插入到开头（按时间降序）
          keyframes.value.unshift(keyframe)
          
          // 保持数据量在合理范围内
          if (keyframes.value.length > pageSize.value * 2) {
            keyframes.value = keyframes.value.slice(0, pageSize.value)
          }
          
          totalCount.value++
          
          // 主动加载新图片
          await getImageUrl(keyframe.id)
        }
      },
      error: (error) => {
        console.error("Detection subscription error:", error)
        ElMessage.error("实时更新连接错误")
        // 只在连接错误时自动关闭，不强制修改用户设置
        if (realtimeEnabled.value) {
          realtimeEnabled.value = false
        }
      },
      complete: () => {
        console.log("Detection subscription completed")
        // 订阅完成时不强制关闭，保持用户设置
      }
    }
  )
}

const stopRealtimeSubscription = () => {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  
  // 清空当前的实时数据
  keyframes.value = []
  totalCount.value = 0
  
  // 关闭实时更新后，自动加载历史数据
  if (timeRange.value) {
    handleTimeRangeChange()
  }
}

const handleSizeChange = async (val) => {
  pageSize.value = val
  currentPage.value = 1
  if (!realtimeEnabled.value) {
    await handleTimeRangeChange()
  }
}

const handleCurrentChange = async (val) => {
  currentPage.value = val
  if (!realtimeEnabled.value) {
    await handleTimeRangeChange()
  }
}

const getImageUrl = async (keyframeId) => {
  if (imageCache.has(keyframeId)) {
    imageUrls.value[keyframeId] = imageCache.get(keyframeId)
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

const showOriginalImage = async (keyframeId) => {
  try {
    // 1. 拿到 blob 和 URL
    const blob = await getImage(keyframeId, false)
    const url = URL.createObjectURL(blob)

    // 2. 找到对应的 keyframe，拿到 detections
    const keyframe = keyframes.value.find(k => k.id === keyframeId)
    if (!keyframe) throw new Error('找不到 keyframe 数据')

    // 3. 创建弹层
    const overlay = document.createElement("div")
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: "9999",
      cursor: "pointer"
    })
    // 4. 一个相对定位的容器，里面放 img + canvas
    const wrapper = document.createElement("div")
    wrapper.style.position = "relative"
    wrapper.onclick = () => {
      document.body.removeChild(overlay)
      URL.revokeObjectURL(url)
    }

    // 5. 原图 img
    const img = new Image()
    img.src = url
    img.style.maxWidth = "90vw"
    img.style.maxHeight = "90vh"
    img.style.objectFit = "contain"
    wrapper.appendChild(img)

    // 6. 等 img 加载完后，根据它的自然大小和展示大小来画框
    img.onload = () => {
      // 原图在 wrapper 中的实际显示尺寸
      const displayWidth = img.clientWidth
      const displayHeight = img.clientHeight

      // 创建 canvas 覆盖在 img 上面
      const canvas = document.createElement("canvas")
      canvas.width = displayWidth
      canvas.height = displayHeight
      Object.assign(canvas.style, {
        position: "absolute",
        top: img.offsetTop + "px",
        left: img.offsetLeft + "px",
        pointerEvents: "none"   // 让点击穿透到 wrapper
      })
      wrapper.appendChild(canvas)

      const ctx = canvas.getContext("2d")
      // drawBoundingBoxes(ctx, detections, opts) 就是你原来那个工具
      drawBoundingBoxes(ctx, keyframe.detections, {
        displayWidth,
        displayHeight,
        offsetX: 0,
        offsetY: 0
      })
    }

    overlay.appendChild(wrapper)
    document.body.appendChild(overlay)
  } catch (error) {
    console.error("Failed to load original image:", error)
    ElMessage.error("加载原图失败")
  }
}


// 修改函数名避免冲突
const drawBoundingBoxesForFrame = (keyframeId) => {
  const imgElement = imgRefs.value[keyframeId]
  if (!imgElement) return

  const canvas = document.getElementById(`canvas-${keyframeId}`)
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
const handleImageLoad = (keyframeId, event) => {
  const img = event.target
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

onMounted(async () => {
  const end = new Date()
  const start = new Date()
  start.setTime(start.getTime() - 3600 * 1000 * 24)
  timeRange.value = [start, end]
  
  // 无论是否开启实时更新，都先加载历史数据
  await handleTimeRangeChange()
  
  // 如果实时更新开启，则在加载历史数据后启动订阅
  if (realtimeEnabled.value) {
    startRealtimeSubscription()
  }

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
.sci-fi {
  background: rgba(0, 0, 0, .45);
}

/* ===== Element Plus Switch ===== */
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

/* ===== 日期选择器 ===== */
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

/* ===== 分页组件 ===== */
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

/* 上/下一页按钮 */
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

/* page-size & jump 输入框 */
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

/* ===== Detection 卡片&布局 ===== */
.detection-container {
  padding: 20px;
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

/* ===== 通用 Detection 样式（非科幻） ===== */
.detection-card {
  transition: all .3s ease;
}

.detection-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, .1);
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
  background: #f5f7fa;
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
  transition: transform .3s ease;
  position: relative;
  background: #f5f7fa;
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
  background: #f5f7fa;
}

.image-error-message .el-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: rgba(20, 25, 45, .95);
  border: 1px solid #06f6f1;
  box-shadow: 0 0 8px #06f6f1;
  border-radius: 8px;
  margin-top: 20px;
}

.no-data-message {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>
