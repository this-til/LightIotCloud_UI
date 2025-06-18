<template>
  <DeviceList
    :title="title"
    :device-list="deviceList"
    :view-details="viewDetails"
  ></DeviceList>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { getDevices, DeviceType, type Device } from "@/util/Api"
import DeviceList from "./DeviceList.vue"
import router from "@/router"

const route = useRoute()
const deviceType = computed(() => route.params.type as DeviceType)
const deviceList = ref<Device[]>([])

const title = computed(() => {
  switch (deviceType.value) {
    case DeviceType.CAR:
      return "智能巡检小车列表"
    case DeviceType.LIGHT:
      return "智能灯杆列表"
    case DeviceType.UAV:
      return "无人机设备列表"
    default:
      return "设备列表"
  }
})

// 获取设备列表的函数
const fetchDevices = async () => {
  try {
    const devices = await getDevices(deviceType.value)
    if (devices) {
      deviceList.value = devices
      console.log("Loaded devices:", devices)
    }
  } catch (error) {
    console.error("Failed to fetch devices:", error)
    deviceList.value = []
  }
}

// 组件挂载时获取设备列表
onMounted(fetchDevices)

// 监听路由参数变化，当设备类型改变时重新获取设备列表
watch(
  () => route.params.type,
  (newType, oldType) => {
    if (newType !== oldType) {
      fetchDevices()
    }
  }
)

const viewDetails = (d: Device) => {
  // 根据设备类型跳转到不同的详情页
  let routeName: string
  switch (deviceType.value) {
    case DeviceType.LIGHT:
      routeName = "light-content"
      break
    case DeviceType.CAR:
      routeName = "car"
      break
    case DeviceType.UAV:
      routeName = "uav"
      break
    default:
      console.warn("Unknown device type:", deviceType.value)
      return
  }
  
  router.push({
    name: routeName, // 使用路由名称而不是路径
    query: { id: d.id.toString() }
  })
}
</script>

<style scoped></style> 