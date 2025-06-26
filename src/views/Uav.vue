<template>
  <div class="uav-container">
    <h1>无人机设备详情</h1>
    <p>设备ID: {{ route.query.id }}</p>
    <!-- 这里添加无人机详情页的具体内容 -->
  </div>
</template>

<script setup>
import { useRoute } from "vue-router"
const route = useRoute()
</script>

<style scoped>
.uav-container {
  padding: 20px;
}
</style>
