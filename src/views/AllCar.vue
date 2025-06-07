<template>
  <DeviceList
    title="智能巡检小车列表"
    :device-list="carList"
    :viewDetails="viewDetails"
  ></DeviceList>
</template>

<script setup lang="ts">

import { Car, Device, getCarList } from "@/util/api"
import { onMounted, ref } from "vue"
import DeviceList from "../components/DeviceList.vue"
import router from "@/router"

const carList = ref<Car[]>([])

onMounted(
  async () => {
    const cars = await getCarList()
    if (!cars) {
      return
    }
    carList.value = cars
    console.log("onMounted", cars)
  }
)

const viewDetails = (d: Device) => {
  router.push({
    name: "car",
    query: {
      "id": d.id.toString()
    }
  })
}

</script>


<style scoped>

</style>