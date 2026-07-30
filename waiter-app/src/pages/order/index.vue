<template>
  <view class="page">
    <view class="menu-body">
      <!-- 分类 -->
      <scroll-view class="cate-list" scroll-y>
        <view v-for="(cat, idx) in categories" :key="cat.id" :class="['cate-item', { active: activeCate === idx }]" @click="activeCate = idx">
          <text>{{ cat.name }}</text>
        </view>
      </scroll-view>
      <!-- 菜品 -->
      <scroll-view class="product-list" scroll-y>
        <view v-for="product in currentProducts" :key="product.id" class="product-row">
          <view class="p-info">
            <text class="p-name">{{ product.name }}</text>
            <text class="p-price">¥{{ product.price }}</text>
          </view>
          <view class="p-action">
            <text v-if="getQty(product) > 0" class="minus" @click="removeItem(product)">-</text>
            <text v-if="getQty(product) > 0" class="qty">{{ getQty(product) }}</text>
            <text class="plus" @click="addItem(product)">+</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部购物车 -->
    <view class="cart-bar" v-if="cartCount > 0">
      <view class="cart-info">
        <text class="cart-count">{{ cartCount }}件</text>
        <text class="cart-price">¥{{ cartTotal.toFixed(2) }}</text>
      </view>
      <button class="submit-btn" @click="handleSubmit">提交订单</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getMenu, submitOrder } from '../../api'

const tableNo = ref('')
const categories = ref([])
const activeCate = ref(0)
const cart = ref([])

const currentProducts = computed(() => categories.value[activeCate.value]?.products || [])
const cartCount = computed(() => cart.value.reduce((sum, i) => sum + i.qty, 0))
const cartTotal = computed(() => cart.value.reduce((sum, i) => sum + i.price * i.qty, 0))

const getQty = (product) => {
  const item = cart.value.find(i => i.id === product.id)
  return item ? item.qty : 0
}

const addItem = (product) => {
  const existing = cart.value.find(i => i.id === product.id)
  if (existing) { existing.qty++ } else { cart.value.push({ id: product.id, name: product.name, price: product.price, qty: 1 }) }
}

const removeItem = (product) => {
  const idx = cart.value.findIndex(i => i.id === product.id)
  if (idx > -1) {
    if (cart.value[idx].qty > 1) cart.value[idx].qty--
    else cart.value.splice(idx, 1)
  }
}

const handleSubmit = async () => {
  const items = cart.value.map(i => ({ productId: i.id, quantity: i.qty }))
  const res = await submitOrder({ tableNo: tableNo.value, items })
  if (res.code === 200) {
    uni.showToast({ title: '下单成功', icon: 'success' })
    cart.value = []
    setTimeout(() => uni.navigateBack(), 1000)
  } else {
    uni.showToast({ title: res.message || '下单失败', icon: 'none' })
  }
}

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  tableNo.value = page.options?.tableNo || page.$page?.options?.tableNo || ''
  const res = await getMenu()
  if (res.code === 200) categories.value = res.data
})
</script>

<style scoped>
.page { height: 100vh; display: flex; flex-direction: column; }
.menu-body { flex: 1; display: flex; overflow: hidden; }
.cate-list { width: 160rpx; background: #f7f8fa; }
.cate-item { padding: 28rpx 12rpx; text-align: center; font-size: 26rpx; color: #666; border-left: 6rpx solid transparent; }
.cate-item.active { background: #fff; color: #409eff; font-weight: bold; border-left-color: #409eff; }
.product-list { flex: 1; background: #fff; padding: 0 20rpx; }
.product-row { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.p-info { flex: 1; }
.p-name { display: block; font-size: 28rpx; color: #333; }
.p-price { display: block; font-size: 28rpx; color: #ee0a24; margin-top: 6rpx; }
.p-action { display: flex; align-items: center; gap: 16rpx; }
.plus, .minus { width: 48rpx; height: 48rpx; line-height: 48rpx; text-align: center; border-radius: 50%; font-size: 32rpx; }
.plus { background: #409eff; color: #fff; }
.minus { background: #fff; border: 1rpx solid #ddd; color: #666; }
.qty { font-size: 28rpx; min-width: 36rpx; text-align: center; }
.cart-bar { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 30rpx; background: #2d2d2d; }
.cart-info { display: flex; align-items: center; gap: 20rpx; }
.cart-count { color: #fff; font-size: 26rpx; }
.cart-price { color: #fff; font-size: 34rpx; font-weight: bold; }
.submit-btn { background: #409eff; color: #fff; border: none; border-radius: 40rpx; font-size: 28rpx; padding: 16rpx 48rpx; margin: 0; }
</style>
