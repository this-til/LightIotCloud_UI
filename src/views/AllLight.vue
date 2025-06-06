<template>
  <device-list :device-list=lightList></device-list>

</template>

<script setup lang="ts">

import { Light, lights } from "@/util/api"
import { ref } from "vue"
import DeviceList from "@/components/DeviceList.vue"

const lightList = ref<Light[]>([])

onMounted(
  async () => {
    lightList.value = await lights()
  }
)

</script>


<style scoped>

</style>