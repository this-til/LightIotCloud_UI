<template>
  <div class="light-detail-container">
    <!-- 使用新的 Header 组件 -->
    <Header
      :device="device"
      :menu-items="menuItems"
      :handleSelect="handleSelect"
    />
    <el-main>
      <RouterView
        :device="device" />
    </el-main>
  </div>
</template>

<script setup>
import { defineProps, onMounted, ref } from "vue"
import { getLightById } from "@/util/Api"
import { useRoute, useRouter } from "vue-router"
import Header from "@/components/Header.vue"

const route = useRoute()
const router = useRouter()

const props = defineProps({
  menuItems: Array,
  handleSelect: Function
})

const device = ref({
  id : Number(router.currentRoute.value.query.id)
})

onMounted(async () => {
  device.value = await getLightById(Number(router.currentRoute.value.query.id))
})

</script>

<style scoped>
/* 保持原容器样式不变 */
.light-detail-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #0a0f1e;
}

:deep(.el-main) {
  padding: 20px;
  background-color: #0a0f1e;
  flex: 1;
  overflow: auto;
}

.el-main {
  padding: 0;
}
</style>
