import request from './request'

export interface UserProfile {
  email: string
  avatar: string | null
  nickname: string | null
}

export const login = (email: string, password: string) =>
  request<{ token: string }>({
    url: '/auth/login',
    method: 'POST',
    data: { email, password },
  })

export const register = (email: string, password: string, code: string) =>
  request<string>({
    url: '/auth/register',
    method: 'POST',
    data: { email, password, code },
  })

export const sendVerificationCode = (email: string) =>
  request<string>({
    url: '/auth/sendcode',
    method: 'POST',
    data: { email },
  })

export const getProfile = (token: string) =>
  request<UserProfile | null>({
    url: '/user/profile',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
