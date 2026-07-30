import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/screen' },
  { path: '/screen', name: 'Screen', component: () => import('../views/screen/Index.vue') },
  { path: '/kitchen', name: 'Kitchen', component: () => import('../views/kitchen/Index.vue') },
  { path: '/cashier', name: 'Cashier', component: () => import('../views/cashier/Index.vue') },
  { path: '/takeout', name: 'Takeout', component: () => import('../views/takeout/Index.vue') },
  { path: '/admin', name: 'Admin', component: () => import('../views/admin/Index.vue') },
  { path: '/settings', name: 'Settings', component: () => import('../views/settings/Index.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
