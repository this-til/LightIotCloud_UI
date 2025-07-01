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
    { index: "history", label: "历史数据" },
    { index: "detection", label: "检测结果" },
    { index: "monitor", label: "实时监控" },
    //{ index: "intercom", label: "对讲配置" },
    //{ index: "chat", label: "实时对话" }
])

onMounted(async () => {
    light.value = await getLightById(Number(router.currentRoute.value.query.id))
})

const handleSelect = (key) => {
    const id = route.query.id
    switch (key) {
        case "status":
            router.push({
                name: "light-content",
                query: { id }
            })
            break
        case "history":
            router.push({
                name: "light-history",
                query: { id }
            })
            break
        case "detection":
            router.push({
                name: "light-detection",
                query: { id }
            })
            break
        case "monitor":
            router.push({
                name: "light-monitor",
                query: { id }
            })
            break
        case "intercom":
            router.push({
                name: "light-intercom",
                query: { id }
            })
            break
        case "webrtc-monitor":
            router.push({
                name: "light-webrtc-monitor",
                query: { id }
            })
            break
        case "chat":
            console.log("实时对话 - 待实现")
            break
    }
}
</script>

<style scoped></style>
