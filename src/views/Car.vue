<template>

</template>

<script setup lang="ts">

import { onMounted, onUnmounted, ref } from "vue"
import { CarState, getDefWebSocketClient, subscriptionCarStateReportEvent, unsubscribe, Device } from "@/util/Api"
import { useRoute } from "vue-router"

const props = defineProps<{
  car: Device
}>()

const route = useRoute()

const carState = ref<CarState>({})

let unsubscriptionCarStateReportEvent: unsubscribe | null = null

onMounted(() => {

  subscriptionCarStateReportEvent(
    getDefWebSocketClient(),
    Number.parseInt(route.query.id),
    {
      next(value: CarState) {
        carState.value = value
        console.log("new CarState:",value)
      },
      complete(): void {
      },
      error(error: unknown): void {
      }
    }
  )

})

onUnmounted(() => {
  if (unsubscriptionCarStateReportEvent != null) {
    unsubscriptionCarStateReportEvent()
    unsubscriptionCarStateReportEvent = null
  }
})


</script>

<style scoped>

</style>