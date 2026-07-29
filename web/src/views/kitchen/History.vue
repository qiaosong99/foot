<template>
  <div class="history-page">
    <div class="kitchen-header">
      <h2>历史订单</h2>
      <button class="back-btn" @click="$router.push('/kitchen')">← 返回看板</button>
    </div>
    <div class="history-list">
      <div v-for="order in orders" :key="order.id" class="history-card">
        <div class="card-top">
          <span class="table-no">{{ order.table?.tableNo }} 桌</span>
          <span :class="['status', order.status === 2 ? 'served' : 'done']">
            {{ order.status === 2 ? '已上菜' : '已完成' }}
          </span>
        </div>
        <div class="card-items">
          <span v-for="item in order.items" :key="item.id" class="item">{{ item.name }} x{{ item.quantity }}</span>
        </div>
        <div class="card-bottom">
          <span>{{ new Date(order.createdAt).toLocaleString() }}</span>
          <span class="price">¥{{ order.totalPrice?.toFixed(2) }}</span>
        </div>
      </div>
      <div v-if="orders.length === 0" class="empty">暂无历史订单</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getKitchenHistory } from '../../api'

const orders = ref([])

onMounted(async () => {
  const res = await getKitchenHistory({ page: 1, pageSize: 50 })
  if (res.code === 200) orders.value = res.data.list
})
</script>

<style scoped>
.history-page { height: 100vh; display: flex; flex-direction: column; background: #1a1a2e; color: #fff; }
.kitchen-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: #16213e; }
.kitchen-header h2 { font-size: 20px; }
.back-btn { background: #0f3460; border: 1px solid #555; color: #fff; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.history-list { flex: 1; overflow-y: auto; padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; align-content: start; }
.history-card { background: #16213e; border-radius: 8px; padding: 14px; }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.table-no { font-weight: bold; font-size: 15px; }
.status { font-size: 12px; padding: 2px 8px; border-radius: 4px; }
.status.served { background: rgba(39,174,96,0.2); color: #27ae60; }
.status.done { background: rgba(149,165,166,0.2); color: #95a5a6; }
.card-items { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.item { font-size: 12px; background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px; color: #ccc; }
.card-bottom { display: flex; justify-content: space-between; font-size: 12px; color: #888; }
.price { color: #ffd93d; }
.empty { grid-column: 1 / -1; text-align: center; color: #666; padding: 60px 0; }

@media (max-width: 767px) {
  .history-list { grid-template-columns: 1fr; }
}
</style>
