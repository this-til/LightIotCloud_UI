<template>
  <div class="device-list-container">
    <!-- ========== 顶部 Header ========== -->
    <div class="header card-like">
      <!-- 左：标题 -->
      <div class="header-left">
        <h1 class="title">{{ props.title }}</h1>
      </div>
      <!-- 右：搜索 + 筛选 + 统计 -->
      <div class="header-right">
        <div class="search-controls">
          <el-input v-model="searchQuery" placeholder="搜索设备..." prefix-icon="Search" clearable class="search-input" />
          <el-select v-model="statusFilter" placeholder="筛选状态" clearable class="filter-select">
            <el-option label="全部" value="" />
            <el-option label="在线" value="online" />
            <el-option label="离线" value="offline" />
          </el-select>
        </div>
        <div class="stats">
          <div class="stat-item">
            <div class="stat-title">总设备数</div>
            <div class="stat-value">{{ deviceList.length }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-title">在线设备</div>
            <div class="stat-value">{{ onlineDeviceCount }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-title">离线设备</div>
            <div class="stat-value">{{ offlineDeviceCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="table-container card-like">
      <el-table :data="paginatedDeviceList" stripe :highlight-current-row="false" class="device-table" height="100%">
        <el-table-column prop="id" label="设备编号" width="200">
          <template #default="{ row }">
            <div class="device-id">
              <el-icon class="device-icon">
                <Monitor />
              </el-icon>
              <span>{{ row.id }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="设备名称" min-width="180" />

        <el-table-column prop="status" label="在线状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.online ? 'success' : 'danger'" :effect="row.online ? 'light' : 'plain'">
              <el-icon class="status-icon">
                <Connection v-if="row.online" />
                <SwitchButton v-else />
              </el-icon>
              {{ row.online ? "在线" : "离线" }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="updatedAt" label="最后跟新时间" width="320">
          <template #default="{ row }">
            <div class="last-seen">
              <el-icon>
                <Clock />
              </el-icon>
              <span>{{ formatTime(row.updatedAt) }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click.stop="props.viewDetails(row)" :icon="Operation">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination card-like">
      <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]"
        :total="filteredDeviceList.length" layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange" @current-change="handleCurrentChange" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { ElMessage } from "element-plus"
import {
  Monitor,
  Connection,
  SwitchButton,
  Clock,
  Operation,
  Search
} from "@element-plus/icons-vue"
import { formatDateTime } from '@/util/TimeFormat'

const props = defineProps({
  title: String,
  deviceList: Array,
  viewDetails: Function
})

// 响应式数据
const searchQuery = ref("")
const statusFilter = ref("")
const currentPage = ref(1)
const pageSize = ref(20)


// 计算属性
const onlineDeviceCount = computed(() => {
  return props.deviceList.filter(device => device.online).length
})

const offlineDeviceCount = computed(() => {
  return props.deviceList.filter(device => !device.online).length
})

const filteredDeviceList = computed(() => {
  let filtered = props.deviceList

  // 按搜索查询过滤
  if (searchQuery.value) {
    filtered = filtered.filter(device =>
      device.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      device.id.toString().toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  // 按状态过滤
  if (statusFilter.value) {
    const target = statusFilter.value === "online"
    filtered = filtered.filter(device => device.online == target)
  }

  return filtered
})

const paginatedDeviceList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredDeviceList.value.slice(start, end)
})

const formatTime = (date) => {
  return formatDateTime(date, 'datetime')
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

</script>

<!-- scoped：组件内部样式 --------------------------------------->
<style scoped>
/* ===== 总容器 ===== */
.device-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 12px 24px;
  overflow: hidden;
}

/* ===== 玻璃卡片基类 ===== */
.card-like {
  position: relative;
  z-index: 10;
  /* 盖过旋转背景 */
  background: rgba(0, 10, 20, 0.65);
  border: 1px solid rgba(0, 255, 234, 0.35);
  border-radius: 8px;
  backdrop-filter: blur(6px);
  box-shadow: 0 0 6px rgba(0, 255, 234, 0.25);
}

/* ===== Header 布局 ===== */
.header {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  padding: 12px 20px;
  gap: 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
  justify-content: flex-end;
}

.search-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: #00ffff;
  margin: 0;
}

/* ===== 统计卡片 ===== */
.stats {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(100px, 120px);
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 6px 12px;
  background: rgba(0, 255, 234, 0.12);
  border: 1px solid rgba(0, 255, 234, 0.6);
  border-radius: 6px;
  backdrop-filter: blur(4px);
  box-shadow:
    0 0 8px rgba(0, 255, 234, 0.4),
    inset 0 0 4px rgba(0, 255, 234, 0.2);
  transition: transform .2s, box-shadow .2s;
  gap: 8px;
}

.stat-item:hover {
  transform: translateY(-1px);
  box-shadow:
    0 0 12px rgba(0, 255, 234, 0.6),
    inset 0 0 6px rgba(0, 255, 234, 0.3);
}

.stat-title {
  font-size: 12px;
  color: #b2fbff;
  text-shadow: 0 0 6px rgba(0, 255, 234, .3);
  white-space: nowrap;
}

.stat-value {
  font-size: 18px;
  font-weight: 800;
  background: linear-gradient(90deg, #00ffff 0%, #00b4ff 100%);
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 8px rgba(0, 255, 234, .5);
  min-width: 24px;
  text-align: right;
}

/* ===== 搜索框 & 下拉外壳 ===== */
.search-input,
.filter-select {
  display: inline-block;
  width: 260px !important;
  /* 搜索框宽度 */
  background: rgba(0, 10, 20, 0.85) !important;
  border: 1px solid rgba(0, 255, 234, .5) !important;
  border-radius: 4px;
  padding: 2px;
  backdrop-filter: blur(4px);
  box-shadow: 0 0 6px rgba(0, 255, 234, .3);
}

.filter-select {
  min-width: 70px;
  width: 120px !important;
}

/* 额外约束 */

/* —— 内层 input / placeholder / 图标 —— */
.search-input :deep(input.el-input__inner),
.filter-select :deep(input.el-input__inner) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: #e0ffff !important;
}

.search-input :deep(input.el-input__inner::placeholder),
.filter-select :deep(input.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, .6) !important;
}

.search-input :deep(.el-input__suffix),
.search-input :deep(.el-input__prefix),
.filter-select :deep(.el-input__suffix),
.filter-select :deep(.el-input__prefix),
.filter-select :deep(.el-select__caret) {
  color: #e0ffff !important;
}

/* —— Element Plus wrapper（白底在这里） —— */
.search-input :deep(.el-input__wrapper),
.filter-select :deep(.el-input__wrapper),
.filter-select :deep(.el-select__wrapper) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

/* ===== 表格 ===== */
.table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 16px;
  overflow: hidden;
}

.device-table {
  flex: 1;
  background: transparent;
  --el-table-border-color: rgba(0, 255, 234, .25);
}

.device-table :deep(.el-table__row) {
  background: rgba(0, 0, 0, .08);
  transition: background-color .2s;
}

.device-table :deep(.el-table__row:hover),
.device-table :deep(.el-table__row--current) {
  background: rgba(0, 255, 234, .10);
}

/* ===== 分页 ===== */
.pagination {
  display: flex;
  justify-content: center;
  padding: 14px 0;
  margin-top: 16px;
}

.device-table :deep(.el-table__header-wrapper th) {
  background: rgba(0, 10, 20, 0.85) !important;
  /* 深蓝磨砂 */
  color: #8fe8ff !important;
  /* 亮青文字 */
  border-bottom: 1px solid rgba(0, 255, 234, .25) !important;
  /* 细霓虹下边线，跟卡片保持一致 */
}

/* 表头里的小 sort 图标 / resizable 线 */
.device-table :deep(.el-table__column-resize-handle),
.device-table :deep(.caret-wrapper) {
  color: #8fe8ff !important;
}

/* ========= 表体（tbody）文字 & 分隔线 ========= */
.device-table :deep(.el-table__row) .cell {
  color: #e0ffff !important;
  /* 更亮的白青色文字 */
}

/* 取消默认横向表格线，改成柔和霓虹线 */
.device-table :deep(.el-table__inner-wrapper)::before {
  background: rgba(0, 255, 234, 0.15) !important;
  /* 顶部线 */
}

.device-table :deep(.el-table__row) td {
  border-bottom: 1px solid rgba(0, 255, 234, 0.12) !important;
}

/* 表格行的hover状态 */
.device-table :deep(.el-table__row:hover),
.device-table :deep(.el-table__row:hover > td) {
  background: rgba(0, 255, 234, 0.08) !important;
  /* 8% 霓虹青遮罩 */
}

/* 表格行的当前选中状态 */
.device-table :deep(.el-table__row--current),
.device-table :deep(.el-table__row--current > td) {
  background: rgba(0, 255, 234, 0.12) !important;
  /* 稍微更亮的选中状态 */
}

/* 强制覆盖Element Plus的默认样式，防止白色背景 */
.device-table :deep(.el-table__row) {
  background: rgba(0, 0, 0, .08) !important;
}

.device-table :deep(.el-table__row) td {
  background: transparent !important;
}

/* 处理focus状态，避免白色遮罩 */
.device-table :deep(.el-table__row:focus),
.device-table :deep(.el-table__row:focus > td),
.device-table :deep(.el-table__row:focus-within),
.device-table :deep(.el-table__row:focus-within > td) {
  background: rgba(0, 255, 234, 0.08) !important;
  outline: none !important;
}

/* 处理active状态 */
.device-table :deep(.el-table__row:active),
.device-table :deep(.el-table__row:active > td) {
  background: rgba(0, 255, 234, 0.15) !important;
}

.pagination {
  /* 外层 card-like 已有背景，这里做补充 */
  gap: 16px;
  /* 各子块拉开一点距离 */
  color: #8fe8ff;
  /* "Total …" 文字 */
  font-weight: 500;
}

/* —— page-size 下拉框（Element Select） —— */
.pagination :deep(.el-select .el-select__wrapper) {
  background: rgba(0, 10, 20, .85) !important;
  border: 1px solid rgba(0, 255, 234, .5) !important;
  border-radius: 4px;
  box-shadow: 0 0 6px rgba(0, 255, 234, .3);
}

.pagination :deep(.el-select__placeholder),
.pagination :deep(.el-select .el-select__caret) {
  color: #e0ffff !important;
}

/* —— pager 数字按钮 —— */
.pagination :deep(.el-pager li) {
  min-width: 34px;
  height: 28px;
  line-height: 28px;
  margin: 0 2px;
  background: transparent;
  border: 1px solid rgba(0, 255, 234, .35);
  border-radius: 4px;
  color: #8fe8ff;
  transition: all .2s;
}

.pagination :deep(.el-pager li:hover),
.pagination :deep(.el-pager li.is-active) {
  background: rgba(0, 255, 234, .15);
  color: #ffffff;
  border-color: rgba(0, 255, 234, .7);
  box-shadow: 0 0 6px rgba(0, 255, 234, .4);
}

/* —— 前后翻箭头 —— */
.pagination :deep(button.btn-prev),
.pagination :deep(button.btn-next) {
  background: transparent;
  border: 1px solid rgba(0, 255, 234, .35);
  border-radius: 4px;
  width: 34px;
  height: 28px;
  color: #8fe8ff;
  transition: all .2s;
}

.pagination :deep(button.btn-prev:hover),
.pagination :deep(button.btn-next:hover) {
  background: rgba(0, 255, 234, .15);
  color: #ffffff;
  border-color: rgba(0, 255, 234, .7);
  box-shadow: 0 0 6px rgba(0, 255, 234, .4);
}

/* —— 跳转输入框 —— */
.pagination :deep(.el-input__wrapper) {
  background: rgba(0, 10, 20, .85) !important;
  border: 1px solid rgba(0, 255, 234, .5) !important;
  border-radius: 4px;
  box-shadow: 0 0 6px rgba(0, 255, 234, .3);
}

.pagination :deep(input.el-input__inner) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: #e0ffff !important;
}

.pagination :deep(input.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, .6) !important;
}

.device-table :deep(.el-table__row--striped),
.device-table :deep(.el-table__row--striped > td) {
  background: rgba(0, 0, 0, 0.08) !important;
  /* 同普通行 */
  color: #e0ffff !important;
  /* 文字保持亮青白 */
}

/* 修复可能的白色背景问题 */
.device-table :deep(.el-table__body-wrapper),
.device-table :deep(.el-table__body),
.device-table :deep(.el-table__body tbody) {
  background: transparent !important;
}

/* 强制覆盖所有可能的白色背景 */
.device-table :deep(.el-table__row--striped:hover),
.device-table :deep(.el-table__row--striped:hover > td) {
  background: rgba(0, 255, 234, 0.08) !important;
}

.device-table :deep(.el-table__row--striped.el-table__row--current),
.device-table :deep(.el-table__row--striped.el-table__row--current > td) {
  background: rgba(0, 255, 234, 0.12) !important;
}

/* 清除表格点击后的选中效果 */
.device-table :deep(.el-table__row.el-table__row--current) {
  background: rgba(0, 255, 234, 0.12) !important;
}

/* 防止点击后的focus导致的白色背景 */
.device-table :deep(.el-table__body tr) {
  background: transparent !important;
}

/* ===== 状态图标科技风格 ===== */
.status-icon {
  margin-right: 6px;
  animation: pulse-glow 2s infinite ease-in-out;
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

/* 在线状态特殊效果 */
.device-table :deep(.el-tag--success .status-icon) {
  color: #00ff88 !important;
  filter: drop-shadow(0 0 4px rgba(0, 255, 136, 0.6));
}

/* 离线状态特殊效果 */
.device-table :deep(.el-tag--danger .status-icon) {
  color: #ff4757 !important;
  filter: drop-shadow(0 0 4px rgba(255, 71, 87, 0.6));
  animation: none;
}

/* ===== 状态图标科技风格 ===== */
.status-icon {
  margin-right: 6px;
  animation: pulse-glow 2s infinite ease-in-out;
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

/* 在线状态特殊效果 */
.device-table :deep(.el-tag--success .status-icon) {
  color: #00ff88 !important;
  filter: drop-shadow(0 0 4px rgba(0, 255, 136, 0.6));
}

/* 离线状态特殊效果 */
.device-table :deep(.el-tag--danger .status-icon) {
  color: #ff4757 !important;
  filter: drop-shadow(0 0 4px rgba(255, 71, 87, 0.6));
  animation: none;
}
</style>

<!-- 全局：下拉弹层样式（teleport 到 body） ---------------------->
<style>
/* 弹出的下拉面板 */
.el-select__popper .el-select-dropdown {
  background: rgba(0, 10, 20, 0.85) !important;
  border: 1px solid rgba(0, 255, 234, 0.5) !important;
  border-radius: 6px;
  backdrop-filter: blur(4px);
  box-shadow: 0 0 8px rgba(0, 255, 234, 0.35);
}

/* 下拉项文字 & 悬停 */
.el-select__popper .el-select-dropdown__item {
  color: #b2fbff;
  transition: background-color 0.2s;
}

.el-select__popper .el-select-dropdown__item:hover,
.el-select__popper .el-select-dropdown__item.is-hovering,
.el-select__popper .el-select-dropdown__item.selected {
  background: rgba(0, 255, 234, 0.12) !important;
  color: #ffffff !important;
}
</style>
