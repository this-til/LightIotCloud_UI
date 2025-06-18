<template>
  <div class="common-layout">
    <!-- 顶部导航栏 -->
    <el-header height="70px" class="common-header">
      <div class="header-content">
        <div class="logo-section">
          <el-icon class="logo-icon" size="28">
            <Cpu />
          </el-icon>
          <h1 class="title">分布式数据采集服务系统</h1>
        </div>
        <div class="header-actions">
          <el-badge :value="3" class="notification-badge">
            <el-button circle size="large" class="action-btn">
              <el-icon size="18">
                <Message />
              </el-icon>
            </el-button>
          </el-badge>
          <el-button circle size="large" class="action-btn">
            <el-icon size="18">
              <Setting />
            </el-icon>
          </el-button>
        </div>
      </div>
    </el-header>

    <el-container class="common-container">
      <!-- 侧边栏 -->
      <el-aside width="240px" class="sidebar">
        <div class="sidebar-content">
          <el-menu
            class="sidebar-menu"
            :default-active="activeMenu"
            background-color="transparent"
            text-color="#64748b"
            active-text-color="#3b82f6"
          >
            <el-sub-menu index="1" class="menu-group">
              <template #title>
                <div class="menu-title">
                  <el-icon class="menu-icon">
                    <Cpu />
                  </el-icon>
                  <span class="menu-text">设备管理</span>
                </div>
              </template>

              <el-menu-item
                index="/deviceList/LIGHT"
                @click="displayAllLight"
                class="menu-item"
              >
                <div class="submenu-item">
                  <div class="item-indicator"></div>
                  <span>智能灯杆</span>
                  <el-badge :value="12" size="small" class="item-badge" />
                </div>
              </el-menu-item>

              <el-menu-item
                index="/deviceList/CAR"
                @click="displayAllCar"
                class="menu-item"
              >
                <div class="submenu-item">
                  <div class="item-indicator"></div>
                  <span>巡检小车</span>
                  <el-badge :value="8" size="small" class="item-badge" />
                </div>
              </el-menu-item>

              <el-menu-item
                index="/deviceList/UAV"
                class="menu-item"
                @click="displayAllUav"
              >
                <div class="submenu-item">
                  <div class="item-indicator"></div>
                  <span>无人机</span>
                  <el-badge :value="5" size="small" class="item-badge" />
                </div>
              </el-menu-item>
            </el-sub-menu>

            <!-- 可以添加更多菜单项 -->
            <el-menu-item index="2" class="menu-item">
              <div class="menu-title">
                <el-icon class="menu-icon">
                  <IconMenu />
                </el-icon>
                <span class="menu-text">数据监控</span>
              </div>
            </el-menu-item>
          </el-menu>
        </div>
      </el-aside>

      <!-- 主内容区域 -->
      <el-container class="main-container">
        <el-main class="main-content">
          <div class="content-wrapper">
            <RouterView />
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from "vue"
import { Cpu, Menu as IconMenu, Message, Setting, Position } from "@element-plus/icons-vue"
import { RouterView, useRoute } from "vue-router"
import router from "@/router"
import { createDefWebSocketClient, getDefWebSocketClient, getToken, OnlineState, subscriptionDeviceOnlineStateSwitchEvent, unsubscribe, getDevices, DeviceType } from "@/util/Api"
import type { DeviceOnlineStateSwitchEvent } from "@/util/Api"
import { ElNotification } from "element-plus"
import { createClient } from "graphql-ws"
import type { Client } from "graphql-ws"

const route = useRoute()
const activeMenu = ref("1-1")

function displayAllLight() {
  activeMenu.value = "1-1"
  router.push({
    path: "/deviceList/LIGHT"
  })
}

function displayAllCar() {
  activeMenu.value = "1-2"
  router.push({
    path: "/deviceList/CAR"
  })
}

function displayAllUav() {
  activeMenu.value = "1-3"
  router.push({
    path: "/deviceList/UAV"
  })
}

let unsubscribeDeviceOnlineStateSwitchEvent: unsubscribe | null = null

onMounted(() => {

  if (getToken() === "") {
    console.log("the token is null, to login")
    router.push({
      path: "/"
    })
    return
  }

  if (!getDefWebSocketClient()) {
    createDefWebSocketClient()
  }
  

  unsubscribeDeviceOnlineStateSwitchEvent = subscriptionDeviceOnlineStateSwitchEvent(
    getDefWebSocketClient(),
    {
      next(value: DeviceOnlineStateSwitchEvent) {
        ElNotification(
          {
            type: value.onlineState === OnlineState.ONLINE
              ? "success"
              : "warning",
            title: value.onlineState === OnlineState.ONLINE
              ? "设备上线"
              : "设备离线",
            message: value.device.name
          }
        )
      },
      complete(): void {
      },
      error(error: unknown): void {
      }
    }
  )
})

onUnmounted(() => {
  if (unsubscribeDeviceOnlineStateSwitchEvent) {
    unsubscribeDeviceOnlineStateSwitchEvent()
    unsubscribeDeviceOnlineStateSwitchEvent = null
  }
})
</script>

<style scoped>
/* 全局布局 */
.common-layout {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

/* 顶部导航栏 */
.common-header {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  z-index: 1000;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 24px;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  color: #3b82f6;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  padding: 8px;
  border-radius: 12px;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
  transform: translateY(-1px);
}

.notification-badge {
  margin-right: 8px;
}

/* 主容器 */
.common-container {
  position: fixed;
  top: 70px;
  right: 0;
  bottom: 0;
  left: 0;
}

/* 侧边栏 */
.sidebar {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-right: 1px solid #e2e8f0;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.05);
}

.sidebar-content {
  padding: 20px 0;
  height: 100%;
}

.sidebar-menu {
  border: none;
  padding: 0 16px;
}

.menu-group {
  margin-bottom: 8px;
}

.menu-title {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.menu-icon {
  font-size: 18px;
  color: #64748b;
  transition: color 0.3s ease;
}

.menu-text {
  font-weight: 500;
  font-size: 14px;
}

.menu-item {
  margin: 4px 0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.menu-item:hover {
  background: rgba(59, 130, 246, 0.08);
}

.submenu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 4px 0;
}

.item-indicator {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #cbd5e1;
  transition: all 0.3s ease;
}

.menu-item.is-active .item-indicator {
  background: #3b82f6;
  transform: scale(1.5);
}

.item-badge {
  margin-left: auto;
}

/* 主内容区域 */
.main-container {
  background: transparent;
}

.main-content {
  overflow-y: auto;
}

/*.content-wrapper {
  background-color: #f5f7fa;
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  min-height: calc(100vh - 140px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}*/

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 60px !important;
  }

  .menu-text {
    display: none;
  }

  .title {
    font-size: 16px;
  }

  .header-content {
    padding: 0 16px;
  }
}

/* 滚动条样式 */
.main-content::-webkit-scrollbar {
  width: 6px;
}

.main-content::-webkit-scrollbar-track {
  background: transparent;
}

.main-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 动画效果 */
.menu-item {
  position: relative;
  overflow: hidden;
}

.menu-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent);
  transition: left 0.5s ease;
}

.menu-item:hover::before {
  left: 100%;
}
</style>