<template>
  <div class="refund-page">
    <!-- 左侧：桌台列表 -->
    <div class="refund-left">
      <h4>选择桌台</h4>
      <div class="table-grid">
        <div
          v-for="t in tables" :key="t.id"
          :class="['table-card', { busy: t.status === 1, selected: selectedTable?.id === t.id }]"
          @click="selectTable(t)"
        >
          <span class="t-no">{{ t.tableNo }}</span>
          <span class="t-status">{{ t.status === 1 ? '使用中' : '空闲' }}</span>
        </div>
      </div>
    </div>

    <!-- 右侧：当前点单 + 退菜 -->
    <div class="refund-right">
      <div class="right-header">
        <h4 v-if="selectedTable">{{ selectedTable.tableNo }} 桌 - 当前点单</h4>
        <h4 v-else>当前点单</h4>
        <span class="total" v-if="totalAmount > 0">消费: ¥{{ totalAmount.toFixed(2) }}</span>
        <el-button size="small" @click="loadOrders" :disabled="!selectedTable">刷新</el-button>
      </div>

      <div v-if="!selectedTable" class="empty-tip">请在左侧选择桌台</div>
      <div v-else-if="orders.length === 0" class="empty-tip">该桌暂无点单</div>

      <div v-for="order in orders" :key="order.id" class="order-card">
        <div class="oc-header">
          <span class="oc-no">{{ order.orderNo }}</span>
          <el-tag size="small">{{ ['待制作','制作中','已上菜','已完成','已取消'][order.status] }}</el-tag>
          <span class="oc-price">¥{{ order.totalPrice.toFixed(2) }}</span>
        </div>
        <div v-if="order.items.length === 0" class="oc-empty">（菜品已退完）</div>
        <div v-for="item in order.items" :key="item.id" class="oc-item">
          <span class="item-name">{{ item.name }}<span class="item-spec" v-if="item.specInfo">({{ item.specInfo }})</span></span>
          <span class="item-qty">x{{ item.quantity }}</span>
          <span class="item-sub">¥{{ (item.price * item.quantity).toFixed(2) }}</span>
          <el-button size="small" type="danger" plain @click="handleRemove(order, item)">退菜</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTables, removeDish } from '../../api'
import request from '../../api'
import { onEvent } from '../../api/socket'

const tables = ref([])
const selectedTable = ref(null)
const orders = ref([])

const totalAmount = computed(() => orders.value.reduce((sum, o) => sum + (o.totalPrice || 0), 0))

const loadTables = async () => {
  const res = await getTables()
  if (res.code === 200) tables.value = res.data
}

const selectTable = (t) => {
  selectedTable.value = t
  loadOrders()
}

const loadOrders = async () => {
  if (!selectedTable.value) return
  const res = await request.get(`/waiter/tables/${selectedTable.value.tableNo}/orders`)
  if (res.code === 200) orders.value = res.data
}

const handleRemove = async (order, item) => {
  try {
    await ElMessageBox.confirm(
      `确定退掉「${item.name}」x${item.quantity} 吗？`,
      '确认退菜',
      { type: 'warning', confirmButtonText: '退菜', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  const res = await removeDish(order.id, item.id)
  if (res.code === 200) {
    ElMessage.success(`已退菜: ${item.name}`)
    loadOrders()
    loadTables()
  } else {
    ElMessage.error(res.message)
  }
}

let offs = []
onMounted(() => {
  loadTables()
  // 订单/退菜/桌台变化时自动刷新
  const refreshAll = () => { loadTables(); if (selectedTable.value) loadOrders() }
  offs.push(onEvent('new_order', refreshAll))
  offs.push(onEvent('dish_removed', refreshAll))
  offs.push(onEvent('table_status_change', () => loadTables()))
  offs.push(onEvent('settle_complete', refreshAll))
})
onUnmounted(() => offs.forEach(off => off()))
</script>

<style scoped>
.refund-page { height: 100%; display: grid; grid-template-columns: 340px 1fr; gap: 16px; padding: 16px; }
.refund-left, .refund-right { background: #fff; border-radius: 8px; padding: 16px; overflow-y: auto; }
.refund-left h4, .refund-right h4 { font-size: 15px; color: #333; margin-bottom: 12px; }
.table-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.table-card { border: 1px solid #eee; border-radius: 8px; padding: 12px 8px; text-align: center; cursor: pointer; transition: all 0.2s; }
.table-card:hover { border-color: #409eff; }
.table-card.busy { background: #fdf6ec; border-color: #e6a23c; }
.table-card.selected { border-color: #409eff; background: #ecf5ff; box-shadow: 0 0 0 2px rgba(64,158,255,0.2); }
.t-no { display: block; font-size: 16px; font-weight: bold; color: #333; }
.t-status { display: block; font-size: 12px; color: #999; margin-top: 4px; }
.table-card.busy .t-status { color: #e6a23c; }
.right-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.right-header h4 { margin-bottom: 0; }
.total { font-size: 15px; color: #ee0a24; font-weight: bold; flex: 1; }
.empty-tip { text-align: center; color: #999; padding: 60px 0; }
.order-card { border: 1px solid #f0f0f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
.oc-header { display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 1px dashed #eee; margin-bottom: 8px; }
.oc-no { font-size: 13px; color: #999; flex: 1; }
.oc-price { font-size: 15px; color: #ee0a24; font-weight: bold; }
.oc-empty { color: #999; font-size: 13px; padding: 8px 0; }
.oc-item { display: flex; align-items: center; gap: 14px; padding: 8px 0; }
.item-name { flex: 1; font-size: 14px; color: #333; }
.item-spec { color: #999; font-size: 12px; margin-left: 4px; }
.item-qty { font-size: 13px; color: #666; width: 40px; }
.item-sub { font-size: 14px; color: #333; width: 70px; text-align: right; }
</style>
