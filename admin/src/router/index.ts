import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue')
  },
  {
    path: '/',
    component: () => import('../layout/index.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/dashboard/index.vue'), meta: { title: '首页概览', icon: 'HomeFilled' } },
      { path: 'product/category', name: 'Category', component: () => import('../views/product/category.vue'), meta: { title: '分类管理', icon: 'Menu' } },
      { path: 'product/list', name: 'Product', component: () => import('../views/product/list.vue'), meta: { title: '菜品管理', icon: 'Food' } },
      { path: 'order/list', name: 'Order', component: () => import('../views/order/list.vue'), meta: { title: '订单管理', icon: 'List' } },
      { path: 'table/list', name: 'Table', component: () => import('../views/table/list.vue'), meta: { title: '桌台管理', icon: 'Grid' } },
      { path: 'member/list', name: 'Member', component: () => import('../views/member/list.vue'), meta: { title: '会员管理', icon: 'User' } },
      { path: 'coupon/list', name: 'Coupon', component: () => import('../views/coupon/list.vue'), meta: { title: '优惠券管理', icon: 'Ticket' } },
      { path: 'ads/list', name: 'Ads', component: () => import('../views/ads/list.vue'), meta: { title: '广告管理', icon: 'Picture' } },
      { path: 'decoration', name: 'Decoration', component: () => import('../views/decoration/index.vue'), meta: { title: '页面装修', icon: 'Brush' } },
      { path: 'settings', name: 'Settings', component: () => import('../views/settings/index.vue'), meta: { title: '系统设置', icon: 'Setting' } },
    ]
  }
]

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
