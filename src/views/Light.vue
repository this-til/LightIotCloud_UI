<template>
  <el-container class="light-detail-container">
    <el-header class="header">
      <el-menu
        mode="horizontal"
        class="header-menu"
        :ellipsis="false"
      >
        <el-menu-item index="1" @click="goBack">
          <el-icon>
            <Back />
          </el-icon>
          返回
        </el-menu-item>
        <el-menu-item index="status" @click="handleSelect('status')">当前状态</el-menu-item>
        <el-menu-item index="history" @click="handleSelect('history')">历史数据</el-menu-item>
        <el-menu-item index="detection" @click="handleSelect('detection')">检测结果</el-menu-item>
        <el-menu-item index="monitor" @click="handleSelect('monitor')">实时监控</el-menu-item>
        <el-menu-item index="chat" @click="handleSelect('chat')">实时对话</el-menu-item>
        <div class="flex-grow" />
        <div class="header-right">
          <h1 class="title">{{ light.name }}</h1>
          <el-tag :type="light.online ? 'success' : 'danger'" :effect="light.online ? 'light' : 'plain'" size="large">
            <el-icon class="status-icon">
              <CircleCheckFilled v-if="light.online" />
              <CircleCloseFilled v-else />
            </el-icon>
            {{ light.online ? "在线" : "离线" }}
          </el-tag>
        </div>
      </el-menu>
    </el-header>

    <el-main>
      <RouterView :light="light" />
    </el-main>

  </el-container>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue"
import { computedActivateLight, getLightById } from "@/util/Api"
import type { Device } from "@/util/Api"
import { RouterView, useRoute, useRouter } from "vue-router"
import {
  CircleCheckFilled,
  CircleCloseFilled,
  Back
} from "@element-plus/icons-vue"
import { computedAsync } from "@vueuse/core"

const route = useRoute()
const router = useRouter()

const light = ref<Device>({} as Device)

onMounted(async () => {
  light.value = await getLightById(Number(router.currentRoute.value.query.id))
})

const goBack = () => {
  router.back()
}

const handleSelect = (key: string) => {
  switch (key) {
    case "status":
      router.push({
        path: "/light",
        query: { id: route.query.id }
      })
      break
    case "history":
      router.push({
        path: "/lightHistoryData",
        query: { id: route.query.id }
      })
      break
    case "detection":
      router.push({
        path: "/lightDetection",
        query: { id: route.query.id }
      })
      break
    case "monitor":
      router.push({
        path: "/lightMonitor",
        query: { id: route.query.id }
      })
      break
    case "chat":
      // TODO: 实现实时对话页面
      console.log("实时对话 - 待实现")
      break
  }
}

</script>

<style scoped>
.light-detail-container {
  height: 100%;
  background-color: #f5f7fa;
}

.header {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.header-menu {
  display: flex;
  align-items: center;
  height: 60px;
  border-bottom: none;
}

.header-menu .el-menu-item {
  height: 60px;
  line-height: 60px;
}

.flex-grow {
  flex-grow: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.status-icon {
  margin-right: 4px;
}

:deep(.el-main) {
  padding: 20px;
  background-color: #f5f7fa;
}

.el-main {
  padding: 0px;
}
</style>