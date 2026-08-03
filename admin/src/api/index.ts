import request from './request'

// 登录
export const login = (data: any) => request.post('/admin/login', data)
export const getUserInfo = () => request.get('/admin/info')

// 分类
export const getCategories = () => request.get('/admin/categories')
export const addCategory = (data: any) => request.post('/admin/categories', data)
export const updateCategory = (id: number, data: any) => request.put(`/admin/categories/${id}`, data)
export const deleteCategory = (id: number) => request.delete(`/admin/categories/${id}`)

// 菜品
export const getProducts = (params?: any) => request.get('/admin/products', { params })
export const addProduct = (data: any) => request.post('/admin/products', data)
export const updateProduct = (id: number, data: any) => request.put(`/admin/products/${id}`, data)
export const deleteProduct = (id: number) => request.delete(`/admin/products/${id}`)

// 桌台
export const getTables = () => request.get('/admin/tables')
export const addTable = (data: any) => request.post('/admin/tables', data)
export const updateTable = (id: number, data: any) => request.put(`/admin/tables/${id}`, data)
export const deleteTable = (id: number) => request.delete(`/admin/tables/${id}`)
export const getTableQrcode = (id: number) => request.get(`/admin/tables/${id}/qrcode`)
export const refreshAllQrcodes = () => request.put('/admin/tables/qrcode/refresh-all')

// 订单
export const getOrders = (params?: any) => request.get('/admin/orders', { params })
export const updateOrderStatus = (id: number, status: number) => request.put(`/admin/orders/${id}/status`, { status })

// 会员
export const getMembers = (params?: any) => request.get('/admin/members', { params })
export const addMember = (data: any) => request.post('/admin/members', data)
export const updateMember = (id: number, data: any) => request.put(`/admin/members/${id}`, data)
export const deleteMember = (id: number) => request.delete(`/admin/members/${id}`)

// 优惠券
export const getCoupons = () => request.get('/admin/coupons')
export const addCoupon = (data: any) => request.post('/admin/coupons', data)
export const updateCoupon = (id: number, data: any) => request.put(`/admin/coupons/${id}`, data)
export const deleteCoupon = (id: number) => request.delete(`/admin/coupons/${id}`)

// 广告
export const getAds = () => request.get('/admin/ads')
export const addAd = (data: any) => request.post('/admin/ads', data)
export const updateAd = (id: number, data: any) => request.put(`/admin/ads/${id}`, data)
export const deleteAd = (id: number) => request.delete(`/admin/ads/${id}`)

// 设置
export const getSettings = () => request.get('/admin/settings')
export const updateSettings = (data: any) => request.put('/admin/settings', data)

// 统计
export const getDashboard = () => request.get('/admin/dashboard')

// 装修
export const getDecoration = () => request.get('/admin/decoration')
export const saveDecoration = (data: any) => request.put('/admin/decoration', data)
