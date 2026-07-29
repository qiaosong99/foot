<template>
  <div class="orders-page">
    <div class="page-header">
      <span class="back" @click="$router.push('/c/menu?table=' + tableNo)">← 返回</span>
      <span>我的订单</span>
      <span></span>
    </div>
    <div class="orders-list">
      <div v-for="order in orders" :key="order.id" class="order-card" @click="$router.push(`/c/order/${order.orderNo}?table=${tableNo}`)">
        <div class="order-top">
          <span class="order-no">{{ order.orderNo }}</span>
          <span :class="['order-status', 's' + order.status]">{{ statusText(order.status) }}</span>
        </div>
        <div class="order-items">
          <span v-for="item in order.items?.slice(0, 3)" :key="item.id" class="item-tag">{{ item.name }} x{{ item.quantity }}</span>
          <span v-if="order.items?.length > 3" class="item-tag">...</span>
        </div>
        <div class="order-bottom">
          <span class="order-time">{{ new Date(order.createdAt).toLocaleString() }}</span>
          <span class="order-price">¥{{ order.totalPrice?.toFixed(2) }}</span>
        </div>
      </div>
      <div v-if="orders.length === 0" class="empty">暂无订单</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getOrderStatus } from '../../api'

const route = useRoute()
const tableNo = ref(route.query.table || '')
const orders = ref([])

const statusText = (s) => ['待制作','制作中','已上菜','已完成','已取消'][s]

onMounted(async () => {
  const orderNos = JSON.parse(sessionStorage.getItem('current_orders') || '[]')
  if (orderNos.length === 0) return
  // 逐个获取订单详情
  const results = await Promise.all(orderNos.map(no => getOrderStatus(no)))
  orders.value = results.filter(r => r.code === 200).map(r => r.data).reverse()
})
</script>

<style scoped>
.orders-page { height: 100vh; display: flex; flex-direction: column; background: #f5f5f5; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #fff; font-size: 16px; font-weight: bold; }
.back { color: #1989fa; font-size: 14px; font-weight: normal; cursor: pointer; }
.orders-list { flex: 1; overflow-y: auto; padding: 12px; }
.order-card { background: #fff; border-radius: 8px; padding: 14px; margin-bottom: 10px; cursor: pointer; }
.order-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.order-no { font-size: 13px; color: #666; }
.order-status { font-size: 12px; padding: 2px 8px; border-radius: 4px; }
.order-status.s0 { background: #fdf6ec; color: #e6a23c; }
.order-status.s1 { background: #ecf5ff; color: #409eff; }
.order-status.s2 { background: #f0f9eb; color: #67c23a; }
.order-status.s3 { background: #f4f4f5; color: #909399; }
.order-status.s4 { background: #fef0f0; color: #f56c6c; }
.order-items { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.item-tag { font-size: 12px; background: #f5f5f5; padding: 2px 8px; border-radius: 4px; color: #666; }
.order-bottom { display: flex; justify-content: space-between; font-size: 13px; color: #999; }
.order-price { color: #ee0a24; font-weight: bold; }
.empty { text-align: center; color: #999; padding: 60px 0; }

@media (min-width: 768px) {
  .orders-page { max-width: 600px; margin: 0 auto; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
}
</style>
