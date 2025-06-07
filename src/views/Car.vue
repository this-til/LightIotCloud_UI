<template>

</template>

<script setup lang="ts">

import { onMounted, onUnmounted, ref } from "vue"
import { useGraphqlStore } from "@/util/store"
import { CarState, subscriptionCarStateReportEvent, unsubscribe } from "@/util/api"
import { useRoute } from "vue-router"

const graphqlStore = useGraphqlStore()
const route = useRoute()

const carState = ref<CarState>({})

let unsubscriptionCarStateReportEvent: unsubscribe | null = null

onMounted(() => {

  subscriptionCarStateReportEvent(
    graphqlStore.client,
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