import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/c/menu' },
  // 客户端
  { path: '/c/menu', name: 'CustomerMenu', component: () => import('../views/customer/Menu.vue') },
  { path: '/c/cart', name: 'CustomerCart', component: () => import('../views/customer/Cart.vue') },
  { path: '/c/order/:orderNo', name: 'OrderStatus', component: () => import('../views/customer/OrderStatus.vue') },
  { path: '/c/orders', name: 'CustomerOrders', component: () => import('../views/customer/Orders.vue') },
  // 后厨端
  { path: '/kitchen', name: 'Kitchen', component: () => import('../views/kitchen/Index.vue') },
  { path: '/kitchen/history', name: 'KitchenHistory', component: () => import('../views/kitchen/History.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 动态设置页面标题
router.afterEach((to) => {
  if (to.path.startsWith('/kitchen')) {
    document.title = '后厨'
  } else if (to.path.startsWith('/c/')) {
    const table = (to.query.table as string) || ''
    document.title = table ? `${table}桌 点餐` : '点餐'
  }
})

export default router
