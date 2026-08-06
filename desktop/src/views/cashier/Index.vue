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

    <el-tabs v-model="activeTab">
      <!-- ============ 结算 ============ -->
      <el-tab-pane label="结算" name="settle">
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

        <!-- 待结算 -->
        <div class="pending-section" v-if="pendingOrders.length > 0">
          <h4>待结算</h4>
          <div v-for="order in pendingOrders" :key="order.id" class="settle-card">
            <div class="sc-top">
              <span class="sc-table">{{ order.table?.tableNo }}桌</span>
              <span class="sc-price">¥{{ order.totalPrice?.toFixed(2) }}</span>
              <el-button size="small" @click="showDetail(order)">详情</el-button>
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
            <el-table-column label="结算时间" min-width="100">
              <template #default="{ row }">{{ row.settledAt ? new Date(row.settledAt).toLocaleTimeString() : '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button size="small" text type="primary" @click="showDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="settledOrders.length === 0" class="empty">今日暂无结算记录</div>
        </div>
      </el-tab-pane>

      <!-- ============ 历史订单 ============ -->
      <el-tab-pane label="历史订单" name="history">
        <div class="hist-toolbar">
          <el-date-picker v-model="histRange" type="daterange" size="small" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 260px;" />
          <el-select v-model="histStatus" size="small" style="width: 120px;">
            <el-option label="全部状态" value="" />
            <el-option label="已完成" :value="3" />
            <el-option label="已取消" :value="4" />
          </el-select>
          <el-button size="small" type="primary" @click="loadHistOrders(true)">查询</el-button>
          <span class="hist-total">共 {{ histTotal }} 笔，金额 ¥{{ histAmount.toFixed(2) }}</span>
        </div>
        <el-table :data="histOrders" size="small" stripe>
          <el-table-column prop="orderNo" label="订单号" width="170" />
          <el-table-column label="桌号" width="70">
            <template #default="{ row }">{{ row.table?.tableNo }}</template>
          </el-table-column>
          <el-table-column label="类型" width="80">
            <template #default="{ row }">{{ {dine_in:'堂食',takeout:'外卖',waiter:'服务员'}[row.orderType] || '堂食' }}</template>
          </el-table-column>
          <el-table-column label="菜品" min-width="180">
            <template #default="{ row }">
              <span class="hist-items">{{ row.items?.slice(0, 3).map(i => `${i.name}x${i.quantity}`).join('、') }}{{ row.items?.length > 3 ? '…' : '' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="金额" width="90">
            <template #default="{ row }">¥{{ row.totalPrice?.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }"><el-tag size="small">{{ ['待制作','制作中','已上菜','已完成','已取消'][row.status] }}</el-tag></template>
          </el-table-column>
          <el-table-column label="下单时间" width="150">
            <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="showDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="hist-pager">
          <el-pagination layout="prev, pager, next" :total="histTotal" :page-size="histPageSize" v-model:current-page="histPage" @current-change="loadHistory()" small />
        </div>
      </el-tab-pane>

      <!-- ============ 报表 ============ -->
      <el-tab-pane label="报表" name="report">
        <div class="report-toolbar">
          <el-radio-group v-model="reportPeriod" size="small" @change="loadReport">
            <el-radio-button label="week">周报表</el-radio-button>
            <el-radio-button label="month">月报表</el-radio-button>
          </el-radio-group>
          <el-button size="small" @click="shiftPeriod(-1)">上一{{ reportPeriod === 'week' ? '周' : '月' }}</el-button>
          <el-button size="small" @click="shiftPeriod(1)">下一{{ reportPeriod === 'week' ? '周' : '月' }}</el-button>
          <el-button size="small" @click="anchorOffset = 0; loadReport()">本{{ reportPeriod === 'week' ? '周' : '月' }}</el-button>
          <span class="report-range" v-if="report">{{ report.start }} ~ {{ report.end }}</span>
          <el-button size="small" type="success" style="margin-left:auto;" @click="exportReport" :disabled="!report">导出报表</el-button>
        </div>

        <div v-if="report" class="report-body">
          <div class="report-cards">
            <div class="rcard"><span>营业额</span><b>¥{{ report.totalAmount.toFixed(2) }}</b></div>
            <div class="rcard"><span>订单数</span><b>{{ report.totalCount }}</b></div>
            <div class="rcard"><span>日均营业额</span><b>¥{{ (report.totalAmount / report.daily.length).toFixed(2) }}</b></div>
          </div>

          <div class="report-cols">
            <!-- 每日明细 -->
            <div class="report-daily">
              <h4>每日营业情况</h4>
              <div class="daily-chart">
                <div v-for="d in report.daily" :key="d.date" class="dcol">
                  <div class="dbar" :style="{ height: d.amount > 0 ? Math.max(d.amount / reportMax * 100, 3) + 'px' : '0px' }"></div>
                  <span class="dlabel">{{ d.date.slice(5) }}</span>
                </div>
              </div>
              <el-table :data="report.daily" size="small" stripe max-height="260">
                <el-table-column prop="date" label="日期" width="110" />
                <el-table-column prop="orderCount" label="订单数" width="80" />
                <el-table-column label="营业额">
                  <template #default="{ row }">¥{{ row.amount.toFixed(2) }}</template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 菜品销量 -->
            <div class="report-top">
              <h4>菜品销量 TOP10</h4>
              <el-table :data="report.topProducts" size="small" stripe max-height="330">
                <el-table-column type="index" label="#" width="40" />
                <el-table-column label="菜品" min-width="120">
                  <template #default="{ row }">{{ row.name }}{{ row.specInfo ? `(${row.specInfo})` : '' }}</template>
                </el-table-column>
                <el-table-column prop="quantity" label="销量" width="60" />
                <el-table-column label="金额" width="90">
                  <template #default="{ row }">¥{{ row.amount.toFixed(2) }}</template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 订单详情弹窗 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="560px">
      <div v-if="detailOrder">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="订单号">{{ detailOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="桌号">{{ detailOrder.table?.tableNo }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ {dine_in:'堂食',takeout:'外卖',waiter:'服务员'}[detailOrder.orderType] || '堂食' }}</el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ detailOrder.totalPrice?.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ new Date(detailOrder.createdAt).toLocaleString() }}</el-descriptions-item>
          <el-descriptions-item label="结算时间">{{ detailOrder.settledAt ? new Date(detailOrder.settledAt).toLocaleString() : '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-table :data="detailOrder.items" size="small" style="margin-top: 12px;">
          <el-table-column label="菜品" min-width="140">
            <template #default="{ row }">{{ row.name }}{{ row.specInfo ? `(${row.specInfo})` : '' }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="60" />
          <el-table-column label="单价" width="80">
            <template #default="{ row }">¥{{ row.price?.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="小计" width="90">
            <template #default="{ row }">¥{{ (row.price * row.quantity).toFixed(2) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSettlePending, settleOrder, getOrders, getReportSummary } from '../../api'
import { onEvent } from '../../api/socket'

const activeTab = ref('settle')
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
    const today = new Date(); today.setHours(0, 0, 0, 0)
    settledOrders.value = (res.data.list || []).filter(o => o.settledAt && new Date(o.settledAt) >= today)
  }
}

// ============ 订单详情 ============
const detailVisible = ref(false)
const detailOrder = ref(null)
const showDetail = (order) => {
  detailOrder.value = order
  detailVisible.value = true
}

// ============ 历史订单 ============
const histRange = ref([])
const histStatus = ref('')
const histOrders = ref([])
const histTotal = ref(0)
const histPage = ref(1)
const histPageSize = 15
const histAmount = computed(() => histOrders.value.reduce((s, o) => s + (o.totalPrice || 0), 0))

const defaultRange = () => {
  const end = new Date()
  const start = new Date(Date.now() - 6 * 86400000)
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return [fmt(start), fmt(end)]
}

const loadHistOrders = async (reset = false) => {
  if (reset) histPage.value = 1
  const params = { page: histPage.value, pageSize: histPageSize }
  if (histRange.value?.length === 2) {
    params.startDate = histRange.value[0]
    params.endDate = histRange.value[1]
  }
  if (histStatus.value !== '') params.status = histStatus.value
  const res = await getOrders(params)
  if (res.code === 200) {
    histOrders.value = res.data.list || []
    histTotal.value = res.data.total || 0
  }
}

// ============ 报表 ============
const reportPeriod = ref('week')
const report = ref(null)
const anchorOffset = ref(0)
const reportMax = computed(() => Math.max(...(report.value?.daily || []).map(d => d.amount), 1))

const anchorDate = () => {
  const d = new Date()
  if (reportPeriod.value === 'week') d.setDate(d.getDate() + anchorOffset.value * 7)
  else d.setMonth(d.getMonth() + anchorOffset.value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const shiftPeriod = (dir) => { anchorOffset.value += dir; loadReport() }

const loadReport = async () => {
  const res = await getReportSummary({ period: reportPeriod.value, anchor: anchorDate() })
  if (res.code === 200) report.value = res.data
}

// 导出 CSV（带 BOM，Excel 打开中文不乱码）
const exportReport = async () => {
  if (!report.value) return
  const r = report.value
  const periodName = r.period === 'week' ? '周报表' : '月报表'
  const lines = []
  lines.push(`餐饮点餐系统 ${periodName}（${r.start} ~ ${r.end}）`)
  lines.push('')
  lines.push('【每日营业情况】')
  lines.push('日期,订单数,营业额')
  r.daily.forEach(d => lines.push(`${d.date},${d.orderCount},${d.amount.toFixed(2)}`))
  lines.push(`合计,${r.totalCount},${r.totalAmount.toFixed(2)}`)
  lines.push('')
  lines.push('【菜品销量TOP10】')
  lines.push('排名,菜品,规格,销量,金额')
  r.topProducts.forEach((p, i) => lines.push(`${i + 1},${p.name},${p.specInfo || ''},${p.quantity},${p.amount.toFixed(2)}`))
  const csv = '\uFEFF' + lines.join('\r\n')
  const filename = `${periodName}_${r.start}_${r.end}.csv`

  if (window.electronAPI?.saveFile) {
    const res = await window.electronAPI.saveFile({ filename, content: csv })
    if (res.success) ElMessage.success('已导出: ' + res.path)
    else if (!res.canceled) ElMessage.error('导出失败: ' + (res.message || ''))
  } else {
    // 浏览器兜底下载
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
  }
}

// ============ 结算 ============
const printOrderReceipt = async (order) => {
  const printer = JSON.parse(localStorage.getItem('printer_config') || '{}')
  const template = JSON.parse(localStorage.getItem('receipt_template') || '{}')
  const printRes = await window.electronAPI.printReceipt({
    printer, template,
    order: {
      orderNo: order.orderNo, tableNo: order.table?.tableNo, orderType: order.orderType,
      createdAt: order.createdAt,
      items: order.items?.map(i => ({ name: i.name, specInfo: i.specInfo, quantity: i.quantity, price: i.price, subtotal: i.price * i.quantity })),
      totalPrice: order.totalPrice, itemCount: order.itemCount
    }
  })
  if (printRes.success) ElMessage.success('小票已发送至打印机')
  else ElMessage.error({ message: '打印失败: ' + printRes.message, duration: 6000 })
}

const handleSettle = async (order) => {
  try {
    await ElMessageBox.confirm(`确认结算 ${order.table?.tableNo}桌？金额: ¥${order.totalPrice?.toFixed(2)}`, '确认结算', { type: 'warning' })
    const res = await settleOrder(order.id)
    if (res.code === 200) {
      loadPending()
      loadHistory()
      try {
        await ElMessageBox.confirm('结算成功，是否打印小票？', '打印小票', {
          confirmButtonText: '打印小票',
          cancelButtonText: '不打印',
          type: 'success'
        })
        if (window.electronAPI) await printOrderReceipt(order)
        else ElMessage.info('请在桌面端使用打印功能')
      } catch {
        // 选择不打印
      }
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) { /* cancelled */ }
}

let offs = []
onMounted(() => {
  loadPending()
  loadHistory()
  histRange.value = defaultRange()
  offs.push(onEvent('settle_request', () => loadPending()))
  offs.push(onEvent('settle_complete', () => { loadPending(); loadHistory() }))
})
onUnmounted(() => offs.forEach(off => off()))

watch(activeTab, (tab) => {
  if (tab === 'history' && histOrders.value.length === 0) loadHistOrders()
  if (tab === 'report' && !report.value) loadReport()
})
</script>

<style scoped>
.cashier-page { height: 100%; display: flex; flex-direction: column; padding: 16px; overflow-y: auto; }
.cashier-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.cashier-header h3 { font-size: 18px; color: #333; }
.header-stats { display: flex; gap: 10px; }
.pending-section { margin-bottom: 20px; }
.pending-section h4, .history-section h4, .chart-section h4, .report-daily h4, .report-top h4 { font-size: 15px; color: #333; margin-bottom: 10px; }
.settle-card { background: #fdf6ec; border: 1px solid #e6a23c; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; }
.sc-top { display: flex; align-items: center; gap: 12px; }
.sc-table { font-size: 16px; font-weight: bold; color: #333; }
.sc-price { font-size: 16px; color: #ee0a24; font-weight: bold; flex: 1; }
.history-section { margin-top: 8px; }
.empty { text-align: center; color: #999; padding: 40px 0; }
.hist-items { font-size: 12px; color: #666; }
.hist-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.hist-total { font-size: 13px; color: #666; margin-left: auto; }
.hist-pager { display: flex; justify-content: flex-end; margin-top: 10px; }

/* 收入图表 */
.chart-section { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 160px; padding-top: 20px; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; }
.bar { width: 70%; background: #409eff; border-radius: 3px 3px 0 0; min-width: 12px; transition: height 0.3s; }
.bar-label { font-size: 10px; color: #999; margin-top: 4px; }
.bar-value { position: absolute; top: -16px; font-size: 10px; color: #409eff; white-space: nowrap; }

/* 报表 */
.report-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.report-range { font-size: 13px; color: #666; }
.report-cards { display: flex; gap: 12px; margin-bottom: 14px; }
.rcard { flex: 1; background: #fff; border-radius: 8px; padding: 14px 18px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
.rcard span { font-size: 13px; color: #999; }
.rcard b { font-size: 22px; color: #333; }
.report-cols { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; }
.report-daily, .report-top { background: #fff; border-radius: 8px; padding: 14px; }
.daily-chart { display: flex; align-items: flex-end; gap: 4px; height: 110px; margin-bottom: 12px; }
.dcol { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
.dbar { width: 70%; background: #67c23a; border-radius: 2px 2px 0 0; min-width: 6px; }
.dlabel { font-size: 9px; color: #999; margin-top: 3px; white-space: nowrap; }
</style>
