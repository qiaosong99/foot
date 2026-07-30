<template>
  <div class="cashier-page">
    <div class="cashier-header">
      <h3>收银结算</h3>
      <div class="header-stats">
        <el-tag type="warning" v-if="pendingOrders.length > 0">{{ pendingOrders.length }} 桌待结算</el-tag>
        <el-tag type="success">今日已结算: ¥{{ todayTotal.toFixed(2) }}</el-tag>
        <el-tag>共 {{ settledOrders.length }} 笔</el-tag>
      </div>
    </div>

    <!-- 今日收入图表 -->
    <div class="chart-section" v-if="settledOrders.length > 0">
      <h4>今日收入分布</h4>
      <div class="bar-chart">
        <div v-for="h in hourlyData" :key="h.hour" class="bar-col">
          <div class="bar" :style="{ height: h.amount > 0 ? Math.max(h.amount / maxHourly * 120, 4) + 'px' : '0px' }"></div>
          <span class="bar-label">{{ h.hour }}时</span>
          <span class="bar-value" v-if="h.amount > 0">¥{{ h.amount.toFixed(0) }}</span>
        </div>
      </div>
    </div>

    <!-- 待结算提醒 -->
    <div class="pending-section" v-if="pendingOrders.length > 0">
      <h4>待结算</h4>
      <div v-for="order in pendingOrders" :key="order.id" class="settle-card">
        <div class="sc-top">
          <span class="sc-table">{{ order.table?.tableNo }}桌</span>
          <span class="sc-price">¥{{ order.totalPrice?.toFixed(2) }}</span>
          <el-button type="danger" size="small" @click="handleSettle(order)">确认结算</el-button>
        </div>
      </div>
    </div>

    <!-- 今日已结算 -->
    <div class="history-section">
      <h4>今日已结算</h4>
      <el-table :data="settledOrders" size="small" stripe>
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column label="桌号" width="80">
          <template #default="{ row }">{{ row.table?.tableNo }}</template>
        </el-table-column>
        <el-table-column label="类型" width="80">
          <template #default="{ row }">{{ {dine_in:'堂食',takeout:'外卖',waiter:'服务员'}[row.orderType] || '堂食' }}</template>
        </el-table-column>
        <el-table-column label="金额" width="100">
          <template #default="{ row }">¥{{ row.totalPrice?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="结算时间">
          <template #default="{ row }">{{ row.settledAt ? new Date(row.settledAt).toLocaleTimeString() : '-' }}</template>
        </el-table-column>
      </el-table>
      <div v-if="settledOrders.length === 0" class="empty">今日暂无结算记录</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSettlePending, settleOrder, getOrders } from '../../api'
import { onEvent } from '../../api/socket'

const pendingOrders = ref([])
const settledOrders = ref([])

const todayTotal = computed(() => settledOrders.value.reduce((sum, o) => sum + (o.totalPrice || 0), 0))

// 按小时统计收入
const hourlyData = computed(() => {
  const hours = []
  for (let i = 9; i <= 22; i++) hours.push({ hour: i, amount: 0 })
  settledOrders.value.forEach(o => {
    if (o.settledAt) {
      const h = new Date(o.settledAt).getHours()
      const item = hours.find(x => x.hour === h)
      if (item) item.amount += o.totalPrice || 0
    }
  })
  return hours
})
const maxHourly = computed(() => Math.max(...hourlyData.value.map(h => h.amount), 1))

const loadPending = async () => {
  const res = await getSettlePending()
  if (res.code === 200) pendingOrders.value = res.data
}

const loadHistory = async () => {
  const res = await getOrders({ status: 3, pageSize: 100 })
  if (res.code === 200) {
    // 只显示今日已结算的
    const today = new Date(); today.setHours(0, 0, 0, 0)
    settledOrders.value = (res.data.list || []).filter(o => o.settledAt && new Date(o.settledAt) >= today)
  }
}

const handleSettle = async (order) => {
  try {
    await ElMessageBox.confirm(`确认结算 ${order.table?.tableNo}桌？金额: ¥${order.totalPrice?.toFixed(2)}`, '确认结算', { type: 'warning' })
    const res = await settleOrder(order.id)
    if (res.code === 200) {
      ElMessage.success('结算成功')
      if (window.electronAPI) {
        const printer = JSON.parse(localStorage.getItem('printer_config') || '{}')
        const template = JSON.parse(localStorage.getItem('receipt_template') || '{}')
        await window.electronAPI.printReceipt({
          printer, template,
          order: {
            orderNo: order.orderNo, tableNo: order.table?.tableNo, orderType: order.orderType,
            createdAt: order.createdAt,
            items: order.items?.map(i => ({ name: i.name, specInfo: i.specInfo, quantity: i.quantity, price: i.price, subtotal: i.price * i.quantity })),
            totalPrice: order.totalPrice, itemCount: order.itemCount
          }
        })
      }
      loadPending()
      loadHistory()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) { /* cancelled */ }
}

let offs = []
onMounted(() => {
  loadPending()
  loadHistory()
  offs.push(onEvent('settle_request', () => loadPending()))
  offs.push(onEvent('settle_complete', () => { loadPending(); loadHistory() }))
})
onUnmounted(() => offs.forEach(off => off()))
</script>

<style scoped>
.cashier-page { height: 100%; display: flex; flex-direction: column; padding: 16px; overflow-y: auto; }
.cashier-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.cashier-header h3 { font-size: 18px; color: #333; }
.header-stats { display: flex; gap: 10px; }
.pending-section { margin-bottom: 20px; }
.pending-section h4, .history-section h4 { font-size: 15px; color: #333; margin-bottom: 10px; }
.settle-card { background: #fdf6ec; border: 1px solid #e6a23c; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; }
.sc-top { display: flex; align-items: center; gap: 16px; }
.sc-table { font-size: 16px; font-weight: bold; color: #333; }
.sc-price { font-size: 16px; color: #ee0a24; font-weight: bold; flex: 1; }
.history-section { flex: 1; }
.empty { text-align: center; color: #999; padding: 40px 0; }

/* 收入图表 */
.chart-section { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.chart-section h4 { font-size: 14px; color: #333; margin-bottom: 12px; }
.bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 160px; padding-top: 20px; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; }
.bar { width: 70%; background: #409eff; border-radius: 3px 3px 0 0; min-width: 12px; transition: height 0.3s; }
.bar-label { font-size: 10px; color: #999; margin-top: 4px; }
.bar-value { position: absolute; top: -16px; font-size: 10px; color: #409eff; white-space: nowrap; }
</style>
