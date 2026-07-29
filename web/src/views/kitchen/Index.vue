<template>
  <div class="kitchen-page">
    <div class="kitchen-header">
      <h2>后厨订单看板</h2>
      <div class="header-actions">
        <span class="pending-count">待处理: {{ orders.length }}</span>
        <button class="history-btn" @click="$router.push('/kitchen/history')">历史记录</button>
      </div>
    </div>

    <div class="kitchen-board" v-if="orders.length > 0">
      <div v-for="order in orders" :key="order.id" :class="['order-card', order.status === 0 ? 'new' : 'cooking']">
        <div class="card-header">
          <span class="table-no">{{ order.table?.tableNo }} 桌</span>
          <span :class="['status-badge', order.status === 0 ? 'new' : 'cooking']">
            {{ order.status === 0 ? '新订单' : '制作中' }}
          </span>
        </div>
        <div class="card-time">
          {{ formatTime(order.createdAt) }} | 等待 {{ getWaitTime(order.createdAt) }}
        </div>
        <div class="card-items">
          <div v-for="item in order.items" :key="item.id" :class="['dish-item', { done: item.status === 1 }]">
            <span class="dish-name">{{ item.name }}</span>
            <span class="dish-spec" v-if="item.specInfo">({{ item.specInfo }})</span>
            <span class="dish-qty">x{{ item.quantity }}</span>
            <button v-if="item.status === 0" class="serve-item-btn" @click="handleServeItem(order, item)">✓</button>
            <span v-else class="served-mark">已出</span>
          </div>
        </div>
        <div class="card-remark" v-if="order.remark">备注: {{ order.remark }}</div>
        <div class="card-actions">
          <button v-if="order.status === 0" class="btn-start" @click="handleStart(order)">开始制作</button>
          <button class="btn-serve" @click="handleServeAll(order)">整单上菜</button>
          <button v-if="order.status === 2" class="btn-complete" @click="handleComplete(order)">完成</button>
        </div>
      </div>
    </div>

    <div v-else class="empty-board">
      <p>暂无待处理订单</p>
      <p class="empty-sub">新订单将实时显示在这里</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getKitchenOrders, startOrder, serveItem, serveOrder, completeOrder } from '../../api'
import { joinKitchen, onEvent } from '../../utils/socket'

const orders = ref([])

const loadOrders = async () => {
  const res = await getKitchenOrders()
  if (res.code === 200) orders.value = res.data
}

const formatTime = (t) => new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
const getWaitTime = (t) => {
  const mins = Math.floor((Date.now() - new Date(t).getTime()) / 60000)
  return mins < 1 ? '刚刚' : `${mins}分钟`
}

const playNotify = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    osc.connect(ctx.destination)
    osc.frequency.value = 800
    osc.start()
    setTimeout(() => { osc.stop(); ctx.close() }, 300)
  } catch(e) {}
}

const handleStart = async (order) => {
  await startOrder(order.id)
  loadOrders()
}

const handleServeItem = async (order, item) => {
  await serveItem(order.id, item.id)
  loadOrders()
}

const handleServeAll = async (order) => {
  await serveOrder(order.id)
  loadOrders()
}

const handleComplete = async (order) => {
  await completeOrder(order.id)
  loadOrders()
}

let cleanup = null
onMounted(() => {
  loadOrders()
  joinKitchen()
  cleanup = onEvent('new_order', (order) => {
    orders.value.push(order)
    playNotify()
  })
  onEvent('order_status_change', () => loadOrders())
  const timer = setInterval(loadOrders, 10000)
  onUnmounted(() => { clearInterval(timer); if (cleanup) cleanup() })
})
</script>

<style scoped>
.kitchen-page { height: 100vh; display: flex; flex-direction: column; background: #1a1a2e; color: #fff; }
.kitchen-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: #16213e; }
.kitchen-header h2 { font-size: 20px; }
.header-actions { display: flex; align-items: center; gap: 16px; }
.pending-count { font-size: 14px; color: #ffd93d; }
.history-btn { background: #0f3460; border: 1px solid #555; color: #fff; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.kitchen-board { flex: 1; overflow-y: auto; padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; align-content: start; }
.order-card { background: #16213e; border-radius: 10px; padding: 16px; border-left: 4px solid #555; }
.order-card.new { border-left-color: #ff6b6b; animation: pulse 1.5s ease-in-out infinite alternate; }
.order-card.cooking { border-left-color: #ffd93d; }
@keyframes pulse { from { box-shadow: 0 0 0 0 rgba(255,107,107,0.3); } to { box-shadow: 0 0 12px 2px rgba(255,107,107,0.2); } }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.table-no { font-size: 18px; font-weight: bold; }
.status-badge { font-size: 12px; padding: 3px 10px; border-radius: 12px; }
.status-badge.new { background: #ff6b6b; }
.status-badge.cooking { background: #ffd93d; color: #333; }
.card-time { font-size: 12px; color: #aaa; margin-bottom: 10px; }
.card-items { margin-bottom: 10px; }
.dish-item { display: flex; align-items: center; gap: 6px; padding: 5px 0; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.dish-item.done { opacity: 0.5; text-decoration: line-through; }
.dish-name { font-weight: 500; }
.dish-spec { font-size: 12px; color: #aaa; }
.dish-qty { color: #ffd93d; margin-left: auto; }
.serve-item-btn { width: 22px; height: 22px; border-radius: 50%; background: #27ae60; border: none; color: #fff; cursor: pointer; font-size: 12px; }
.served-mark { font-size: 11px; color: #27ae60; }
.card-remark { font-size: 12px; color: #ff9f43; margin-bottom: 10px; padding: 6px; background: rgba(255,159,67,0.1); border-radius: 4px; }
.card-actions { display: flex; gap: 8px; }
.card-actions button { flex: 1; padding: 8px; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 500; }
.btn-start { background: #3498db; color: #fff; }
.btn-serve { background: #27ae60; color: #fff; }
.btn-complete { background: #95a5a6; color: #fff; }
.empty-board { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #666; }
.empty-board p { font-size: 18px; }
.empty-sub { font-size: 13px; margin-top: 8px; }

@media (max-width: 767px) {
  .kitchen-board { grid-template-columns: 1fr; }
}
</style>
