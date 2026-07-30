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
      <div v-if="orders.length === 0 && !settled" class="empty">暂无订单</div>
      <div v-if="settled" class="settled-notice">
        <p>✅ 已结算，感谢光临！</p>
      </div>
    </div>

    <!-- 底部结算栏 -->
    <div class="settle-bar" v-if="orders.length > 0 && !settled">
      <div class="settle-info">
        <span>共 {{ orders.length }} 笔订单</span>
        <span class="settle-total">合计: ¥{{ totalAmount.toFixed(2) }}</span>
      </div>
      <button
        :class="['settle-btn', { disabled: settleRequested }]"
        :disabled="settleRequested"
        @click="handleSettle"
      >
        {{ settleRequested ? '等待商家确认...' : '请求结算' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getOrderStatus, requestSettle } from '../../api'
import { joinTable, onEvent } from '../../utils/socket'

const route = useRoute()
const tableNo = ref(route.query.table || '')
const orders = ref([])
const settleRequested = ref(false)
const settled = ref(false)

const statusText = (s) => ['待制作','制作中','已上菜','已完成','已取消'][s]

const totalAmount = computed(() => {
  return orders.value.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
})

let offSettleComplete = null

const handleSettle = async () => {
  if (settleRequested.value) return
  const res = await requestSettle(tableNo.value)
  if (res.code === 200) {
    settleRequested.value = true
  } else {
    alert(res.message || '结算请求失败')
  }
}

onMounted(async () => {
  const orderNos = JSON.parse(sessionStorage.getItem('current_orders') || '[]')
  if (orderNos.length === 0) return
  const results = await Promise.all(orderNos.map(no => getOrderStatus(no)))
  // 过滤掉已结算的订单
  const allOrders = results.filter(r => r.code === 200).map(r => r.data).reverse()
  const unsettled = allOrders.filter(o => o.settleStatus !== 2)

  if (unsettled.length === 0 && allOrders.length > 0) {
    // 所有订单都已结算
    settled.value = true
    sessionStorage.removeItem('current_orders')
    sessionStorage.removeItem('current_order')
    return
  }
  orders.value = unsettled

  // 检查是否已有请求结算的订单
  if (orders.value.some(o => o.settleStatus === 1)) {
    settleRequested.value = true
  }

  // 加入桌台房间并监听结算完成事件
  if (tableNo.value) {
    joinTable(tableNo.value)
    offSettleComplete = onEvent('settle_complete', (data) => {
      if (data.tableNo === tableNo.value) {
        settled.value = true
        settleRequested.value = false
        sessionStorage.removeItem('current_orders')
        sessionStorage.removeItem('current_order')
        orders.value = []
      }
    })
  }
})

onUnmounted(() => {
  if (offSettleComplete) offSettleComplete()
})
</script>

<style scoped>
.orders-page { height: 100vh; display: flex; flex-direction: column; background: #f5f5f5; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #fff; font-size: 16px; font-weight: bold; }
.back { color: #1989fa; font-size: 14px; font-weight: normal; cursor: pointer; }
.orders-list { flex: 1; overflow-y: auto; padding: 12px; padding-bottom: 80px; }
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
.settled-notice { text-align: center; padding: 60px 0; color: #67c23a; font-size: 18px; }

/* 底部结算栏 */
.settle-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 -2px 10px rgba(0,0,0,0.08); z-index: 100; }
.settle-info { display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: #666; }
.settle-total { font-size: 16px; color: #ee0a24; font-weight: bold; }
.settle-btn { background: #ee0a24; color: #fff; border: none; padding: 12px 28px; border-radius: 22px; font-size: 15px; font-weight: 500; cursor: pointer; }
.settle-btn.disabled { background: #ccc; cursor: not-allowed; }

@media (min-width: 768px) {
  .orders-page { max-width: 600px; margin: 0 auto; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
  .settle-bar { max-width: 600px; left: 50%; transform: translateX(-50%); }
}
</style>
