<template>
  <view class="page">
    <view class="header">
      <text class="title">桌台列表</text>
      <text class="refresh" @click="loadTables">刷新</text>
    </view>
    <view class="table-grid">
      <view
        v-for="table in tables"
        :key="table.id"
        :class="['table-card', table.status === 1 ? 'busy' : table.status === 2 ? 'reserved' : 'free', table.hasSettleRequest ? 'settle' : '']"
        @click="goDetail(table)"
      >
        <text class="t-no">{{ table.tableNo }}</text>
        <text class="t-status">{{ table.hasSettleRequest ? '待结算' : table.status === 1 ? '使用中' : table.status === 2 ? '预订' : '空闲' }}</text>
        <text class="t-amount" v-if="table.status === 1">¥{{ table.totalAmount.toFixed(2) }}</text>
        <text class="t-orders" v-if="table.orderCount > 0">{{ table.orderCount }}单</text>
      </view>
    </view>
    <view v-if="tables.length === 0" class="empty">
      <text>暂无桌台数据</text>
      <text class="tip">请先在设置中配置服务器地址</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getTables } from '../../api'

const tables = ref([])

const loadTables = async () => {
  try {
    const res = await getTables()
    if (res.code === 200) tables.value = res.data
  } catch (e) {}
}

const goDetail = (table) => {
  uni.navigateTo({ url: `/pages/table-detail/index?tableNo=${table.tableNo}` })
}

// 每次页面显示时刷新
onShow(() => loadTables())
</script>

<style scoped>
.page { padding: 20rpx; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.title { font-size: 36rpx; font-weight: bold; color: #333; }
.refresh { font-size: 28rpx; color: #409eff; }
.table-grid { display: flex; flex-wrap: wrap; gap: 20rpx; }
.table-card { width: calc(33.33% - 14rpx); background: #fff; border-radius: 16rpx; padding: 24rpx 16rpx; text-align: center; border: 3rpx solid #eee; }
.table-card.busy { border-color: #409eff; background: #ecf5ff; }
.table-card.reserved { border-color: #67c23a; background: #f0f9eb; }
.table-card.settle { border-color: #e6a23c; background: #fdf6ec; }
.t-no { display: block; font-size: 36rpx; font-weight: bold; color: #333; }
.t-status { display: block; font-size: 24rpx; color: #999; margin-top: 8rpx; }
.table-card.busy .t-status { color: #409eff; }
.table-card.reserved .t-status { color: #67c23a; }
.table-card.settle .t-status { color: #e6a23c; font-weight: bold; }
.t-amount { display: block; font-size: 28rpx; color: #ee0a24; font-weight: bold; margin-top: 8rpx; }
.t-orders { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.empty { text-align: center; padding: 120rpx 0; color: #999; }
.empty .tip { display: block; font-size: 24rpx; margin-top: 16rpx; color: #ccc; }
</style>
