<template>
  <div class="screen-page">
    <!-- 堂食桌台区域 -->
    <div class="section">
      <h3 class="section-title">堂食桌台</h3>
      <div class="table-grid">
        <div
          v-for="table in dineInTables"
          :key="table.id"
          :class="['table-card', statusClass(table)]"
          @click="openTableDetail(table)"
        >
          <div class="table-no">{{ table.tableNo }}</div>
          <div class="table-status">{{ statusLabel(table) }}</div>
          <div class="table-amount" v-if="table.status === 1">¥{{ table.totalAmount.toFixed(2) }}</div>
          <div class="table-items" v-if="table.status === 1">{{ table.totalItems }}件 / {{ table.orderCount }}单</div>
          <div class="settle-badge" v-if="table.hasSettleRequest">待结算</div>
        </div>
      </div>
    </div>

    <!-- 外卖桌台区域 -->
    <div class="section" v-if="takeoutTables.length > 0">
      <h3 class="section-title">外卖</h3>
      <div class="table-grid">
        <div
          v-for="table in takeoutTables"
          :key="table.id"
          :class="['table-card', 'takeout', statusClass(table)]"
          @click="openTableDetail(table)"
        >
          <div class="table-no">{{ table.tableNo }}</div>
          <div class="table-status">{{ statusLabel(table) }}</div>
          <div class="table-amount" v-if="table.status === 1">¥{{ table.totalAmount.toFixed(2) }}</div>
        </div>
      </div>
    </div>

    <!-- 桌台详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="`${currentTable?.tableNo} 桌详情`" width="600px">
      <div v-if="currentTable">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="桌号">{{ currentTable.tableNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusLabel(currentTable) }}</el-descriptions-item>
          <el-descriptions-item label="消费金额">¥{{ currentTable.totalAmount?.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="订单数">{{ currentTable.orderCount }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin: 16px 0 8px;">订单明细</h4>
        <div v-for="order in currentTable.orders" :key="order.id" class="detail-order">
          <div class="detail-order-header">
            <span>{{ order.orderNo }}</span>
            <el-tag size="small" :type="order.settleStatus === 1 ? 'warning' : 'info'">
              {{ ['未结算','请求结算','已结算'][order.settleStatus] }}
            </el-tag>
          </div>
          <div class="detail-order-items">
            <span v-for="item in order.items" :key="item.id" class="d-item">
              {{ item.name }}{{ item.specInfo ? `(${item.specInfo})` : '' }} x{{ item.quantity }}
            </span>
          </div>
        </div>

        <div style="margin-top: 20px; text-align: right;">
          <el-button type="danger" size="large" @click="handleSettleAll" :disabled="currentTable.totalAmount === 0">
            整桌结算 (¥{{ currentTable.totalAmount?.toFixed(2) }})
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getScreenTables, settleTableAll } from '../../api'
import { onEvent } from '../../api/socket'

const tables = ref([])
const detailVisible = ref(false)
const currentTable = ref(null)

const dineInTables = computed(() => tables.value.filter(t => t.type !== 'takeout'))
const takeoutTables = computed(() => tables.value.filter(t => t.type === 'takeout'))

const statusClass = (table) => {
  if (table.hasSettleRequest) return 'settle-pending'
  if (table.status === 1) return 'busy'
  return 'free'
}

const statusLabel = (table) => {
  if (table.hasSettleRequest) return '待结算'
  if (table.status === 1) return '使用中'
  return '空闲'
}

const openTableDetail = (table) => {
  currentTable.value = table
  detailVisible.value = true
}

const handleSettleAll = async () => {
  try {
    await ElMessageBox.confirm(`确认结算 ${currentTable.value.tableNo} 桌？将打印小票并释放桌台。`, '确认结算', { type: 'warning' })
    const res = await settleTableAll(currentTable.value.id)
    if (res.code === 200) {
      ElMessage.success(res.message)
      // 触发打印
      if (window.electronAPI && res.data?.length > 0) {
        for (const order of res.data) {
          await window.electronAPI.printReceipt({
            printer: JSON.parse(localStorage.getItem('printer_config') || '{}'),
            template: JSON.parse(localStorage.getItem('receipt_template') || '{}'),
            order: {
              orderNo: order.orderNo,
              tableNo: order.table?.tableNo || currentTable.value.tableNo,
              orderType: order.orderType,
              createdAt: order.createdAt,
              items: order.items?.map(i => ({ name: i.name, specInfo: i.specInfo, quantity: i.quantity, price: i.price, subtotal: i.price * i.quantity })),
              totalPrice: order.totalPrice,
              itemCount: order.itemCount
            }
          })
        }
      }
      detailVisible.value = false
      loadTables()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) { /* cancelled */ }
}

const loadTables = async () => {
  const res = await getScreenTables()
  if (res.code === 200) tables.value = res.data
}

let offs = []
onMounted(() => {
  loadTables()
  offs.push(onEvent('table_status_change', () => loadTables()))
  offs.push(onEvent('new_order', () => loadTables()))
  offs.push(onEvent('settle_request', () => loadTables()))
  offs.push(onEvent('settle_complete', () => loadTables()))
  offs.push(onEvent('order_status_change', () => loadTables()))
  offs.push(onEvent('dish_removed', () => loadTables()))
})
onUnmounted(() => offs.forEach(off => off()))
</script>

<style scoped>
.screen-page { height: 100%; overflow-y: auto; padding: 20px; }
.section { margin-bottom: 24px; }
.section-title { font-size: 16px; color: #333; margin-bottom: 12px; padding-left: 10px; border-left: 3px solid #409eff; }
.table-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
.table-card { position: relative; background: #fff; border-radius: 10px; padding: 18px 14px; text-align: center; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.table-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.table-card.free { border-color: #e8e8e8; }
.table-card.busy { border-color: #409eff; background: #ecf5ff; }
.table-card.settle-pending { border-color: #e6a23c; background: #fdf6ec; animation: pulse 1.5s infinite; }
.table-card.takeout.busy { border-color: #67c23a; background: #f0f9eb; }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(230,162,60,0.3); } 50% { box-shadow: 0 0 0 8px rgba(230,162,60,0); } }
.table-no { font-size: 22px; font-weight: bold; color: #333; }
.table-status { font-size: 13px; color: #999; margin-top: 4px; }
.table-card.busy .table-status { color: #409eff; }
.table-card.settle-pending .table-status { color: #e6a23c; font-weight: bold; }
.table-amount { font-size: 16px; color: #ee0a24; font-weight: bold; margin-top: 6px; }
.table-items { font-size: 12px; color: #999; margin-top: 2px; }
.settle-badge { position: absolute; top: -8px; right: -8px; background: #e6a23c; color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.detail-order { background: #f9f9f9; border-radius: 6px; padding: 10px; margin-bottom: 8px; }
.detail-order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 13px; color: #666; }
.detail-order-items { display: flex; flex-wrap: wrap; gap: 6px; }
.d-item { font-size: 12px; background: #fff; padding: 2px 8px; border-radius: 4px; border: 1px solid #eee; }
</style>
