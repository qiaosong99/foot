<template>
  <div class="kitchen-page">
    <div class="kitchen-header">
      <h3>后厨看板</h3>
      <div class="kitchen-stats">
        <el-tag type="warning">待制作: {{ pendingCount }}</el-tag>
        <el-tag type="primary">制作中: {{ cookingCount }}</el-tag>
      </div>
    </div>
    <div class="orders-grid">
      <div v-for="order in orders" :key="order.id" :class="['order-card', 'status-' + order.status]">
        <div class="oc-header">
          <span class="oc-table">{{ order.table?.tableNo }}</span>
          <el-tag size="small" :type="order.status === 0 ? 'warning' : 'primary'">
            {{ order.status === 0 ? '待制作' : '制作中' }}
          </el-tag>
        </div>
        <div class="oc-no">{{ order.orderNo }}</div>
        <div class="oc-type">
          <el-tag size="small" effect="plain">{{ {dine_in:'堂食',takeout:'外卖',waiter:'服务员'}[order.orderType] || '堂食' }}</el-tag>
        </div>
        <div class="oc-items">
          <div v-for="item in order.items" :key="item.id" :class="['oc-item', { served: item.status === 1 }]">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-spec" v-if="item.specInfo">({{ item.specInfo }})</span>
            <span class="item-qty">x{{ item.quantity }}</span>
            <el-button v-if="item.status === 0" size="small" type="success" text @click.stop="handleServeItem(order.id, item.id)">上菜</el-button>
            <span v-else class="served-tag">已上</span>
            <el-button size="small" type="danger" text @click.stop="handleRemoveDish(order.id, item)">退菜</el-button>
          </div>
        </div>
        <div class="oc-footer">
          <span class="oc-time">{{ new Date(order.createdAt).toLocaleTimeString() }}</span>
          <div class="oc-actions">
            <el-button v-if="order.status === 0" size="small" type="primary" @click="handleStart(order.id)">开始制作</el-button>
            <el-button size="small" type="success" @click="handleServeAll(order.id)">整单上菜</el-button>
          </div>
        </div>
      </div>
      <div v-if="orders.length === 0" class="empty">暂无待处理订单</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getKitchenOrders, startOrder, serveItem, serveOrder, removeDish } from '../../api'
import { onEvent } from '../../api/socket'

const orders = ref([])
const pendingCount = computed(() => orders.value.filter(o => o.status === 0).length)
const cookingCount = computed(() => orders.value.filter(o => o.status === 1).length)

const loadOrders = async () => {
  const res = await getKitchenOrders({})
  if (res.code === 200) orders.value = res.data
}

const handleStart = async (id) => {
  const res = await startOrder(id)
  if (res.code === 200) { ElMessage.success('已开始制作'); loadOrders() }
}

const handleServeItem = async (orderId, itemId) => {
  const res = await serveItem(orderId, itemId)
  if (res.code === 200) { ElMessage.success('已上菜'); loadOrders() }
}

const handleServeAll = async (id) => {
  const res = await serveOrder(id)
  if (res.code === 200) { ElMessage.success('整单已上菜'); loadOrders() }
}

const handleRemoveDish = async (orderId, item) => {
  try {
    await ElMessageBox.confirm(`确定退掉「${item.name}」x${item.quantity}？`, '确认退菜', { type: 'warning' })
    const res = await removeDish(orderId, item.id)
    if (res.code === 200) { ElMessage.success(`已退菜: ${item.name}`); loadOrders() }
    else ElMessage.error(res.message)
  } catch (e) { /* cancelled */ }
}

// 新订单声音提醒
const playSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    osc.connect(ctx.destination)
    osc.frequency.value = 800
    osc.start()
    setTimeout(() => { osc.stop(); ctx.close() }, 300)
  } catch (e) {}
}

let offs = []
onMounted(() => {
  loadOrders()
  offs.push(onEvent('new_order', (order) => { playSound(); loadOrders() }))
  offs.push(onEvent('order_status_change', () => loadOrders()))
  offs.push(onEvent('dish_removed', () => loadOrders()))
})
onUnmounted(() => offs.forEach(off => off()))
</script>

<style scoped>
.kitchen-page { height: 100%; display: flex; flex-direction: column; padding: 16px; }
.kitchen-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.kitchen-header h3 { font-size: 18px; color: #333; }
.kitchen-stats { display: flex; gap: 10px; }
.orders-grid { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; align-content: start; }
.order-card { background: #fff; border-radius: 10px; padding: 14px; border-left: 4px solid #e6a23c; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.order-card.status-1 { border-left-color: #409eff; }
.oc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.oc-table { font-size: 20px; font-weight: bold; color: #333; }
.oc-no { font-size: 12px; color: #999; margin-bottom: 4px; }
.oc-type { margin-bottom: 8px; }
.oc-items { border-top: 1px solid #f0f0f0; padding-top: 8px; }
.oc-item { display: flex; align-items: center; gap: 6px; padding: 4px 0; font-size: 14px; }
.oc-item.served { opacity: 0.5; text-decoration: line-through; }
.item-name { font-weight: 500; }
.item-spec { color: #999; font-size: 12px; }
.item-qty { color: #ee0a24; font-weight: bold; margin-left: auto; }
.served-tag { font-size: 11px; color: #67c23a; margin-left: auto; }
.oc-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid #f0f0f0; }
.oc-time { font-size: 12px; color: #999; }
.oc-actions { display: flex; gap: 6px; }
.empty { grid-column: 1 / -1; text-align: center; color: #999; padding: 60px 0; font-size: 16px; }
</style>
