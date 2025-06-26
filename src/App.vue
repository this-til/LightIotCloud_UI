<template>
  <div id="skin-wrapper">
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from "vue-router"
</script>

<style scoped>
#skin-wrapper {
  position: fixed;
  inset: 0;
}
</style>
