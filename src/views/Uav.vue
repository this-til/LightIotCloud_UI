<template>
  <DevicePlate :menuItems="menuItems" :handleSelect="handleSelect" />
</template>

<script setup>
import { onMounted, ref } from "vue"
import { getLightById } from "@/util/Api"
import { useRoute, useRouter } from "vue-router"
import Header from "@/components/Header.vue"
import DevicePlate from "@/components/DevicePlate.vue"

const route = useRoute()
const router = useRouter()

const light = ref({})

// 定义菜单项 - 保持与原结构完全一致
const menuItems = ref([
  { index: "status", label: "当前状态" },

])

onMounted(async () => {
  light.value = await getLightById(Number(router.currentRoute.value.query.id))
  router.replace({
    name: 'UavContent',
    query: { id: route.query.id }
  })
})

const handleSelect = (key) => {
  const id = route.query.id
  switch (key) {
    case "status":
      router.push({
        name: "UavContent",
        query: { id }
      })
      break
  }
}
</script>

<style scoped></style>
