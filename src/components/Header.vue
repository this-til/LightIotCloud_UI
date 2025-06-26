<template>
  <div class="header">
    <el-menu mode="horizontal" class="header-menu" :ellipsis="false">
      <el-menu-item index="1" @click="handleBack">
        <el-icon>
          <Back />
        </el-icon>
        返回
      </el-menu-item>

      <!-- 动态菜单项 -->
      <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.index" @click="handleSelect(item.index)">
        {{ item.label }}
      </el-menu-item>

      <div class="header-right">
        <h1 class="title">{{ device?.name }}</h1>
        <el-tag :type="device?.online ? 'success' : 'danger'" :effect="device?.online ? 'light' : 'plain'" size="large">
          <el-icon class="status-icon">
            <CircleCheckFilled v-if="device?.online" />
            <CircleCloseFilled v-else />
          </el-icon>
          {{ device?.online ? "在线" : "离线" }}
        </el-tag>
      </div>
    </el-menu>
  </div>
</template>

<script setup>

import { defineProps, defineEmits } from "vue"
import {
  CircleCheckFilled,
  CircleCloseFilled,
  Back
} from "@element-plus/icons-vue"
import { useRoute, useRouter } from "vue-router"

const router = useRouter()

const props = defineProps({
  device: Object,
  menuItems: Array,
  handleSelect: Function
})


// 处理返回按钮点击
const handleBack = () => {
  router.back()
}

</script>

<style scoped>
/* ========== Detection 卡片&布局 ========= */
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

.header {
  background: rgba(0, 10, 20, 0.75);
  /* 半透明深蓝 */
  border-bottom: 1px solid rgba(0, 255, 234, .35);
  backdrop-filter: blur(6px);
  box-shadow: 0 0 6px rgba(0, 255, 234, .25);
  height: 60px;
  margin-bottom: 20px;
}

/* El-menu 取消默认底线、背景 */
.header-menu {
  background: transparent;
  border-bottom: none !important;
}

/* 普通菜单项：文字 & hover */
.header-menu :deep(.el-menu-item) {
  height: 100%;
  line-height: 60px;
  padding: 0 18px;
  color: #8fe8ff;
  /* 亮青文字 */
  transition: background .2s;
}

.header-menu :deep(.el-menu-item:hover),
.header-menu :deep(.el-menu-item.is-active) {
  background: rgba(0, 255, 234, .12);
  color: #ffffff;
}

/* 返回按钮里的图标 */
.header-menu :deep(.el-menu-item i) {
  color: #e0ffff;
  margin-right: 4px;
}

/* 右侧设备标题 & 在线标签 */
.header-right h1.title {
  color: #e0ffff;
}

.header-right :deep(.el-tag) {
  --el-tag-bg-color: rgba(0, 255, 234, .18);
  --el-tag-border-color: rgba(0, 255, 234, .45);
  color: #e0ffff;
}

.header-right :deep(.el-tag.success) {
  --el-tag-bg-color: rgba(0, 255, 120, .20);
}

.header-right :deep(.el-tag.danger) {
  --el-tag-bg-color: rgba(255, 60, 60, .25);
}

.status-icon {
  margin-right: 4px;
  color: #e0ffff;
}

.header-menu {
  width: 100%;
}

/* 让右侧区块推到最右 & 内部横向排列 */
.header-right {
  margin-left: auto;
  /* 核心：把自己推到行尾 */
  margin-right: 15px;
  display: flex;
  align-items: center;
  gap: 16px;
  /* 标题与 Tag 间距 */
}
</style>
