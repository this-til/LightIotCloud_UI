<template>
  <div class="dashboard-container">
    <!-- 侧边数据统计栏 -->
    <div class="stats-sidebar">
      <h3 class="sidebar-title">系统概览</h3>
      
      <!-- 设备统计 -->
      <div class="stats-section">
        <h4 class="section-title">设备状态</h4>
        <div class="stats-cards">
          <div class="stat-card total">
            <div class="stat-icon">
              <el-icon><Monitor /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ deviceStats.total }}</div>
              <div class="stat-label">注册设备</div>
            </div>
          </div>
          
          <div class="stat-card online">
            <div class="stat-icon">
              <el-icon><VideoPlay /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ deviceStats.online }}</div>
              <div class="stat-label">在线设备</div>
            </div>
          </div>
          
          <div class="stat-card offline">
            <div class="stat-icon">
              <el-icon><VideoPause /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ deviceStats.offline }}</div>
              <div class="stat-label">离线设备</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 消息统计 -->
      <div class="stats-section">
        <h4 class="section-title">消息统计</h4>
        <div class="stats-cards">
          <div class="stat-card messages">
            <div class="stat-icon">
              <el-icon><ChatDotSquare /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ messageStats.total }}</div>
              <div class="stat-label">当日消息</div>
            </div>
          </div>
          
          <div class="stat-card alerts">
            <div class="stat-icon">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ messageStats.alerts }}</div>
              <div class="stat-label">异常上报</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 实时状态 -->
      <div class="stats-section">
        <h4 class="section-title">实时监控</h4>
        <div class="status-indicators">
          <div class="status-item">
            <span class="status-dot online"></span>
            <span class="status-text">系统运行正常</span>
          </div>
          <div class="status-item">
            <span class="status-dot"></span>
            <span class="status-text">WebSocket 已连接</span>
          </div>
          <div class="status-item">
            <span class="status-dot" :class="{ online: lastUpdateTime }"></span>
            <span class="status-text">
              {{ lastUpdateTime ? `最后更新: ${formatTime(lastUpdateTime)}` : '等待数据...' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 设备状态分布面板 -->
    <div class="stats-sidebar right-panel">
      <h3 class="sidebar-title">设备状态分布</h3>
      
      <!-- 在线设备状态 -->
      <div class="stats-section">
        <h4 class="section-title">在线状态</h4>
        <div class="stats-cards">
          <div class="stat-card online">
            <div class="stat-icon">
              <el-icon><VideoPlay /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ deviceStats.online }}</div>
              <div class="stat-label">在线设备 ({{ onlinePercentage.toFixed(1) }}%)</div>
            </div>
          </div>
          
          <div class="stat-card offline">
            <div class="stat-icon">
              <el-icon><VideoPause /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ deviceStats.offline }}</div>
              <div class="stat-label">离线设备 ({{ offlinePercentage.toFixed(1) }}%)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 设备类型分布 -->
      <div class="stats-section">
        <h4 class="section-title">设备类型</h4>
        <div class="stats-cards">
          <div class="stat-card total">
            <div class="stat-icon">
              <el-icon><Sunny /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ Math.floor(deviceStats.total * 0.6) }}</div>
              <div class="stat-label">智能灯杆</div>
            </div>
          </div>
          
          <div class="stat-card total">
            <div class="stat-icon">
              <el-icon><Van /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ Math.floor(deviceStats.total * 0.3) }}</div>
              <div class="stat-label">巡检小车</div>
            </div>
          </div>
          
          <div class="stat-card total">
            <div class="stat-icon">
              <el-icon><Connection /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ Math.floor(deviceStats.total * 0.1) }}</div>
              <div class="stat-label">无人机</div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Monitor, 
  VideoPlay, 
  VideoPause, 
  ChatDotSquare, 
  Warning,
  Sunny,
  Van,
  Connection
} from '@element-plus/icons-vue'
import { 
  getDefWebSocketClient,
  subscriptionDeviceOnlineStateSwitchEvent,
  OnlineState
} from '@/util/Api'

const router = useRouter()

// 统计数据
const deviceStats = ref({
  total: 0,
  online: 0,
  offline: 0
})

const messageStats = ref({
  total: 0,
  alerts: 0
})

const lastUpdateTime = ref(null)
const recentLogs = ref([])

// 计算百分比
const onlinePercentage = computed(() => {
  if (deviceStats.value.total === 0) return 0
  return (deviceStats.value.online / deviceStats.value.total) * 100
})

const offlinePercentage = computed(() => {
  if (deviceStats.value.total === 0) return 0
  return (deviceStats.value.offline / deviceStats.value.total) * 100
})

// 导航函数
const navigateTo = (path) => {
  router.push(path)
}

// 时间格式化
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getCurrentTime = () => {
  return new Date().toLocaleTimeString('zh-CN', {
    hour12: false
  })
}

// 添加日志
const addLog = (message) => {
  recentLogs.value.unshift({
    id: Date.now(),
    time: Date.now(),
    message
  })
  // 只保留最近10条
  if (recentLogs.value.length > 10) {
    recentLogs.value.pop()
  }
}

// 模拟数据获取
const loadStatistics = async () => {
  try {
    // 这里应该调用真实的API获取统计数据
    // 现在使用模拟数据
    deviceStats.value = {
      total: 42,
      online: 35,
      offline: 7
    }
    
    messageStats.value = {
      total: 1248,
      alerts: 3
    }
    
    lastUpdateTime.value = Date.now()
    addLog('系统统计数据已更新')
  } catch (error) {
    console.error('Failed to load statistics:', error)
    addLog('统计数据加载失败')
  }
}

// WebSocket 订阅
let unsubscribeDeviceState = null

onMounted(async () => {
  // 初始加载统计数据
  await loadStatistics()
  
  // 订阅设备状态变化
  const client = getDefWebSocketClient()
  if (client) {
    unsubscribeDeviceState = subscriptionDeviceOnlineStateSwitchEvent(client, {
      next: (value) => {
        if (value.onlineState === OnlineState.ONLINE) {
          deviceStats.value.online++
          deviceStats.value.offline--
          addLog(`设备 ${value.device.name} 上线`)
        } else {
          deviceStats.value.online--
          deviceStats.value.offline++
          addLog(`设备 ${value.device.name} 离线`)
        }
        lastUpdateTime.value = Date.now()
      },
      error: (error) => {
        console.error('Device state subscription error:', error)
        addLog('设备状态监听异常')
      }
    })
  }
  
  // 定时更新统计数据
  const interval = setInterval(() => {
    loadStatistics()
  }, 30000) // 每30秒更新一次
  
  // 清理定时器
  onUnmounted(() => {
    clearInterval(interval)
    if (unsubscribeDeviceState) {
      unsubscribeDeviceState()
    }
  })
})
</script>

<style scoped>
.dashboard-container {
  display: flex;
  height: 100%;
  gap: 24px;
  justify-content: space-between;
}

/* ================= 侧边统计栏 ================= */
.stats-sidebar {
  width: 320px;
  background: rgba(10, 15, 30, 0.95);
  border: 1px solid #06f6f1;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 0 20px rgba(6, 246, 241, 0.3);
  overflow-y: auto;
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.stats-sidebar::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.sidebar-title {
  color: #00ffff;
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 24px 0;
  text-align: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(6, 246, 241, 0.3);
}

.stats-section {
  margin-bottom: 32px;
}

.section-title {
  color: #8fe8ff;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  padding-left: 8px;
  border-left: 3px solid #00ffea;
}

.stats-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(0, 255, 234, 0.1);
  border: 1px solid rgba(0, 255, 234, 0.3);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: rgba(0, 255, 234, 0.15);
  box-shadow: 0 0 12px rgba(0, 255, 234, 0.4);
  transform: translateY(-2px);
}

.stat-icon {
  margin-right: 12px;
  font-size: 24px;
  color: #00ffea;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #8fe8ff;
  margin-top: 4px;
}

.stat-card.total .stat-icon { color: #00d8ff; }
.stat-card.online .stat-icon { color: #00e676; }
.stat-card.offline .stat-icon { color: #ff5252; }
.stat-card.messages .stat-icon { color: #ffab00; }
.stat-card.alerts .stat-icon { color: #ff6d00; }

/* 状态指示器 */
.status-indicators {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 255, 234, 0.05);
  border-radius: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
  margin-right: 12px;
  animation: pulse 2s infinite;
}

.status-dot.online {
  background: #00e676;
}

.status-text {
  font-size: 13px;
  color: #c8feff;
}

@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

/* ================= 右侧面板 ================= */
.right-panel {
  width: 300px;
  margin-left: auto;
}

/* ================= 活动日志 ================= */
.activity-logs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 250px;
  overflow-y: auto;
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.activity-logs::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.log-item {
  padding: 10px 12px;
  background: rgba(0, 255, 234, 0.05);
  border: 1px solid rgba(0, 255, 234, 0.2);
  border-radius: 6px;
  border-left: 3px solid rgba(0, 255, 234, 0.4);
  transition: all 0.3s ease;
}

.log-item:hover {
  background: rgba(0, 255, 234, 0.1);
  border-left-color: #00ffea;
}

.log-time {
  font-size: 11px;
  color: #00ffea;
  font-family: 'Courier New', monospace;
  margin-bottom: 4px;
}

.log-message {
  font-size: 12px;
  color: #c8feff;
  line-height: 1.4;
}

.log-message.no-logs {
  text-align: center;
  color: #666;
  font-style: italic;
}

/* ================= 快速操作 ================= */
.stat-card.quick-action {
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-card.quick-action:hover {
  background: rgba(0, 255, 234, 0.2);
  box-shadow: 0 0 15px rgba(0, 255, 234, 0.5);
  transform: translateY(-3px);
}

.stat-card.quick-action .stat-label {
  font-weight: 500;
  color: #ffffff;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .right-panel {
    width: 280px;
  }
}

@media (max-width: 1200px) {
  .dashboard-container {
    flex-direction: column;
  }
  
  .stats-sidebar, .right-panel {
    width: 100%;
  }
  
  .dashboard-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    gap: 16px;
  }
  
  .stats-sidebar, .right-panel {
    padding: 16px;
  }
  
  .stats-cards {
    gap: 8px;
  }
  
  .stat-card {
    padding: 12px;
  }
}
</style> 