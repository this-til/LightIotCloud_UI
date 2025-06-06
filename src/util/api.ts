import type { Client, FormattedExecutionResult, Sink } from "graphql-ws"
import { createClient } from "graphql-ws"
import { WebSocket } from "vite"
import axios from "axios"
import type { AxiosInstance, AxiosRequestConfig, AxiosError, RawAxiosRequestHeaders, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from "axios"
import { getToken, isTokenValid, removeToken } from "./auth"

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

export interface DeviceOnlineStateSwitchEvent {
    onlineState: OnlineState
    deviceType: DeviceType
    deviceId: number

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

// 创建客户端
export function createWebSocketClient(url: string, jwt: string): Client {
    return createClient({
        url: url,
        connectionParams: {
            Authorization: jwt,
            linkType: "WEBSOCKET"
        }
    })
}


export type unsubscribe = () => void

export const deviceOnlineStateSwitchEventGql = `
    subscription deviceOnlineStateSwitchEventGql{
        deviceOnlineStateSwitchEvent {
            onlineState
            deviceType
            id
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
                    res => res.data as DeviceOnlineStateSwitchEvent
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
                    lightId
                }
            },
            mapSink<FormattedExecutionResult<Record<string, unknown>, unknown>, LightState>(
                    sink,
                    res => res.data as LightState
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
                query: lightStateReportEventGql,
                variables: {
                    carId
                }
            },
            mapSink<FormattedExecutionResult<Record<string, unknown>, unknown>, CarState>(
                    sink,
                    res => res.data as CarState
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

// 响应拦截器 - 处理 token 过期
api.interceptors.response.use(
        response => response,
        (error: AxiosError) => {
            if (error.response?.status === 401) {
                // token 过期或无效的处理
                removeToken()
                // 这里可以触发全局登出事件或重定向
                console.warn("Token expired, redirecting to login...")
            }
            return Promise.reject(error)
        }
)


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

export interface GraphqlResponse<D = Record<string, unknown>> {
    data?: D
    errors?: Record<string, unknown>[]

    [key: string]: unknown;
}

export async function postGql<D = Record<string, unknown>>(gql: string, variables: Record<string, unknown> = {}, headers: Record<string, unknown> = {}): Promise<GraphqlResponse<D>> {
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

export const LIGHTS_QUERY = `
query lights {
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

export async function lights(): Promise<Light[]> {
    const graphqlResponse = await postGql<{ self: { lights: Light[] } }>(LIGHTS_QUERY)
    return graphqlResponse.data?.self?.lights as Light[]
}

export const CARS_QUERY = `
query GetLights {
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

export async function cars(): Promise<Car[]> {
    const graphqlResponse = await postGql<{ self: { cars: Car[] } }>(CARS_QUERY)
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
export async function getLightHistory(
        lightId: string,
        timeRange?: TimeRange
): Promise<LightData[]> {

    const response = await postGql<
            {
                self: {
                    datas: LightData[]
                }
            }
    >(
            LIGHT_DATA_QUERY,
            {
                lightId,
                timeRange
            }
    )

    return response.data?.self?.datas as LightData[]

}

