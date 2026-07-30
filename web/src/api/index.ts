import axios from 'axios'

const request = axios.create({ baseURL: '/api', timeout: 15000 })

request.interceptors.response.use(
  res => res.data,
  err => { console.error(err); return Promise.reject(err) }
)

// 客户端 API
export const getDecoration = () => request.get('/customer/decoration')
export const getMenu = () => request.get('/customer/menu')
export const getAds = () => request.get('/customer/ads')
export const getTableInfo = (tableNo) => request.get(`/customer/table/${tableNo}`)
export const submitOrder = (data) => request.post('/customer/orders', data)
export const getOrderStatus = (orderNo) => request.get(`/customer/orders/${orderNo}`)
export const getTableOrders = (tableNo) => request.get('/customer/orders', { params: { tableNo } })
export const requestSettle = (tableNo) => request.post('/customer/orders/request-settle', { tableNo })

// 后厨 API
export const getKitchenOrders = (params) => request.get('/kitchen/orders', { params })
export const getKitchenHistory = (params) => request.get('/kitchen/orders/history', { params })
export const startOrder = (id) => request.put(`/kitchen/orders/${id}/start`)
export const serveItem = (orderId, itemId) => request.put(`/kitchen/orders/${orderId}/items/${itemId}/serve`)
export const serveOrder = (id) => request.put(`/kitchen/orders/${id}/serve`)
export const completeOrder = (id) => request.put(`/kitchen/orders/${id}/complete`)

export default request
