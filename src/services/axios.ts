import axios, { type AxiosRequestConfig, type CreateAxiosDefaults } from 'axios'

// 与后端 ResponseInterceptor 的统一响应结构对应。
export interface ApiResponse<T> {
  code: number
  data: T
  msg: string
}

// 同时兼容未经过统一异常过滤器的校验错误。
interface ApiErrorResponse {
  code?: number
  msg?: string
  message?: string | string[]
}

export class RequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'RequestError'
    this.status = status
  }
}

function responseError(result: ApiErrorResponse | undefined, status: number) {
  const message = result?.msg || result?.message
  return new RequestError(
    (Array.isArray(message) ? message.join('，') : message) || '请求失败，请稍后重试',
    status === 401 || result?.code === 401 ? 401 : status,
  )
}

/** 按接口前缀创建独立实例；各后端的默认请求配置互不影响。 */
export function createRequest(baseURL: string, options: Omit<CreateAxiosDefaults, 'baseURL'> = {}) {
  const client = axios.create({
    timeout: 10000,
    ...options,
    baseURL,
  })

  // 调用方的泛型表示业务 data 的类型，统一响应外壳在此解包。
  return async function request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await client.request<ApiResponse<T>>(config)
      if (response.data?.code !== 200) {
        throw responseError(response.data, response.status)
      }
      return response.data.data
    } catch (error) {
      if (error instanceof RequestError) throw error
      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          throw new Error('请求超时，请稍后重试')
        }
        if (error.response) {
          throw responseError(error.response.data, error.response.status)
        }
      }
      throw new Error('无法连接服务，请检查网络或后端配置')
    }
  }
}
