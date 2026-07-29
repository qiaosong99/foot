<template>
  <div class="status-page">
    <div class="page-header">
      <span class="back" @click="$router.push('/c/menu?table=' + tableNo)">← 继续点餐</span>
      <span>订单状态</span>
      <span></span>
    </div>

    <div class="status-content" v-if="order">
      <!-- 状态提示 -->
      <div :class="['status-banner', statusClass]">
        <p class="status-text">{{ statusText }}</p>
        <p class="status-sub">{{ statusSub }}</p>
      </div>

      <!-- 上菜提醒弹窗 -->
      <div v-if="showServedAlert" class="served-alert" @click="showServedAlert = false">
        <div class="alert-box">
          <p class="alert-icon">🔔</p>
          <p class="alert-title">上菜提醒</p>
          <p class="alert-msg">您的菜品即将上桌，请注意接收！</p>
          <button class="alert-btn">知道了</button>
        </div>
      </div>

      <!-- 订单信息 -->
      <div class="section">
        <div class="order-info">
          <span>订单号: {{ order.orderNo }}</span>
          <span>桌号: {{ order.table?.tableNo }}</span>
        </div>
      </div>

      <!-- 菜品列表 -->
      <div class="section">
        <div v-for="item in order.items" :key="item.id" class="order-item">
          <div class="item-left">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-spec" v-if="item.specInfo">{{ item.specInfo }}</span>
            <span class="item-qty">x{{ item.quantity }}</span>
          </div>
          <span :class="['item-status', item.status === 1 ? 'served' : '']">
            {{ item.status === 1 ? '已上菜' : '制作中' }}
          </span>
        </div>
      </div>

      <div class="section total-section">
        <span>共 {{ order.itemCount }} 件</span>
        <span class="total-price">合计: ¥{{ order.totalPrice?.toFixed(2) }}</span>
      </div>
    </div>

    <div v-else class="loading">加载中...</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getOrderStatus } from '../../api'
import { joinTable, onEvent } from '../../utils/socket'

const route = useRoute()
const order = ref(null)
const tableNo = ref(route.query.table || '')
const showServedAlert = ref(false)

const statusText = computed(() => {
  if (!order.value) return ''
  return ['等待制作', '正在制作', '已上菜', '已完成', '已取消'][order.value.status]
})
const statusSub = computed(() => {
  if (!order.value) return ''
  return ['后厨已收到您的订单', '厨师正在为您烹饪', '菜品即将上桌，请注意', '感谢光临，祝您用餐愉快', ''][order.value.status]
})
const statusClass = computed(() => {
  if (!order.value) return ''
  return ['waiting', 'cooking', 'served', 'done', 'cancelled'][order.value.status]
})

const loadOrder = async () => {
  const res = await getOrderStatus(route.params.orderNo)
  if (res.code === 200) order.value = res.data
}

let cleanup = null
onMounted(async () => {
  await loadOrder()
  if (tableNo.value) {
    joinTable(tableNo.value)
    cleanup = onEvent('order_served', (data) => {
      if (data.orderNo === route.params.orderNo || data.id === order.value?.id) {
        order.value = data
        showServedAlert.value = true
        // 播放提示音
        try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==').play() } catch(e) {}
      }
    })
    onEvent('order_status_change', (data) => {
      if (data.orderNo === route.params.orderNo || data.id === order.value?.id) {
        order.value = data
      }
    })
  }
  // 轮询兜底
  const timer = setInterval(loadOrder, 5000)
  onUnmounted(() => { clearInterval(timer); if (cleanup) cleanup() })
})
</script>

<style scoped>
.status-page { height: 100vh; display: flex; flex-direction: column; background: #f5f5f5; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #fff; font-size: 16px; font-weight: bold; }
.back { color: #1989fa; font-size: 14px; font-weight: normal; cursor: pointer; }
.status-content { flex: 1; overflow-y: auto; padding: 12px; }
.status-banner { padding: 24px; border-radius: 10px; text-align: center; margin-bottom: 12px; color: #fff; }
.status-banner.waiting { background: linear-gradient(135deg, #f093fb, #f5576c); }
.status-banner.cooking { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.status-banner.served { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.status-banner.done { background: linear-gradient(135deg, #a8edea, #fed6e3); color: #333; }
.status-banner.cancelled { background: #999; }
.status-text { font-size: 20px; font-weight: bold; }
.status-sub { font-size: 13px; margin-top: 6px; opacity: 0.9; }
.section { background: #fff; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
.order-info { display: flex; justify-content: space-between; font-size: 13px; color: #666; }
.order-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8f8f8; }
.order-item:last-child { border-bottom: none; }
.item-left { display: flex; align-items: center; gap: 6px; }
.item-name { font-size: 14px; color: #333; }
.item-spec { font-size: 12px; color: #999; }
.item-qty { font-size: 13px; color: #666; }
.item-status { font-size: 12px; color: #e6a23c; }
.item-status.served { color: #67c23a; }
.total-section { display: flex; justify-content: space-between; font-size: 14px; }
.total-price { color: #ee0a24; font-weight: bold; }
.loading { text-align: center; padding: 60px; color: #999; }
.served-alert { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.alert-box { background: #fff; border-radius: 12px; padding: 30px; text-align: center; width: 280px; }
.alert-icon { font-size: 40px; }
.alert-title { font-size: 18px; font-weight: bold; margin: 10px 0; }
.alert-msg { font-size: 14px; color: #666; margin-bottom: 16px; }
.alert-btn { background: #1989fa; color: #fff; border: none; padding: 8px 32px; border-radius: 20px; font-size: 14px; cursor: pointer; }

@media (min-width: 768px) {
  .status-page { max-width: 600px; margin: 0 auto; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
}
</style>
