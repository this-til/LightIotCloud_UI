// API配置文件
// 可以根据不同环境设置不同的配置

// 开发环境配置
const DEV_CONFIG = {
    BASE_URL: "http://192.168.117.120:8080",
    WS_URL: "ws://192.168.117.120:8080",
    LIGHT_CAM_URL: "whep://192.168.117.2:8889/lightCam"
}

// 生产环境配置
const PROD_CONFIG = {
    BASE_URL: "https://your-production-api.com",
    WS_URL: "wss://your-production-api.com",
    LIGHT_CAM_URL: "whep://your-production-cam-server.com/lightCam"
}

// 测试环境配置
const TEST_CONFIG = {
    BASE_URL: "https://your-test-api.com",
    WS_URL: "wss://your-test-api.com",
    LIGHT_CAM_URL: "whep://your-test-cam-server.com/lightCam"
}

// 根据环境变量选择配置
const getConfig = () => {
    const env = import.meta.env.MODE || 'development'

    switch (env) {
        case 'production':
            return PROD_CONFIG
        case 'test':
            return TEST_CONFIG
        case 'development':
        default:
            return DEV_CONFIG
    }
}

// 导出配置
export const API_CONFIG = {
    ...getConfig(),
    // 支持通过环境变量覆盖
    BASE_URL: import.meta.env.VITE_API_BASE_URL || getConfig().BASE_URL,
    WS_URL: import.meta.env.VITE_WS_URL || getConfig().WS_URL,
    LIGHT_CAM_URL: import.meta.env.VITE_LIGHT_CAM_URL || getConfig().LIGHT_CAM_URL
}

// 导出配置函数，方便动态修改
export const updateApiConfig = (newConfig) => {
    Object.assign(API_CONFIG, newConfig)
}

// 导出获取当前配置的函数
export const getApiConfig = () => ({ ...API_CONFIG })
