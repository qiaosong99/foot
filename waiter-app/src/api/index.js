const BASE_URL_KEY = 'server_url'

function getBaseUrl() {
  return uni.getStorageSync(BASE_URL_KEY) || ''
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const base = getBaseUrl()
    if (!base) {
      uni.showToast({ title: '请先在设置中配置服务器地址', icon: 'none' })
      reject(new Error('服务器地址未配置'))
      return
    }
    uni.request({
      url: base + '/api' + url,
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
