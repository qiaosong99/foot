<template>
  <div class="screen-page">
    <!-- 顶栏 -->
    <div class="top-bar">
      <span class="menu-label">菜单</span>
      <div class="search-box">
        <input v-model="searchKey" placeholder="搜索桌台" />
      </div>
      <div class="clock">
        <span class="clock-time">{{ clock.time }}</span>
        <span class="clock-date">{{ clock.date }}</span>
      </div>
    </div>

    <div class="main-area">
      <!-- 左侧：桌台网格 -->
      <div class="grid-area">
        <!-- 筛选标签 -->
        <div class="filter-tabs">
          <div
            v-for="tab in filterTabs" :key="tab.key"
            :class="['ftab', { active: filter === tab.key }]"
            @click="filter = tab.key; page = 1"
          >{{ tab.label }}({{ tab.count }})</div>
        </div>

        <!-- 桌台卡片 -->
        <div class="table-grid">
          <div
            v-for="t in pagedTables" :key="t.id"
            :class="['tcard', statusClass(t), { selected: selectedTable?.id === t.id }]"
            @click="selectedTable = t"
          >
            <div class="tcard-top">
              <span class="tcard-no">{{ t.tableNo }}</span>
              <span class="tcard-badge">{{ statusLabel(t) }}</span>
            </div>
            <div class="tcard-count">{{ t.orderCount }}/{{ t.orderCount > 0 ? t.orderCount : 1 }}</div>
            <div class="tcard-amount" v-if="t.totalAmount > 0">¥{{ t.totalAmount.toFixed(2) }}</div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pager" v-if="filteredTables.length > pageSize">
          <el-button size="small" :disabled="page <= 1" @click="page--">‹</el-button>
          <span class="page-ind">{{ page }}/{{ totalPages }}</span>
          <el-button size="small" :disabled="page >= totalPages" @click="page++">›</el-button>
        </div>
      </div>

      <!-- 右侧：详情面板 -->
      <div class="detail-panel">
        <template v-if="selectedTable">
          <div class="dp-title">{{ selectedTable.tableNo }}</div>
          <div class="dp-row"><span>状态</span><el-tag size="small" :type="tagType(selectedTable)">{{ statusLabel(selectedTable) }}</el-tag></div>
          <div class="dp-row"><span>开台时间</span><b>{{ firstOrderTimeText }}</b></div>
          <div class="dp-row"><span>服务类型</span><b>{{ selectedTable.type === 'takeout' ? '外卖' : '堂食' }}</b></div>
          <div class="dp-row"><span>区域</span><b>{{ selectedTable.area || '—' }}</b></div>
          <div class="dp-row"><span>订单数</span><b>{{ selectedTable.orderCount }}</b></div>

          <!-- 订单明细 -->
          <div class="dp-orders" v-if="selectedTable.orders?.length">
            <div v-for="order in selectedTable.orders" :key="order.id" class="dp-order">
              <div class="dpo-head">
                <span>{{ order.orderNo }}</span>
                <el-tag size="small" :type="order.settleStatus === 1 ? 'warning' : 'info'">{{ ['未结算','请求结算','已结算'][order.settleStatus] }}</el-tag>
              </div>
              <div class="dpo-items">
                <span v-for="item in order.items" :key="item.id" class="dpo-item">
                  {{ item.name }}{{ item.specInfo ? `(${item.specInfo})` : '' }} x{{ item.quantity }}
                </span>
              </div>
            </div>
          </div>
          <div class="dp-empty" v-else>暂无点单</div>

          <!-- 金额汇总 -->
          <div class="dp-summary">
            <div class="dp-sum-row"><span>优惠</span><b>¥0.00</b></div>
            <div class="dp-sum-row"><span>小计</span><b>¥{{ selectedTable.totalAmount.toFixed(2) }}</b></div>
            <div class="dp-sum-row total"><span>合计</span><b>¥{{ selectedTable.totalAmount.toFixed(2) }}</b></div>
            <div class="dp-sum-row"><span>服务费</span><b>¥0.00</b></div>
          </div>

          <!-- 操作 -->
          <div class="dp-actions">
            <el-button type="danger" :disabled="selectedTable.totalAmount === 0" @click="handleSettleAll">
              整桌结算
            </el-button>
            <el-button v-if="selectedTable.status === 0" type="success" plain @click="handleReserve">标记预订</el-button>
            <el-button v-if="selectedTable.status === 2" type="warning" plain @click="handleReserve">取消预订</el-button>
          </div>
        </template>
        <div class="dp-placeholder" v-else>请选择桌台</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getScreenTables, settleTableAll } from '../../api'
import request from '../../api'
import { onEvent } from '../../api/socket'

const tables = ref([])
const selectedTable = ref(null)
const searchKey = ref('')
const filter = ref('all')
const page = ref(1)
const pageSize = 24

// 时钟
const clock = ref({ time: '', date: '' })
let clockTimer = null
const weekNames = ['日', '一', '二', '三', '四', '五', '六']
const tickClock = () => {
  const d = new Date()
  clock.value = {
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`,
    date: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 星期${weekNames[d.getDay()]}`
  }
}

// 状态判定
const tableState = (t) => {
  if (t.hasSettleRequest) return 'pre-settle'
  if (t.status === 2) return 'reserved'
  if (t.status === 1) return 'busy'
  return 'free'
}
const statusLabel = (t) => ({ free: '空台', busy: '占用', reserved: '预订', 'pre-settle': '预结' })[tableState(t)]
const statusClass = (t) => tableState(t)
const tagType = (t) => ({ free: 'info', busy: 'danger', reserved: 'success', 'pre-settle': 'warning' })[tableState(t)]

const firstOrderTimeText = computed(() => {
  const t = selectedTable.value
  if (!t?.firstOrderTime) return '—'
  const d = new Date(t.firstOrderTime)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

// 筛选
const filteredTables = computed(() => {
  let list = tables.value
  if (searchKey.value) list = list.filter(t => t.tableNo.toLowerCase().includes(searchKey.value.toLowerCase()))
  if (filter.value !== 'all') list = list.filter(t => tableState(t) === filter.value)
  return list
})
const filterTabs = computed(() => [
  { key: 'all', label: '全部', count: tables.value.length },
  { key: 'free', label: '空台', count: tables.value.filter(t => tableState(t) === 'free').length },
  { key: 'busy', label: '占用', count: tables.value.filter(t => tableState(t) === 'busy').length },
  { key: 'reserved', label: '预订', count: tables.value.filter(t => tableState(t) === 'reserved').length },
  { key: 'pre-settle', label: '预结', count: tables.value.filter(t => tableState(t) === 'pre-settle').length }
])
const totalPages = computed(() => Math.max(1, Math.ceil(filteredTables.value.length / pageSize)))
const pagedTables = computed(() => filteredTables.value.slice((page.value - 1) * pageSize, page.value * pageSize))

watch(filteredTables, () => { if (page.value > totalPages.value) page.value = 1 })

// 数据
const loadTables = async () => {
  const res = await getScreenTables()
  if (res.code === 200) {
    tables.value = res.data
    // 同步选中桌最新数据
    if (selectedTable.value) {
      const cur = res.data.find(t => t.id === selectedTable.value.id)
      if (cur) selectedTable.value = cur
    }
  }
}

const handleSettleAll = async () => {
  try {
    await ElMessageBox.confirm(`确认结算 ${selectedTable.value.tableNo} 桌？金额 ¥${selectedTable.value.totalAmount.toFixed(2)}`, '确认结算', { type: 'warning' })
    const res = await settleTableAll(selectedTable.value.id)
    if (res.code === 200) {
      ElMessage.success(res.message)
      if (window.electronAPI && res.data?.length > 0) {
        for (const order of res.data) {
          await window.electronAPI.printReceipt({
            printer: JSON.parse(localStorage.getItem('printer_config') || '{}'),
            template: JSON.parse(localStorage.getItem('receipt_template') || '{}'),
            order: {
              orderNo: order.orderNo,
              tableNo: order.table?.tableNo || selectedTable.value.tableNo,
              orderType: order.orderType,
              createdAt: order.createdAt,
              items: order.items?.map(i => ({ name: i.name, specInfo: i.specInfo, quantity: i.quantity, price: i.price, subtotal: i.price * i.quantity })),
              totalPrice: order.totalPrice,
              itemCount: order.itemCount
            }
          })
        }
      }
      loadTables()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) { /* cancelled */ }
}

const handleReserve = async () => {
  const res = await request.put(`/admin/tables/${selectedTable.value.id}/reserve`)
  if (res.code === 200) {
    ElMessage.success(res.message)
    loadTables()
  } else {
    ElMessage.error(res.message)
  }
}

let offs = []
onMounted(() => {
  tickClock()
  clockTimer = setInterval(tickClock, 1000)
  loadTables()
  offs.push(onEvent('table_status_change', () => loadTables()))
  offs.push(onEvent('new_order', () => loadTables()))
  offs.push(onEvent('settle_request', () => loadTables()))
  offs.push(onEvent('settle_complete', () => loadTables()))
  offs.push(onEvent('order_status_change', () => loadTables()))
  offs.push(onEvent('dish_removed', () => loadTables()))
})
onUnmounted(() => {
  clearInterval(clockTimer)
  offs.forEach(off => off())
})
</script>

<style scoped>
.screen-page { height: 100%; display: flex; flex-direction: column; background: #f5f6f8; }

/* 顶栏 */
.top-bar { height: 48px; background: #fff; display: flex; align-items: center; padding: 0 16px; gap: 16px; border-bottom: 1px solid #eee; flex-shrink: 0; }
.menu-label { font-size: 15px; font-weight: bold; color: #333; }
.search-box input { width: 180px; border: 1px solid #ddd; border-radius: 16px; padding: 6px 14px; font-size: 13px; outline: none; background: #f7f8fa; }
.search-box input:focus { border-color: #409eff; background: #fff; }
.clock { margin-left: auto; display: flex; align-items: baseline; gap: 10px; }
.clock-time { font-size: 18px; font-weight: bold; color: #333; font-variant-numeric: tabular-nums; }
.clock-date { font-size: 13px; color: #666; }

.main-area { flex: 1; display: grid; grid-template-columns: 1fr 320px; gap: 12px; padding: 12px; overflow: hidden; }

/* 筛选标签 */
.grid-area { display: flex; flex-direction: column; overflow: hidden; }
.filter-tabs { display: flex; gap: 8px; margin-bottom: 12px; flex-shrink: 0; }
.ftab { padding: 6px 16px; border-radius: 16px; background: #fff; border: 1px solid #e5e5e5; font-size: 13px; color: #666; cursor: pointer; }
.ftab.active { background: #409eff; border-color: #409eff; color: #fff; }

/* 桌台网格 */
.table-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; overflow-y: auto; align-content: start; padding: 2px; }
.tcard { background: #fff; border-radius: 10px; padding: 14px; cursor: pointer; border: 2px solid transparent; position: relative; transition: all 0.15s; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
.tcard:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.tcard.selected { border-color: #409eff; }
.tcard-top { display: flex; justify-content: space-between; align-items: center; }
.tcard-no { font-size: 26px; font-weight: bold; color: #333; }
.tcard-badge { font-size: 12px; padding: 2px 8px; border-radius: 4px; }
.tcard.free .tcard-badge { background: #f0f0f0; color: #999; }
.tcard.free .tcard-no { color: #666; }
.tcard.busy { background: #fff3f0; }
.tcard.busy .tcard-badge { background: #ee0a24; color: #fff; }
.tcard.reserved { background: #f0f9eb; }
.tcard.reserved .tcard-badge { background: #67c23a; color: #fff; }
.tcard.pre-settle { background: #fdf6ec; animation: pulse 1.5s infinite; }
.tcard.pre-settle .tcard-badge { background: #e6a23c; color: #fff; }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(230,162,60,0.35); } 50% { box-shadow: 0 0 0 8px rgba(230,162,60,0); } }
.tcard-count { font-size: 13px; color: #999; margin-top: 6px; }
.tcard-amount { font-size: 15px; color: #ee0a24; font-weight: bold; margin-top: 2px; }

.pager { display: flex; align-items: center; justify-content: center; gap: 12px; padding-top: 10px; flex-shrink: 0; }
.page-ind { font-size: 13px; color: #666; }

/* 详情面板 */
.detail-panel { background: #fff; border-radius: 10px; padding: 18px; overflow-y: auto; display: flex; flex-direction: column; }
.dp-title { font-size: 32px; font-weight: bold; color: #333; margin-bottom: 12px; }
.dp-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; font-size: 14px; color: #666; border-bottom: 1px dashed #f0f0f0; }
.dp-row b { color: #333; }
.dp-orders { margin-top: 12px; }
.dp-order { background: #f9f9f9; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
.dpo-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #999; margin-bottom: 6px; }
.dpo-items { display: flex; flex-wrap: wrap; gap: 6px; }
.dpo-item { font-size: 12px; background: #fff; border: 1px solid #eee; border-radius: 4px; padding: 2px 8px; color: #333; }
.dp-empty { color: #999; font-size: 13px; text-align: center; padding: 16px 0; }
.dp-summary { margin-top: auto; background: #f7f8fa; border-radius: 8px; padding: 12px 14px; }
.dp-sum-row { display: flex; justify-content: space-between; font-size: 13px; color: #666; padding: 4px 0; }
.dp-sum-row b { color: #333; }
.dp-sum-row.total { font-size: 16px; border-top: 1px dashed #ddd; margin-top: 4px; padding-top: 8px; }
.dp-sum-row.total b { color: #ee0a24; }
.dp-actions { display: flex; gap: 10px; margin-top: 14px; }
.dp-actions .el-button { flex: 1; }
.dp-placeholder { color: #999; text-align: center; margin: auto; }
</style>
