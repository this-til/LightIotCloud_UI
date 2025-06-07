<template>
  <DeviceList
    title="智能灯杆列表"
    :device-list="lightList"
    :view-details="viewDetails"></DeviceList>
</template>

<script setup lang="ts">

import { getLightList } from "@/util/api"
import type { Light, Device } from "@/util/api"
import { onMounted, ref } from "vue"
import DeviceList from "../components/DeviceList.vue"
import router from "@/router"

const lightList = ref<Light[]>([])

onMounted(
  async () => {
    const lights = await getLightList()
    if (!lights) {
      return
    }
    lightList.value = lights
    console.log("onMounted", lights)
  }
)

const viewDetails = (d: Device) => {
  router.push({
    path: "light",
    query: {
      "id": d.id.toString()
    }
  })
}

// 完成

</script>


<style scoped>

</style>