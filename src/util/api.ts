import type { Client, FormattedExecutionResult, Sink } from "graphql-ws"
import { createClient } from "graphql-ws"
import { WebSocket } from "vite"
import axios, { ResponseType } from "axios"
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

export enum DeviceType {
    CAR = "CAR",
    LIGHT = "LIGHT",
}

export enum OnlineState {
    ONLINE = "ONLINE",
    OFFLINE = "OFFLINE",
}

enum ResultType {
    SUCCESSFUL = "SUCCESSFUL",
    FAIL = "FAIL",
    ERROR = "ERROR",
}


export interface DeviceOnlineStateSwitchEvent {
    onlineState: OnlineState
    deviceType: DeviceType
    deviceId: number
    deviceName: string

    [key: string]: unknown;
}

export interface Device {
    id: number
    userId: number
    name: string
    createdAt: Date
    updatedAt: Date

    online: Boolean
}

export interface Light extends Device {

}

export interface Car extends Device {

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

export interface LightState {
    enableWirelessCharging: Boolean
    wirelessChargingPower: number

    [key: string]: unknown;
}

export interface CarState {

    [key: string]: unknown;
}

export interface TimeRange {
    start: DateTime
    end: DateTime
}

const TOKEN_KEY = "auth_token"

const state = {
    token: localStorage.getItem(TOKEN_KEY),
    client: null as Client | null,
    activateLight: null as Light | null,
    activateCar: null as Car | null
}

export const computedActivateLight = () => computedAsync<Light>(async () => {
    let id = router.currentRoute.value.query.id
    if (!id) {
        return null
    }
    id = Number(id)
    if (state.activateLight && state.activateLight.id === id) {
        return state.activateLight
    }
    state.activateLight = await getLightById(id)
    return state.activateLight
}, {})


export const computedActivateCar = () => computedAsync<Car>(async () => {
    let id = router.currentRoute.value.query.id
    if (!id) {
        return null
    }
    id = Number(id)
    if (state.activateCar && state.activateCar.id === id) {
        return state.activateCar
    }
    return state.activateCar
}, {})

// 创建客户端
export function createDefWebSocketClient(): Client {
    state.client = createClient({
        url: "/api/graphql",
        connectionParams: {
            Authorization: getToken(),
            linkType: "WEBSOCKET"
        },
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
    return state.client
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
            deviceType
            deviceId
            deviceName
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
        enableWirelessCharging
        wirelessChargingPower
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

export interface GraphqlResponse<D> {
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
        getLightById(id: $id) {
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

export async function getLightById(id: number): Promise<Light> {
    const graphqlResponse = await postGql<
            {
                self: {
                    getLightById: Light
                }
            }
    >(LIGHT_QUERY, { id })
    return graphqlResponse.data?.self?.getLightById as Light
}

export const CART_QUERY = `
query getCarById($id: ID!){
    self {
        getCarById(id: $id) {
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

export async function getCarById(id: number): Promise<Car> {
    const graphqlResponse = await postGql<
            {
                self: {
                    getCarById: Car
                }
            }
    >(CART_QUERY, { id })
    return graphqlResponse.data?.self?.getCarById as Car
}

export const LIGHTS_QUERY = `
query {
  self {
    lights {
      id
      name
      online
      createdAt
      updatedAt
    }
  }
}
`

export async function getLightList(): Promise<Light[]> {
    const graphqlResponse = await postGql<
            {
                self: {
                    lights: Light[]
                }
            }
    >(LIGHTS_QUERY)
    return graphqlResponse.data?.self?.lights as Light[]
}

export const CARS_QUERY = `
query {
  self {
    cars {
      id
      name
      online
      createdAt
      updatedAt
    }
  }
}
`

export async function getCarList(): Promise<Car[]> {
    const graphqlResponse = await postGql<
            {
                self: {
                    cars: Car[]
                }
            }
    >(CARS_QUERY)
    return graphqlResponse.data?.self?.cars as Car[]
}


export const LIGHT_DATA_QUERY = `
   query getLightHistory($lightId: ID!, $timeRange: TimeRange) {
    self{
      getLightById(id: $lightId) {
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
                    getLightById: {
                        datas: LightData[]
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

    return response.data?.self?.getLightById?.datas as LightData[]

}

export const SET_LIGHT_GEAR_MUTATION = `
mutation setGear($lightId: ID!, $value: Int!) {
    self{
        getLightById(id: $lightId) {
            setGear(value: $value) {
                resultType
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
                    getLightById: {
                        setGear: {
                            resultType: ResultType
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

    return response?.data?.self?.getLightById?.setGear?.resultType as ResultType

}

export const SET_AUTOMATIC_GEAR_MUTATION = `
mutation setAutomaticGear($lightId: ID!, $value: Int!) {
    self{
        getLightById(id: $lightId) {
            setAutomaticGear(value: $value) {
                resultType
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
                    getLightById: {
                        setAutomaticGear: {
                            resultType: ResultType
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

    return response?.data?.self?.getLightById?.setAutomaticGear?.resultType as ResultType

}
