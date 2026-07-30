<template>
  <view class="page">
    <view class="table-info">
      <text class="table-no">{{ tableNo }} 桌</text>
      <text class="table-total" v-if="totalAmount > 0">消费: ¥{{ totalAmount.toFixed(2) }}</text>
    </view>

    <!-- 当前订单 -->
    <view class="section">
      <text class="section-title">当前点单</text>
      <view v-if="orders.length === 0" class="empty">暂无点单</view>
      <view v-for="order in orders" :key="order.id" class="order-card">
        <view class="oc-header">
          <text class="oc-no">{{ order.orderNo }}</text>
          <text class="oc-price">¥{{ order.totalPrice.toFixed(2) }}</text>
        </view>
        <view v-for="item in order.items" :key="item.id" class="oc-item">
          <view class="item-left">
            <text class="item-name">{{ item.name }}</text>
            <text class="item-spec" v-if="item.specInfo">({{ item.specInfo }})</text>
          </view>
          <view class="item-right">
            <text class="item-qty">x{{ item.quantity }}</text>
            <text class="item-sub">¥{{ (item.price * item.quantity).toFixed(2) }}</text>
            <text class="item-del" @click="handleRemove(order.id, item)">退菜</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <button class="btn-order" @click="goOrder">为该桌点单</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getTableOrders, removeDish } from '../../api'

const props = defineProps({})
const tableNo = ref('')
const orders = ref([])

const totalAmount = computed(() => orders.value.reduce((sum, o) => sum + o.totalPrice, 0))

const loadOrders = async () => {
  if (!tableNo.value) return
  const res = await getTableOrders(tableNo.value)
  if (res.code === 200) orders.value = res.data
}

const handleRemove = (orderId, item) => {
  uni.showModal({
    title: '确认退菜',
    content: `确定退掉「${item.name}」x${item.quantity} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        const result = await removeDish(orderId, item.id)
        if (result.code === 200) {
          uni.showToast({ title: '已退菜', icon: 'success' })
          loadOrders()
        } else {
          uni.showToast({ title: result.message, icon: 'none' })
        }
      }
    }
  })
}

const goOrder = () => {
  uni.navigateTo({ url: `/pages/order/index?tableNo=${tableNo.value}` })
}

// 每次页面显示时刷新（包括从点单页返回）
onShow(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  tableNo.value = page.options?.tableNo || page.$page?.options?.tableNo || tableNo.value
  loadOrders()
})
</script>

<style scoped>
.page { padding: 20rpx; padding-bottom: 140rpx; }
.table-info { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 24rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.table-no { font-size: 36rpx; font-weight: bold; color: #333; }
.table-total { font-size: 30rpx; color: #ee0a24; font-weight: bold; }
.section { margin-bottom: 20rpx; }
.section-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 16rpx; display: block; }
.order-card { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; }
.oc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; padding-bottom: 12rpx; border-bottom: 1rpx solid #f0f0f0; }
.oc-no { font-size: 24rpx; color: #999; }
.oc-price { font-size: 28rpx; color: #ee0a24; font-weight: bold; }
.oc-item { display: flex; justify-content: space-between; align-items: center; padding: 10rpx 0; }
.item-left { display: flex; align-items: center; }
.item-name { font-size: 28rpx; color: #333; }
.item-spec { font-size: 24rpx; color: #999; margin-left: 8rpx; }
.item-right { display: flex; align-items: center; gap: 16rpx; }
.item-qty { font-size: 26rpx; color: #666; }
.item-sub { font-size: 26rpx; color: #333; }
.item-del { font-size: 24rpx; color: #f56c6c; padding: 4rpx 16rpx; border: 1rpx solid #f56c6c; border-radius: 8rpx; }
.actions { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx; background: #fff; box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05); }
.btn-order { background: #409eff; color: #fff; border: none; border-radius: 44rpx; font-size: 32rpx; padding: 24rpx 0; }
.empty { text-align: center; color: #999; padding: 60rpx 0; font-size: 28rpx; }
</style>
