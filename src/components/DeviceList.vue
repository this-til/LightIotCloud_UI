<template>
  <div class="device-list-container">
    <div class="header">
      <h1 class="title">智能灯杆设备管理</h1>
      <div class="stats">
        <el-statistic title="总设备数" :value="deviceList.length" />
        <el-statistic title="在线设备" :value="onlineDeviceCount" class="ml-8" />
        <el-statistic title="离线设备" :value="offlineDeviceCount" class="ml-8" />
      </div>
    </div>

    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索设备编号..."
        prefix-icon="Search"
        clearable
        class="search-input"
      />
      <el-select v-model="statusFilter" placeholder="筛选状态" clearable class="ml-4">
        <el-option label="全部" value="" />
        <el-option label="在线" value="online" />
        <el-option label="离线" value="offline" />
      </el-select>
    </div>

    <div class="table-container">
      <el-table
        :data="paginatedDeviceList"
        stripe
        highlight-current-row
        @row-click="handleRowClick"
        class="device-table"
        height="100%"
      >
        <el-table-column prop="deviceId" label="设备编号" width="200">
          <template #default="{ row }">
            <div class="device-id">
              <el-icon class="device-icon">
                <Monitor />
              </el-icon>
              <span>{{ row.id }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="deviceName" label="设备名称" min-width="180" />

        <el-table-column prop="status" label="在线状态" width="120">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'online' ? 'success' : 'danger'"
              :effect="row.status === 'online' ? 'light' : 'plain'"
            >
              <el-icon class="status-icon">
                <CircleCheckFilled v-if="row.status === 'online'" />
                <CircleCloseFilled v-else />
              </el-icon>
              {{ row.status === "online" ? "在线" : "离线" }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="lastSeen" label="最后跟新时间" width="180">
          <template #default="{ row }">
            <div class="last-seen">
              <el-icon>
                <Clock />
              </el-icon>
              <span>{{ formatTime(row.lastSeen) }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click.stop="viewDetails(row)"
              :icon="View"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="filteredDeviceList.length"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { ElMessage } from "element-plus"
import {
  Monitor,
  CircleCheckFilled,
  CircleCloseFilled,
  Clock,
  View,
  Search
} from "@element-plus/icons-vue"
import { Device } from "@/util/api.js"

const props = defineProps<Props>()

interface Props {
  deviceList: Device[];
}

// 响应式数据
const searchQuery = ref("")
const statusFilter = ref("")
const currentPage = ref(1)
const pageSize = ref(20)


// 计算属性
const onlineDeviceCount = computed(() => {
  return props.deviceList.value.filter(device => device.status === "online").length
})

const offlineDeviceCount = computed(() => {
  return props.deviceList.value.filter(device => device.status === "offline").length
})

const filteredDeviceList = computed(() => {
  let filtered = props.deviceList.value

  // 按搜索查询过滤
  if (searchQuery.value) {
    filtered = filtered.filter(device =>
      device.deviceId.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      device.deviceName.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  // 按状态过滤
  if (statusFilter.value) {
    filtered = filtered.filter(device => device.status === statusFilter.value)
  }

  return filtered
})

const paginatedDeviceList = computed<Device[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredDeviceList.value.slice(start, end)
})

// 方法
const handleRowClick = (row) => {
  viewDetails(row)
}

const viewDetails = (device) => {
  // 这里可以使用 Vue Router 进行页面跳转
  // router.push(`/device/${device.deviceId}`)

  // 模拟跳转，实际项目中替换为真实的路由跳转
  ElMessage.success(`跳转到设备 ${device.deviceId} 的详细页面`)
  console.log("跳转到设备详情页面:", device)
}

const formatTime = (date) => {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}

const getTemperatureClass = (temperature) => {
  if (temperature > 30) return "temperature-high"
  if (temperature < 20) return "temperature-low"
  return "temperature-normal"
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

</script>

<style scoped>

.device-list-container {
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.stats {
  display: flex;
  align-items: center;
}

.search-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-input {
  width: 300px;
}

.table-container {
  flex-grow: 1;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.device-table {
  flex: 1;
}

.device-table :deep(.el-table__body-wrapper) {
  overflow-x: auto;
  overflow-y: auto;
}

.device-table {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.device-table :deep(.el-table__row) {
  cursor: pointer;
  transition: background-color 0.2s;
}

.device-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

.device-id {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-icon {
  color: #409eff;
}

.status-icon {
  margin-right: 4px;
}

.last-seen {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #606266;
}

.temperature-high {
  color: #f56c6c;
  font-weight: 600;
}

.temperature-low {
  color: #409eff;
  font-weight: 600;
}

.temperature-normal {
  color: #67c23a;
  font-weight: 600;
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ml-4 {
  margin-left: 16px;
}

.ml-8 {
  margin-left: 32px;
}
</style>