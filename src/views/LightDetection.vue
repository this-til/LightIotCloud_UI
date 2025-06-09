<template>
  <div class="detection-container">
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
      <el-select v-model="pageSize" class="size-selector" @change="handleTimeRangeChange">
        <el-option label="10条" :value="10" />
        <el-option label="20条" :value="20" />
        <el-option label="30条" :value="30" />
      </el-select>
    </div>

    <div v-loading="loading" class="detection-grid">
      <template v-if="keyframes.length > 0">
        <el-card v-for="keyframe in keyframes" :key="keyframe.id" class="detection-card">
          <div class="detection-header">
            <span class="detection-time">{{ new Date(keyframe.time).toLocaleString() }}</span>
          </div>
          <div class="detection-content">
            <div class="image-container">
              <img 
                :src="imageUrls[keyframe.id] ? (originalMode[keyframe.id] ? imageUrls[keyframe.id].original : imageUrls[keyframe.id].thumbnail) : '/placeholder.png'"
                :alt="'Detection at ' + keyframe.time"
                class="detection-image"
                @click="handlePreview(keyframe)"
              />
              <div v-for="detection in keyframe.detections" :key="detection.id" 
                   class="detection-box"
                   :style="{
                     left: (detection.x * 100) + '%',
                     top: (detection.y * 100) + '%',
                     width: (detection.w * 100) + '%',
                     height: (detection.h * 100) + '%'
                   }">
                <div class="detection-label">
                  {{ detection.item }} ({{ (detection.probability * 100).toFixed(1) }}%)
                </div>
              </div>
            </div>
            <div class="detection-info">
              <div v-for="detection in keyframe.detections" :key="detection.id" class="detection-item">
                <el-tag size="small" :type="getTagType(detection.probability)">
                  {{ detection.item }}
                </el-tag>
                <span class="probability">{{ (detection.probability * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </el-card>
      </template>
      <el-empty v-else description="暂无检测数据" />
    </div>

    <!-- Custom Preview Dialog -->
    <el-dialog
      v-model="previewVisible"
      :show-close="true"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      class="preview-dialog"
      @close="handleClosePreview"
    >
      <div v-if="currentPreviewKeyframe" class="preview-container">
        <div class="preview-image-wrapper">
          <img 
            :src="imageUrls[currentPreviewKeyframe.id]?.original || '/placeholder.png'"
            :alt="'Detection at ' + currentPreviewKeyframe.time"
            class="preview-image"
          />
          <div v-for="detection in currentPreviewKeyframe.detections" 
               :key="detection.id" 
               class="preview-detection-box"
               :style="{
                 left: (detection.x * 100) + '%',
                 top: (detection.y * 100) + '%',
                 width: (detection.w * 100) + '%',
                 height: (detection.h * 100) + '%'
               }">
            <div class="preview-detection-label">
              {{ detection.item }} ({{ (detection.probability * 100).toFixed(1) }}%)
            </div>
          </div>
        </div>
        <div class="preview-info">
          <div class="preview-time">
            {{ new Date(currentPreviewKeyframe.time).toLocaleString() }}
          </div>
          <div class="preview-detections">
            <div v-for="detection in currentPreviewKeyframe.detections" 
                 :key="detection.id" 
                 class="preview-detection-item">
              <el-tag size="small" :type="getTagType(detection.probability)">
                {{ detection.item }}
              </el-tag>
              <span class="probability">{{ (detection.probability * 100).toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { useRoute } from "vue-router"
import { getDetectionKeyframes, getImage } from "@/util/api"
import type { DetectionKeyframe, TimeRange, Light } from "@/util/api"
import { ElMessage } from "element-plus"

const props = defineProps<{
  light: Light
}>()

const route = useRoute()
const lightId = Number(route.query.id)
const keyframes = ref<DetectionKeyframe[]>([])
const timeRange = ref<[Date, Date] | null>(null)
const loading = ref(false)
const pageSize = ref(10)
const imageUrls = ref<Record<number, { thumbnail: string, original: string }>>({})
const originalMode = ref<Record<number, boolean>>({})
const previewVisible = ref(false)
const currentPreviewKeyframe = ref<DetectionKeyframe | null>(null)

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

const getTagType = (probability: number) => {
  if (probability >= 0.8) return 'success'
  if (probability >= 0.5) return 'warning'
  return 'info'
}

const loadImage = async (keyframeId: number) => {
  try {
    // Load thumbnail first
    const thumbnailBlob = await getImage(keyframeId, true)
    const thumbnailUrl = URL.createObjectURL(thumbnailBlob)
    
    // Load original image
    const originalBlob = await getImage(keyframeId, false)
    const originalUrl = URL.createObjectURL(originalBlob)
    
    imageUrls.value[keyframeId] = {
      thumbnail: thumbnailUrl,
      original: originalUrl
    }
    originalMode.value[keyframeId] = false
  } catch (error) {
    console.error("Failed to load image:", error)
    ElMessage.error("加载图片失败")
  }
}

const toggleImageMode = (keyframeId: number) => {
  originalMode.value[keyframeId] = !originalMode.value[keyframeId]
}

const handleTimeRangeChange = async () => {
  if (!timeRange.value) return

  loading.value = true
  try {
    const timeRangeParam: TimeRange = {
      start: new Date(timeRange.value[0].getTime() - timeRange.value[0].getTimezoneOffset() * 60000),
      end: new Date(timeRange.value[1].getTime() - timeRange.value[1].getTimezoneOffset() * 60000)
    }

    const data = await getDetectionKeyframes(lightId, {
      current: 1,
      size: pageSize.value
    }, timeRangeParam)
    
    // Sort keyframes by time in descending order (newest first)
    keyframes.value = data.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    
    // Load images for each keyframe
    for (const keyframe of keyframes.value) {
      await loadImage(keyframe.id)
    }
  } catch (error) {
    console.error("Failed to fetch detection data:", error)
    ElMessage.error("获取检测数据失败")
  } finally {
    loading.value = false
  }
}

const handlePreview = (keyframe: DetectionKeyframe) => {
  currentPreviewKeyframe.value = keyframe
  previewVisible.value = true
}

const handleClosePreview = () => {
  previewVisible.value = false
  currentPreviewKeyframe.value = null
}

onMounted(() => {
  const end = new Date()
  const start = new Date()
  start.setTime(start.getTime() - 3600 * 1000 * 24)
  timeRange.value = [start, end]
  handleTimeRangeChange()
})

// Clean up object URLs when component is unmounted
onUnmounted(() => {
  Object.values(imageUrls.value).forEach(urls => {
    URL.revokeObjectURL(urls.thumbnail)
    URL.revokeObjectURL(urls.original)
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
  gap: 16px;
  align-items: center;
}

.size-selector {
  width: 100px;
}

.detection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
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

.image-container {
  position: relative;
  width: 100%;
  padding-top: 75%; /* 4:3 Aspect Ratio */
  background-color: #f5f7fa;
  border-radius: 4px;
  overflow: hidden;
}

.detection-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 1;
  transition: transform 0.3s ease;
}

.detection-image:hover {
  transform: scale(1.02);
}

.detection-box {
  position: absolute;
  border: 2px solid #409eff;
  background-color: rgba(64, 158, 255, 0.1);
  pointer-events: none;
}

.detection-label {
  position: absolute;
  top: -20px;
  left: 0;
  background-color: #409eff;
  color: white;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
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

.cursor-zoom {
  cursor: zoom-in;
}

.preview-dialog {
  :deep(.el-dialog) {
    margin: 0 !important;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-dialog__body) {
    padding: 0;
    flex: 1;
    overflow: hidden;
  }
}

.preview-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #000;
}

.preview-image-wrapper {
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-info {
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
}

.preview-time {
  font-size: 14px;
  margin-bottom: 8px;
  color: #909399;
}

.preview-detections {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-detection-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.preview-detection-box {
  position: absolute;
  border: 2px solid #409eff;
  background-color: rgba(64, 158, 255, 0.1);
  pointer-events: none;
}

.preview-detection-label {
  position: absolute;
  top: -24px;
  left: 0;
  background-color: #409eff;
  color: white;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 14px;
  white-space: nowrap;
  pointer-events: none;
}

.probability {
  font-size: 12px;
  color: #909399;
}
</style> 