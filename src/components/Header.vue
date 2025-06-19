<template>
  <div class="header">
    <el-menu
      mode="horizontal"
      class="header-menu"
      :ellipsis="false"
    >
      <el-menu-item index="1" @click="handleBack">
        <el-icon>
          <Back />
        </el-icon>
        返回
      </el-menu-item>
      
      <!-- 动态菜单项 -->
      <el-menu-item 
        v-for="item in menuItems" 
        :key="item.index"
        :index="item.index"
        @click="handleSelect(item.index)"
      >
        {{ item.label }}
      </el-menu-item>
      
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
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue"
import {
  CircleCheckFilled,
  CircleCloseFilled,
  Back
} from "@element-plus/icons-vue"

// 定义属性
const props = defineProps({
  light: {
    type: Object,
    required: true
  },
  menuItems: {
    type: Array,
    required: true,
    default: () => [
      { index: "status", label: "当前状态" },
      { index: "history", label: "历史数据" },
      { index: "detection", label: "检测结果" },
      { index: "monitor", label: "实时监控" },
      { index: "chat", label: "实时对话" }
    ]
  }
})

// 定义事件
const emit = defineEmits(["select", "back"])

// 处理菜单项选择
const handleSelect = (index: string) => {
  emit("select", index)
}

// 处理返回按钮点击
const handleBack = () => {
  emit("back")
}
</script>

<style scoped>
/* 完全保持原布局样式 */
.header {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  height: 60px;
  padding: 0;
}

.header-menu {
  display: flex;
  align-items: center;
  height: 100%;
  border-bottom: none;
}

.header-menu .el-menu-item {
  height: 100%;
  line-height: 60px;
  padding: 0 15px;
  margin: 0;
}

.flex-grow {
  flex-grow: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-right: 20px;
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
</style> 