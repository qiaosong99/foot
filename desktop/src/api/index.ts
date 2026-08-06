import axios from 'axios'

const request = axios.create({ timeout: 15000 })

// 动态设置 baseURL
function getBaseURL() {
  const serverUrl = localStorage.getItem('server_url') || 'http://localhost:3000'
  return serverUrl + '/api'
}

request.interceptors.request.use(config => {
  config.baseURL = getBaseURL()
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  res => res.data,
  err => { console.error(err); return Promise.reject(err) }
)

// 登录
export const login = (data) => request.post('/admin/login', data)

// 大屏
export const getScreenTables = () => request.get('/admin/screen/tables')

// 结算
export const getSettlePending = () => request.get('/admin/settle-pending')
export const settleOrder = (id) => request.put(`/admin/orders/${id}/settle`)
export const settleTableAll = (tableId) => request.put(`/admin/tables/${tableId}/settle-all`)

// 后厨
export const getKitchenOrders = (params) => request.get('/kitchen/orders', { params })
export const startOrder = (id) => request.put(`/kitchen/orders/${id}/start`)
export const serveItem = (orderId, itemId) => request.put(`/kitchen/orders/${orderId}/items/${itemId}/serve`)
export const serveOrder = (id) => request.put(`/kitchen/orders/${id}/serve`)
export const completeOrder = (id) => request.put(`/kitchen/orders/${id}/complete`)
export const removeDish = (orderId, itemId) => request.delete(`/waiter/orders/${orderId}/items/${itemId}`)

// 外卖
export const getMenu = () => request.get('/customer/menu')
export const createTakeoutOrder = (data) => request.post('/admin/takeout/orders', data)

// 桌台
export const getTables = () => request.get('/admin/tables')
export const createTable = (data) => request.post('/admin/tables', data)
export const updateTable = (id, data) => request.put(`/admin/tables/${id}`, data)
export const deleteTable = (id) => request.delete(`/admin/tables/${id}`)
export const forceReleaseTable = (id) => request.put(`/admin/tables/${id}/force-release`)

// 菜品管理
export const getProducts = (params) => request.get('/admin/products', { params })
export const createProduct = (data) => request.post('/admin/products', data)
export const updateProduct = (id, data) => request.put(`/admin/products/${id}`, data)
export const deleteProduct = (id) => request.delete(`/admin/products/${id}`)

// 分类管理
export const getCategories = () => request.get('/admin/categories')
export const createCategory = (data) => request.post('/admin/categories', data)
export const updateCategory = (id, data) => request.put(`/admin/categories/${id}`, data)
export const deleteCategory = (id) => request.delete(`/admin/categories/${id}`)

// 订单管理
export const getOrders = (params) => request.get('/admin/orders', { params })
export const updateOrderStatus = (id, status) => request.put(`/admin/orders/${id}/status`, { status })

// 报表
export const getReportSummary = (params) => request.get('/admin/reports/summary', { params })

// 打印机
export const getPrinterConfig = () => request.get('/admin/printer/config')
export const savePrinterConfig = (data) => request.put('/admin/printer/config', data)
export const deletePrinterConfig = (id) => request.delete(`/admin/printer/config/${id}`)
export const testPrinter = (data) => request.post('/admin/printer/test', data)

// 小票模板
export const getReceiptTemplate = () => request.get('/admin/printer/template')
export const saveReceiptTemplate = (data) => request.put('/admin/printer/template', data)
export const previewReceipt = (data) => request.post('/admin/printer/preview', data)

// 统计
export const getDashboard = () => request.get('/admin/dashboard')

// 设置
export const getSettings = () => request.get('/admin/settings')
export const saveSettings = (data) => request.put('/admin/settings', data)

export default request
