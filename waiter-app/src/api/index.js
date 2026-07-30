const BASE_URL_KEY = 'server_url'

function getBaseUrl() {
  return uni.getStorageSync(BASE_URL_KEY) || 'http://localhost:3000'
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: getBaseUrl() + '/api' + url,
      method: options.method || 'GET',
      data: options.data || {},
      header: { 'Content-Type': 'application/json' },
      success: (res) => resolve(res.data),
      fail: (err) => {
        uni.showToast({ title: '网络连接失败', icon: 'none' })
        reject(err)
      }
    })
  })
}

// 桌台
export const getTables = () => request('/waiter/tables')
export const getTableOrders = (tableNo) => request(`/waiter/tables/${tableNo}/orders`)

// 菜单
export const getMenu = () => request('/waiter/menu')

// 下单
export const submitOrder = (data) => request('/waiter/orders', { method: 'POST', data })

// 退菜
export const removeDish = (orderId, itemId) => request(`/waiter/orders/${orderId}/items/${itemId}`, { method: 'DELETE' })

export { getBaseUrl, BASE_URL_KEY }
