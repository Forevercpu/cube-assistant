import axios, { type AxiosRequestConfig } from 'axios'

interface ApiResponse<T> {
  code: number
  data: T
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

// 与个人网站共用接口；生产环境可使用同源 /api 代理或配置完整后端地址。
const client = axios.create({
  baseURL: import.meta.env.VITE_APP_BASEURL_axios,
  timeout: 10000,
})

function responseError(result: ApiResponse<unknown> | undefined, status: number) {
  const message = result?.msg || result?.message
  return new RequestError(
    (Array.isArray(message) ? message.join('，') : message) || '请求失败，请稍后重试',
    status === 401 || result?.code === 401 ? 401 : status,
  )
}

export default async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await client.request<ApiResponse<T>>(config)
    if (response.data?.code !== 200) {
      throw responseError(response.data, response.status)
    }
    return response.data.data
  } catch (error) {
    if (error instanceof RequestError) throw error
    if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
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
