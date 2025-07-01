import type { Client, FormattedExecutionResult, Sink } from "graphql-ws"
import { createClient } from "graphql-ws"
import { WebSocket } from "vite"
import axios from "axios"
import type { AxiosInstance, AxiosRequestConfig, AxiosError, RawAxiosRequestHeaders, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from "axios"
import { ElNotification } from "element-plus"
import router from "../router"
import { reactive } from "vue"
import { computedAsync } from "@vueuse/core"

type ID = number;
type Int = number;
type Float = number;
type Boolean = boolean;
type Number = number;
type DateTime = Date;
type String = string;

export const CAR = "CAR"
export const LIGHT = "LIGHT"
export const UAV = "UAV"

export enum DeviceType {
    CAR = "CAR",
    LIGHT = "LIGHT",
    UAV = "UAV"
}

export const ONLINE = "ONLINE"
export const OFFLINE = "OFFLINE"

export enum OnlineState {
    ONLINE = "ONLINE",
    OFFLINE = "OFFLINE",
}

export const SUCCESSFUL = "SUCCESSFUL"
export const FAIL = "FAIL"
export const ERROR = "ERROR"

export enum ResultType {
    SUCCESSFUL = "SUCCESSFUL",
    FAIL = "FAIL",
    ERROR = "ERROR",
}

export enum RollingDoorState {
    OPENED = "OPENED",
    OPENING = "OPENING",
    CLOSED = "CLOSED",
    CLOSING = "CLOSING"
}

export interface DeviceOnlineStateSwitchEvent {
    onlineState: OnlineState
    device: Device

    [key: string]: unknown;
}

export interface Device {
    id: number
    userId: number
    name: string
    createdAt: Date
    updatedAt: Date
    deviceType: DeviceType

    online: Boolean
}

export interface LightData {
    time: Date

    humidity: number | undefined
    temperature: number | undefined
    pm10: number | undefined
    pm2_5: number | undefined
    illumination: number | undefined
    windSpeed: number | undefined
    windDirection: number | undefined
}

export interface PowerPack {
    electricity?: number
    voltage?: number
    power?: number
}

export interface PowerPackInput {
    electricity?: number
    voltage?: number
    power?: number
}

export interface LightState {
    selfPower?: PowerPack
    wirelessChargingPower?: PowerPack
    uavPower?: PowerPack
    uavBaseStationPower?: PowerPack

    // 当前是不是自动调光
    automaticGear?: boolean

    // 当前的调光等级
    gear?: number

    // 卷帘门开启状态
    rollingDoorState?: RollingDoorState

    [key: string]: unknown;
}

export interface LightStateInput {
    selfPower?: PowerPackInput
    wirelessChargingPower?: PowerPackInput
    uavPower?: PowerPackInput
    uavBaseStationPower?: PowerPackInput

    automaticGear?: boolean
    gear?: number
    rollingDoorState?: RollingDoorState
}

export interface CarState {

    [key: string]: unknown;
}

export interface TimeRange {
    start: DateTime
    end: DateTime
}

export interface Page {
    current: number
    size: number
    total: number
    searchCount: number
}

export interface DetectionItem {
    name: string
}

export interface DetectionModel {
    name: string
    items: DetectionItem[]
}

export interface Detection {
    x: number
    y: number
    w: number
    h: number
    probability: number
    model: string
    item: string
}

export interface DetectionKeyframe {
    id: number
    deviceId: number
    time: Date
    detections: Detection[]
}

const TOKEN_KEY = "auth_token"

const state = {
    token: localStorage.getItem(TOKEN_KEY),
    client: null as Client | null,
    activateLight: null as Device | null,
    activateCar: null as Device | null
}

export const computedActivateLight = () => computedAsync<Device | null>(async () => {
    let id = router.currentRoute.value.query.id
    if (!id) {
        return null
    }
    const numId = Number(id)
    if (state.activateLight && state.activateLight.id === numId) {
        return state.activateLight
    }
    state.activateLight = await getLightById(numId)
    return state.activateLight
}, null)


export const computedActivateCar = () => computedAsync<Device | null>(async () => {
    let id = router.currentRoute.value.query.id
    if (!id) {
        return null
    }
    const numId = Number(id)
    if (state.activateCar && state.activateCar.id === numId) {
        return state.activateCar
    }
    state.activateCar = await getCarById(numId)
    return state.activateCar
}, null)

// 创建客户端
export function createDefWebSocketClient(): Client {
    if (state.client) {
        state.client.terminate()
        state.client = null
    }

    let activeSocket
    let timedOut: ReturnType<typeof setTimeout> | undefined

    const client = createClient({
        url: "/api/graphql",
        connectionParams: {
            Authorization: getToken(),
            linkType: "WEBSOCKET"
        },
        keepAlive: 10_000,
        on: {
            closed: (e: any) => {
                console.log("GraphQL client closed:", e)

                if (e.reason === "Normal Closure") {
                    return
                }

                ElNotification({
                    type: "error",
                    title: "链接中断",
                    message: "链接中断，回到主页面",
                    duration: 3000
                })
                router.push({
                    path: "/main"
                })
            },
            ping: (received) => {
                if (!received) {
                     timedOut = setTimeout(() => {
                        if (state.client) {
                            state.client.terminate()
                        }
                    }, 5_000)
                }
            },
            pong: (received) => {
                if (received) {
                    clearTimeout(timedOut)
                }
            },
            error: (err) => console.error("[GraphQL-Error]", err),
            message: (msg) => {
                if (msg.type === "error") {
                    console.error("[GraphQL-Message-Error]", msg)
                } else {
                    console.log("[GraphQL-Message]", msg)
                }
            },
            connected: () => console.debug("[GraphQL-Connected]")
        }
    })

    state.client = client
    return client
}

export const getDefWebSocketClient = () => {
    if (state.client) {
        return state.client
    }
    console.log("GraphQL client is null")
    router.push({
        path: isTokenValid(getToken()) ? "/main" : "/"
    })
    return null!
}

export const getToken = (): string => {
    if (state.token) {
        return state.token
    }
    return ""
}

export const setToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token)
    state.token = token
}

export const removeToken = (): void => {
    localStorage.removeItem(TOKEN_KEY)
}

export const isTokenValid = (token: string | null): boolean => {
    if (!token) {
        return false
    }
    if (token === "") {
        return false
    }
    try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        const currentTime = Math.floor(Date.now() / 1000)
        return payload.exp > currentTime
    } catch (e) {
        return false
    }
}


export const useStore = () => state

export type unsubscribe = () => void

export const deviceOnlineStateSwitchEventGql = `
    subscription {
        deviceOnlineStateSwitchEvent {
            onlineState
            device {
                id
                userId
                name
                createdAt
                updatedAt
                deviceType
                online
            }
        }
    }
    `

export function subscriptionDeviceOnlineStateSwitchEvent(
        client: Client,
        sink: Sink<DeviceOnlineStateSwitchEvent>
): unsubscribe {
    return client.subscribe(
            {
                query: deviceOnlineStateSwitchEventGql
            },
            mapSink<FormattedExecutionResult<Record<string, unknown>, unknown>, DeviceOnlineStateSwitchEvent>(
                    sink,
                    res => res.data?.deviceOnlineStateSwitchEvent as DeviceOnlineStateSwitchEvent
            )
    )
}

export const lightStateReportEventGql = `
    subscription lightStateReportEvent($lightId : Int!){
      lightStateReportEvent(lightId : $lightId) {
        selfPower {
          electricity
          voltage
          power
        }
        wirelessChargingPower {
          electricity
          voltage
          power
        }
        uavPower {
          electricity
          voltage
          power
        }
        uavBaseStationPower {
          electricity
          voltage
          power
        }
        automaticGear
        gear
        rollingDoorState
      }
    }
    `

export function subscriptionLightStateReportEvent(
        client: Client,
        lightId: number,
        sink: Sink<LightState>
): unsubscribe {

    return client.subscribe(
            {
                query: lightStateReportEventGql,
                variables: {
                    lightId: Number.parseInt(String(lightId))
                }
            },
            mapSink<FormattedExecutionResult<Record<string, unknown>, unknown>, LightState>(
                    sink,
                    res => res.data?.lightStateReportEvent as LightState
            )
    )

}

export const lightDataReportEventGql = `
    subscription lightDataReportEvent($lightId : Int!){
        lightDataReportEvent(lightId : $lightId) {
            humidity
            temperature
            pm10
            pm2_5
            illumination
            windSpeed
            windDirection
        }
    }
`

export const lightDetectionReportEventGql = `
    subscription lightDetectionReportEvent($lightId: Int!) {
        lightDetectionReportEvent(lightId: $lightId) {
            id
            deviceId
            time
            detections {
                x
                y
                w
                h
                probability
                model
                item
            }
        }
    }
`

export function subscriptionLightDetectionReportEvent(
        client: Client,
        lightId: number,
        sink: Sink<DetectionKeyframe>
): unsubscribe {
    return client.subscribe(
            {
                query: lightDetectionReportEventGql,
                variables: {
                    lightId
                }
            },
            mapSink<FormattedExecutionResult<Record<string, unknown>, unknown>, DetectionKeyframe>(
                    sink,
                    res => res.data?.lightDetectionReportEvent as DetectionKeyframe
            )
    )
}

export function subscriptionLightDataReportEventEvent(
        client: Client,
        lightId: number,
        sink: Sink<LightData>
): unsubscribe {
    return client.subscribe(
            {
                query: lightDataReportEventGql,
                variables: {
                    lightId
                }
            },
            mapSink<FormattedExecutionResult<Record<string, unknown>, unknown>, LightData>(
                    sink,
                    res => res.data?.lightDataReportEvent as LightData
            )
    )

}

export const carStateReportEventGql = `
    subscription carStateReportEvent($carId: Int!) {
      carStateReportEvent(carId: $carId) {
        TODO
      }
    }
    `

export function subscriptionCarStateReportEvent(
        client: Client,
        carId: number,
        sink: Sink<CarState>
): unsubscribe {
    return client.subscribe(
            {
                query: carStateReportEventGql,
                variables: {
                    carId
                }
            },
            mapSink<FormattedExecutionResult<Record<string, unknown>, unknown>, CarState>(
                    sink,
                    res => res.data?.carStateReportEvent as CarState
            )
    )

}

export function mapSink<S, T>(t: Sink<T>, map: (res: S) => T): Sink<S> {
    return {
        next(value: S): void {
            if (t.next == null) {
                return
            }
            t.next(map(value))
        },
        complete(): void {
            if (t.complete == null) {
                return
            }
            t.complete()
        },
        error(error: unknown): void {
            if (t.error == null) {
                return
            }
            t.error(error)
        }

    }
}

export const api: AxiosInstance = axios.create(
        {
            baseURL: "/api",
            timeout: 10000,
            headers: {
                "Content-Type": "application/json"
            }
        }
)

// 请求拦截器
api.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            const token = getToken()

            // 如果 token 存在且有效，添加到请求头
            if (token && isTokenValid(token)) {
                config.headers = config.headers || {}
                config.headers.Authorization = `${token}`
            }

            return config
        },
        (error: AxiosError) => {
            return Promise.reject(error)
        }
)

const JWTDecodeException: string = "JWTDecodeException"

// 响应拦截器 - 处理 token 过期
api.interceptors.response.use(
        response => {
            const g: GraphqlResponse = response.data as GraphqlResponse

            // 空响应处理
            if (g == null) {
                ElNotification({
                    type: "error",
                    title: "请求错误",
                    message: "未收到有效响应数据",
                    duration: 8000
                })
                return response
            }

            // 处理 GraphQL 错误
            const errors = g.errors
            if (errors && errors.length > 0) {
                let hasTokenError = false
                const errorMessages: string[] = []

                errors.forEach((error: Record<string, unknown>) => {
                    const extensions = (error.extensions || {}) as ErrorExtensions
                    const message = (error.message || "未知错误") as string

                    // 检测 JWT 异常
                    if (extensions?.classification === "JWTDecodeException") {
                        hasTokenError = true
                    } else {
                        errorMessages.push(message)
                    }
                })

                // 优先处理 token 异常
                if (hasTokenError) {
                    handleTokenExpiration()
                }
                // 显示其他错误通知
                else if (errorMessages.length > 0) {
                    ElNotification({
                        type: "error",
                        title: `请求错误 (${errors.length}个问题)`,
                        message: errorMessages.join("；"),
                        duration: 8000
                    })
                }
            }

            return response
        },
        (error: AxiosError) => {
            if (error.response?.status === 401) {
                handleTokenExpiration()
            }
            return Promise.reject(error)
        }
)

function handleTokenExpiration() {
    removeToken()

    // 显示通知并重定向
    ElNotification({
        type: "warning",
        title: "会话过期",
        message: "登录状态已失效，请重新登录",
        duration: 3000
    })

    router.push({
        path: "/login"
    })
}


export interface GraphqlErrors {
    message?: string,
    locations?: ErrorLocation[]
    path?: string[]
    extensions?: ErrorExtensions

    [key: string]: unknown;
}

export interface ErrorLocation {
    line: number,
    column: number

    [key: string]: unknown;
}

export interface ErrorExtensions {
    classification?: string

    [key: string]: unknown;
}

export interface GraphqlResponse<D = any> {
    data?: D
    errors?: Record<string, unknown>[]

    [key: string]: unknown;
}

export async function postGql<D>(gql: string, variables: Record<string, unknown> = {}, headers: Record<string, unknown> = {}): Promise<GraphqlResponse<D>> {
    const axiosResponse = await api.post(
            "/graphql",
            {
                query: gql,
                variables
            },
            {
                headers: headers as AxiosHeaders
            }
    )
    return axiosResponse.data as GraphqlResponse<D>
}

export const LOGIN_MUTATION = `
  mutation login($username: String!, $password: String!) {
    login(username: $username, password: $password)
  }
`

export async function login(username: string, password: string): Promise<string> {
    const response = await postGql<{ login: string }>(
            LOGIN_MUTATION,
            {
                username,
                password
            }
    )
    return response.data?.login || ""
}


export const REGISTER_MUTATION = `
  mutation register($username: String!, $password: String!) {
    register(username: $username, password: $password)
  }
`

export async function register(username: string, password: string): Promise<boolean> {
    const response = await postGql<{ register: boolean }>(
            REGISTER_MUTATION,
            {
                username,
                password
            }
    )
    return response.data?.register || false
}


export const JWT_EFFECTIVE_QUERY = `
  query jwtEffective($jwt: String!) {
    jwtEffective(jwt: $jwt)
  }
`

export async function jwtEffective(jwt: string): Promise<boolean> {
    const response = await postGql<{ jwtEffective: boolean }>(
            JWT_EFFECTIVE_QUERY,
            { jwt }
    )
    return response.data?.jwtEffective || false
}

export const LIGHT_QUERY = `
query getLight($id: ID!) {
    self {
        getDeviceById(id: $id, deviceType: LIGHT) {
            id
            userId
            name
            createdAt
            updatedAt
            online
        }
    }
}
`

export async function getLightById(id: number): Promise<Device> {
    const graphqlResponse = await postGql<
            {
                self: {
                    getDeviceById: Device
                }
            }
    >(LIGHT_QUERY, { id })
    return graphqlResponse.data?.self?.getDeviceById as Device
}

export const CAR_QUERY = `
query getCarById($id: ID!) {
    self {
        getDeviceById(id: $id, deviceType: CAR) {
            id
            userId
            name
            createdAt
            updatedAt
            online
            asCar {
                carState {
                    TODO
                }
            }
        }
    }
}
`

export async function getCarById(id: number): Promise<Device> {
    const graphqlResponse = await postGql<
            {
                self: {
                    getDeviceById: Device
                }
            }
    >(CAR_QUERY, { id })
    return graphqlResponse.data?.self?.getDeviceById as Device
}

export const DEVICES_QUERY = `
query getDevices($deviceType: DeviceType) {
  self {
    devices(deviceType: $deviceType) {
      id
      name
      online
      createdAt
      updatedAt
      deviceType
    }
  }
}
`

export async function getDevices(deviceType: DeviceType): Promise<Device[]> {
    const graphqlResponse = await postGql<
            {
                self: {
                    devices: Device[]
                }
            }
    >(DEVICES_QUERY, { deviceType })
    return graphqlResponse.data?.self?.devices as Device[]
}

export const LIGHT_DATA_QUERY = `
   query getLightHistory($lightId: ID!, $timeRange: TimeRange) {
    self {
      getDeviceById(id: $lightId, deviceType: LIGHT) {
        asLight {
          datas(timeRange: $timeRange) {
            time
            humidity
            temperature
            pm10
            pm2_5
            illumination
            windSpeed
            windDirection
          }
        }
      }
    }
  }
  `

/**
 * 获取单个灯的历史数据
 * @param lightId 灯设备ID
 * @param timeRange 时间范围（可选）
 */
export async function getLightHistoryData(
        lightId: number,
        timeRange?: TimeRange
): Promise<LightData[]> {

    const response = await postGql<
            {
                self: {
                    getDeviceById: {
                        asLight: {
                            datas: LightData[]
                        }
                    }
                }
            }
    >(
            LIGHT_DATA_QUERY,
            {
                lightId,
                timeRange
            }
    )

    return response.data?.self?.getDeviceById?.asLight?.datas as LightData[]
}

export const SET_LIGHT_GEAR_MUTATION = `
mutation setGear($lightId: ID!, $value: Int!) {
    self {
        getDeviceById(id: $lightId, deviceType: LIGHT) {
            asLight {
                setGear(value: $value) {
                    resultType
                }
            }
        }
    }
}
`

export async function setLightGear(
        lightId: ID,
        value: Int
): Promise<ResultType> {

    const response = await postGql<
            {
                self: {
                    getDeviceById: {
                        asLight: {
                            setGear: {
                                resultType: ResultType
                            }
                        }
                    }
                }
            }
    >(
            SET_LIGHT_GEAR_MUTATION,
            {
                lightId,
                value
            }
    )

    return response?.data?.self?.getDeviceById?.asLight?.setGear?.resultType as ResultType
}

export const SET_AUTOMATIC_GEAR_MUTATION = `
mutation setAutomaticGear($lightId: ID!, $value: Boolean!) {
    self {
        getDeviceById(id: $lightId, deviceType: LIGHT) {
            asLight {
                setAutomaticGear(value: $value) {
                    resultType
                }
            }
        }
    }
}
`

export async function setAutomaticGear(
        lightId: ID,
        value: Boolean
): Promise<ResultType> {

    const response = await postGql<
            {
                self: {
                    getDeviceById: {
                        asLight: {
                            setAutomaticGear: {
                                resultType: ResultType
                            }
                        }
                    }
                }
            }
    >(
            SET_AUTOMATIC_GEAR_MUTATION,
            {
                lightId,
                value
            }
    )

    return response?.data?.self?.getDeviceById?.asLight?.setAutomaticGear?.resultType as ResultType
}

export const USER_MODELS_QUERY = `
query {
  self {
    model {
      name
      items {
        name
      }
    }
  }
}
`

export async function getUserModels(): Promise<DetectionModel[]> {
    const graphqlResponse = await postGql<
            {
                self: {
                    model: DetectionModel[]
                }
            }
    >(USER_MODELS_QUERY)
    return graphqlResponse.data?.self?.model as DetectionModel[]
}

export const DETECTION_KEYFRAMES_QUERY = `
query getDetectionKeyframes($lightId: ID!, $page: Page, $timeRange: TimeRange) {
    self {
        getDeviceById(id: $lightId, deviceType: LIGHT) {
            asLight {
                detectionKeyframes(page: $page, timeRange: $timeRange) {
                    id
                    deviceId
                    time
                    detections {
                        x
                        y
                        w
                        h
                        probability
                        model
                        item
                    }
                }
            }
        }
    }
}
`

export const DETECTION_KEYFRAME_COUNT_QUERY = `
query getDetectionKeyframeCount($lightId: ID!, $timeRange: TimeRange) {
    self {
        getDeviceById(id: $lightId, deviceType: LIGHT) {
            asLight {
                detectionKeyframeCount(timeRange: $timeRange)
            }
        }
    }
}
`

export async function getDetectionKeyframeCount(
    lightId: number,
    timeRange?: TimeRange
): Promise<number> {
    const response = await postGql<
        {
            self: {
                getDeviceById: {
                    asLight: {
                        detectionKeyframeCount: number
                    }
                }
            }
        }
    >(
        DETECTION_KEYFRAME_COUNT_QUERY,
        {
            lightId,
            timeRange: timeRange ? {
                start: formatDateWithTimezone(timeRange.start),
                end: formatDateWithTimezone(timeRange.end)
            } : undefined
        }
    )

    return response.data?.self?.getDeviceById?.asLight?.detectionKeyframeCount || 0
}

export async function getDetectionKeyframes(
    lightId: number,
    page?: {
        current?: number
        size?: number
        total?: number
        searchCount?: boolean
    },
    timeRange?: TimeRange
): Promise<DetectionKeyframe[]> {
    const response = await postGql<
        {
            self: {
                getDeviceById: {
                    asLight: {
                        detectionKeyframes: DetectionKeyframe[]
                    }
                }
            }
        }
    >(
        DETECTION_KEYFRAMES_QUERY,
        {
            lightId,
            page,
            timeRange: timeRange ? {
                start: formatDateWithTimezone(timeRange.start),
                end: formatDateWithTimezone(timeRange.end)
            } : undefined
        }
    )

    return response.data?.self?.getDeviceById?.asLight?.detectionKeyframes as DetectionKeyframe[]
}

// 格式化日期为带时区的ISO格式
function formatDateWithTimezone(date: Date): string {
    const tzOffset = -date.getTimezoneOffset()
    const diff = tzOffset >= 0 ? '+' : '-'
    const pad = (n: number) => `${Math.floor(Math.abs(n))}`.padStart(2, '0')
    const hours = pad(tzOffset / 60)
    const minutes = pad(tzOffset % 60)
    return `${date.toISOString().slice(0, 19)}.000${diff}${hours}:${minutes}`
}

/**
 * 获取图片
 * @param id 图片ID
 * @param thumb 是否获取缩略图
 * @returns 图片的Blob数据
 */
export async function getImage(id: number, thumb: boolean = false): Promise<Blob> {
    const response = await api.get(
        `/images?id=${id}&thumb=${thumb}`,
        {
            responseType: 'blob'
        }
    )
    return response.data
}

export const DEVICE_SELF_QUERY = `
query {
  deviceSelf {
    id
    userId
    name
    createdAt
    updatedAt
    deviceType
    online
  }
}
`

export async function getDeviceSelf(): Promise<Device | null> {
    const graphqlResponse = await postGql<
            {
                deviceSelf: Device
            }
    >(DEVICE_SELF_QUERY)
    return graphqlResponse.data?.deviceSelf || null
}

export const DEVICE_LIGHT_STATE_QUERY = `
query getDeviceLightState($deviceId: ID!) {
  self {
    getDeviceById(id: $deviceId, deviceType: LIGHT) {
      asLight {
        lightState {
          selfPower {
            electricity
            voltage
            power
          }
          wirelessChargingPower {
            electricity
            voltage
            power
          }
          uavPower {
            electricity
            voltage
            power
          }
          uavBaseStationPower {
            electricity
            voltage
            power
          }
          automaticGear
          gear
          rollingDoorState
        }
      }
    }
  }
}
`

export async function getDeviceLightState(deviceId: number): Promise<LightState | null> {
    const response = await postGql<{
        self: {
            getDeviceById: {
                asLight: {
                    lightState: LightState
                }
            }
        }
    }>(DEVICE_LIGHT_STATE_QUERY, { deviceId })

    return response.data?.self?.getDeviceById?.asLight?.lightState || null
}

export const DEVICE_CAR_STATE_QUERY = `
query getDeviceCarState($deviceId: ID!) {
  self {
    getDeviceById(id: $deviceId, deviceType: CAR) {
      asCar {
        carState {
          TODO
        }
      }
    }
  }
}
`

export async function getDeviceCarState(deviceId: number): Promise<CarState | null> {
    const response = await postGql<{
        self: {
            getDeviceById: {
                asCar: {
                    carState: CarState
                }
            }
        }
    }>(DEVICE_CAR_STATE_QUERY, { deviceId })

    return response.data?.self?.getDeviceById?.asCar?.carState || null
}

export const OPERATION_CAR_MUTATION = `
mutation operationCar($carId: ID!, $operationCar: OperationCar!) {
    self {
        getDeviceById(id: $carId, deviceType: CAR) {
            asCar {
                operationCar(operationCar: $operationCar) {
                    resultType
                    message
                }
            }
        }
    }
}
`

export interface Result {
    resultType: ResultType
    message?: string
}

export async function operationCar(
    carId: number,
    operationCar: 'translationAdvance' | 'translationLeft' | 'translationRetreat' | 'translationRight' | 'angularLeft' | 'angularRight' | 'stop'
): Promise<Result> {
    const response = await postGql<{
        self: {
            getDeviceById: {
                asCar: {
                    operationCar: Result
                }
            }
        }
    }>(OPERATION_CAR_MUTATION, {
        carId,
        operationCar
    })

    return response.data?.self?.getDeviceById?.asCar?.operationCar as Result
}

export const SET_SUSTAINED_DETECTION_MUTATION = `
mutation setSustainedDetection($lightId: ID!, $modelName: String) {
    self {
        getDeviceById(id: $lightId, deviceType: LIGHT) {
            asLight {
                setSustainedDetection(modelName: $modelName) {
                    resultType
                }
            }
        }
    }
}
`

export async function setSustainedDetection(
    lightId: ID,
    modelName: string
): Promise<ResultType> {
    const response = await postGql<
        {
            self: {
                getDeviceById: {
                    asLight: {
                        setSustainedDetection: {
                            resultType: ResultType
                        }
                    }
                }
            }
        }
    >(
        SET_SUSTAINED_DETECTION_MUTATION,
        { lightId, modelName }
    )

    return response?.data?.self?.getDeviceById?.asLight?.setSustainedDetection?.resultType as ResultType
}

export const CLOSE_SUSTAINED_DETECTION_MUTATION = `
mutation closeSustainedDetection($lightId: ID!) {
    self {
        getDeviceById(id: $lightId, deviceType: LIGHT) {
            asLight {
                closeSustainedDetection {
                    resultType
                }
            }
        }
    }
}
`

export async function closeSustainedDetection(
    lightId: ID
): Promise<ResultType> {
    const response = await postGql<
        {
            self: {
                getDeviceById: {
                    asLight: {
                        closeSustainedDetection: {
                            resultType: ResultType
                        }
                    }
                }
            }
        }
    >(
        CLOSE_SUSTAINED_DETECTION_MUTATION,
        { lightId }
    )

    return response?.data?.self?.getDeviceById?.asLight?.closeSustainedDetection?.resultType as ResultType
}

export const COMMAND_DOWN_MUTATION = `
mutation commandDown($deviceId: ID!, $key: String!, $value: String!) {
    self {
        getDeviceById(id: $deviceId) {
            commandDown(key: $key, value: $value) {
                resultType
            }
        }
    }
}
`

export async function commandDown(
    deviceId: ID,
    key: string,
    value: string
): Promise<ResultType> {
    const response = await postGql<
        {
            self: {
                getDeviceById: {
                    commandDown: {
                        resultType: ResultType
                    }
                }
            }
        }
    >(
        COMMAND_DOWN_MUTATION,
        { deviceId, key, value }
    )

    return response?.data?.self?.getDeviceById?.commandDown?.resultType as ResultType
}

export const LIGHT_SUSTAINED_DETECTION_REPORT_EVENT_GQL = `
subscription lightSustainedDetectionReportEvent($lightId: Int!) {
    lightSustainedDetectionReportEvent(lightId: $lightId) {
        x
        y
        w
        h
        probability
        model
        item
    }
}
`

export function subscriptionLightSustainedDetectionReportEvent(
    client: Client,
    lightId: number,
    sink: Sink<Detection[]>
): unsubscribe {
    return client.subscribe(
        {
            query: LIGHT_SUSTAINED_DETECTION_REPORT_EVENT_GQL,
            variables: { lightId }
        },
        mapSink<FormattedExecutionResult<Record<string, unknown>, unknown>, Detection[]>(
            sink,
            res => res.data?.lightSustainedDetectionReportEvent as Detection[]
        )
    )
}

export const SET_ROLLING_DOOR_MUTATION = `
mutation setRollingDoor($lightId: ID!, $open: Boolean!) {
    self {
        getDeviceById(id: $lightId, deviceType: LIGHT) {
            asLight {
                setRollingDoor(open: $open) {
                    resultType
                }
            }
        }
    }
}
`

export async function setRollingDoor(
    lightId: ID,
    open: boolean
): Promise<ResultType> {
    const response = await postGql<
        {
            self: {
                getDeviceById: {
                    asLight: {
                        setRollingDoor: {
                            resultType: ResultType
                        }
                    }
                }
            }
        }
    >(
        SET_ROLLING_DOOR_MUTATION,
        { lightId, open }
    )

    return response?.data?.self?.getDeviceById?.asLight?.setRollingDoor?.resultType as ResultType
}

export const PTZ_CONTROL_MUTATION = `
mutation ptzControl($lightId: ID!, $ptzControl: PtzControl!) {
    self {
        getDeviceById(id: $lightId, deviceType: LIGHT) {
            asLight {
                ptzControl(ptzControl: $ptzControl) {
                    resultType
                }
            }
        }
    }
}
`

export async function ptzControl(
    lightId: ID,
    ptzControl: 'TILT_UP' | 'TILT_DOWN' | 'PAN_LEFT' | 'PAN_RIGHT'
): Promise<ResultType> {
    const response = await postGql<
        {
            self: {
                getDeviceById: {
                    asLight: {
                        ptzControl: {
                            resultType: ResultType
                        }
                    }
                }
            }
        }
    >(
        PTZ_CONTROL_MUTATION,
        { lightId, ptzControl }
    )

    return response?.data?.self?.getDeviceById?.asLight?.ptzControl?.resultType as ResultType
}

export const BROADCAST_FILE_CAR_MUTATION = `
mutation broadcastFile($carId: ID!, $fileName: String!) {
    self {
        getDeviceById(id: $carId, deviceType: CAR) {
            asCar {
                broadcastFile(fileName: $fileName) {
                    resultType
                    message
                }
            }
        }
    }
}
`

export async function broadcastFileCar(
    carId: ID,
    fileName: string
): Promise<Result> {
    const response = await postGql<
        {
            self: {
                getDeviceById: {
                    asCar: {
                        broadcastFile: Result
                    }
                }
            }
        }
    >(
        BROADCAST_FILE_CAR_MUTATION,
        { carId, fileName }
    )

    return response.data?.self?.getDeviceById?.asCar?.broadcastFile as Result
}

export const BROADCAST_STOP_CAR_MUTATION = `
mutation broadcastStop($carId: ID!) {
    self {
        getDeviceById(id: $carId, deviceType: CAR) {
            asCar {
                broadcastStop {
                    resultType
                    message
                }
            }
        }
    }
}
`

export async function broadcastStopCar(
    carId: ID
): Promise<Result> {
    const response = await postGql<
        {
            self: {
                getDeviceById: {
                    asCar: {
                        broadcastStop: Result
                    }
                }
            }
        }
    >(
        BROADCAST_STOP_CAR_MUTATION,
        { carId }
    )

    return response.data?.self?.getDeviceById?.asCar?.broadcastStop as Result
}

export const BROADCAST_FILE_LIGHT_MUTATION = `
mutation broadcastFile($lightId: ID!, $fileName: String!) {
    self {
        getDeviceById(id: $lightId, deviceType: LIGHT) {
            asLight {
                broadcastFile(fileName: $fileName) {
                    resultType
                    message
                }
            }
        }
    }
}
`

export async function broadcastFileLight(
    lightId: ID,
    fileName: string
): Promise<Result> {
    const response = await postGql<
        {
            self: {
                getDeviceById: {
                    asLight: {
                        broadcastFile: Result
                    }
                }
            }
        }
    >(
        BROADCAST_FILE_LIGHT_MUTATION,
        { lightId, fileName }
    )

    return response.data?.self?.getDeviceById?.asLight?.broadcastFile as Result
}

export const BROADCAST_STOP_LIGHT_MUTATION = `
mutation broadcastStop($lightId: ID!) {
    self {
        getDeviceById(id: $lightId, deviceType: LIGHT) {
            asLight {
                broadcastStop {
                    resultType
                    message
                }
            }
        }
    }
}
`

export async function broadcastStopLight(
    lightId: ID
): Promise<Result> {
    const response = await postGql<
        {
            self: {
                getDeviceById: {
                    asLight: {
                        broadcastStop: Result
                    }
                }
            }
        }
    >(
        BROADCAST_STOP_LIGHT_MUTATION,
        { lightId }
    )

    return response.data?.self?.getDeviceById?.asLight?.broadcastStop as Result
}

export const SET_UAV_BASE_STATION_COVER_MUTATION = `
mutation setUavBaseStationCover($lightId: ID!, $open: Boolean!) {
    self {
        getDeviceById(id: $lightId, deviceType: LIGHT) {
            asLight {
                setUavBaseStationCover(open: $open) {
                    resultType
                }
            }
        }
    }
}
`

export async function setUavBaseStationCover(
    lightId: ID,
    open: boolean
): Promise<ResultType> {
    const response = await postGql<
        {
            self: {
                getDeviceById: {
                    asLight: {
                        setUavBaseStationCover: {
                            resultType: ResultType
                        }
                    }
                }
            }
        }
    >(
        SET_UAV_BASE_STATION_COVER_MUTATION,
        { lightId, open }
    )

    return response?.data?.self?.getDeviceById?.asLight?.setUavBaseStationCover?.resultType as ResultType
}

export const SET_UAV_BASE_STATION_CLAMP_MUTATION = `
mutation setUavBaseStationClamp($lightId: ID!, $open: Boolean!) {
    self {
        getDeviceById(id: $lightId, deviceType: LIGHT) {
            asLight {
                setUavBaseStationClamp(open: $open) {
                    resultType
                }
            }
        }
    }
}
`

export async function setUavBaseStationClamp(
    lightId: ID,
    open: boolean
): Promise<ResultType> {
    const response = await postGql<
        {
            self: {
                getDeviceById: {
                    asLight: {
                        setUavBaseStationClamp: {
                            resultType: ResultType
                        }
                    }
                }
            }
        }
    >(
        SET_UAV_BASE_STATION_CLAMP_MUTATION,
        { lightId, open }
    )

    return response?.data?.self?.getDeviceById?.asLight?.setUavBaseStationClamp?.resultType as ResultType
}

export const DISPATCH_MUTATION = `
mutation dispatch {
    dispatch {
        resultType
    }
}
`

export async function dispatch(): Promise<ResultType> {
    const response = await postGql<
        {
            dispatch: Result
        }
    >(
        DISPATCH_MUTATION
    )

    return response?.data?.dispatch?.resultType || ResultType.ERROR
}

export const INTERRUPT_MUTATION = `
mutation interrupt {
    interrupt {
        resultType
    }
}
`

export async function interrupt(): Promise<ResultType> {
  const response = await postGql<
    {
      interrupt: Result
    }
  >(
    INTERRUPT_MUTATION
  )

  return response?.data?.interrupt?.resultType || ResultType.ERROR
}
