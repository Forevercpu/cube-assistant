import { createRequest } from './axios'

// 保留现有错误类型导出，登录状态判断继续使用同一个 RequestError。
export { RequestError } from './axios'

// 个人网站接口实例；魔方后端可另行调用 createRequest 传入自己的前缀。
const request = createRequest(import.meta.env.VITE_APP_BASEURL_axios)

export default request
