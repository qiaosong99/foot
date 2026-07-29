<template>
  <div class="cart-page">
    <div class="page-header">
      <span class="back" @click="$router.back()">← 返回</span>
      <span>确认订单</span>
      <span></span>
    </div>

    <div class="cart-content">
      <div class="section">
        <h4>桌号: {{ tableNo }}</h4>
      </div>

      <div class="section">
        <div v-for="item in cart.items" :key="item.product.id + item.specInfo" class="cart-item">
          <div class="item-info">
            <span class="item-name">{{ item.product.name }}</span>
            <span class="item-spec" v-if="item.specInfo">{{ item.specInfo }}</span>
          </div>
          <div class="item-right">
            <span class="item-price">¥{{ (item.product.price * item.quantity).toFixed(2) }}</span>
            <div class="stepper">
              <button class="btn-sm" @click="cart.removeItem(item.product, item.specInfo)">-</button>
              <span>{{ item.quantity }}</span>
              <button class="btn-sm" @click="cart.addItem(item.product, item.specInfo)">+</button>
            </div>
          </div>
        </div>
        <div v-if="cart.items.length === 0" class="empty">购物车为空</div>
      </div>

      <div class="section">
        <label>备注</label>
        <textarea v-model="remark" placeholder="如：少辣、不要葱等" rows="2"></textarea>
      </div>
    </div>

    <div class="submit-bar">
      <div class="total">合计: <b>¥{{ cart.totalPrice.toFixed(2) }}</b></div>
      <button class="submit-btn" :disabled="cart.items.length === 0 || submitting" @click="handleSubmit">
        {{ submitting ? '提交中...' : '提交订单' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useCartStore } from '../../stores/cart'
import { submitOrder } from '../../api'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const tableNo = ref(route.query.table || cart.tableNo)
const remark = ref('')
const submitting = ref(false)

const handleSubmit = async () => {
  if (cart.items.length === 0) return
  submitting.value = true
  try {
    const data = {
      tableNo: tableNo.value,
      remark: remark.value,
      items: cart.items.map(i => ({
        productId: i.product.id,
        specInfo: i.specInfo,
        quantity: i.quantity
      }))
    }
    const res = await submitOrder(data)
    if (res.code === 200) {
      showToast('下单成功！')
      cart.clear()
      sessionStorage.setItem('current_order', res.data.orderNo)
      const orders = JSON.parse(sessionStorage.getItem('current_orders') || '[]')
      orders.push(res.data.orderNo)
      sessionStorage.setItem('current_orders', JSON.stringify(orders))
      router.replace(`/c/order/${res.data.orderNo}?table=${tableNo.value}`)
    } else {
      showToast(res.message || '下单失败')
    }
  } catch (e) {
    showToast('网络错误')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.cart-page { height: 100vh; display: flex; flex-direction: column; background: #f5f5f5; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #fff; font-size: 16px; font-weight: bold; }
.back { color: #1989fa; font-size: 14px; font-weight: normal; cursor: pointer; }
.cart-content { flex: 1; overflow-y: auto; padding: 12px; }
.section { background: #fff; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
.section h4 { font-size: 15px; color: #333; }
.cart-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.cart-item:last-child { border-bottom: none; }
.item-name { font-size: 14px; color: #333; }
.item-spec { font-size: 12px; color: #999; margin-left: 6px; }
.item-right { display: flex; align-items: center; gap: 12px; }
.item-price { color: #ee0a24; font-size: 14px; }
.stepper { display: flex; align-items: center; gap: 8px; }
.btn-sm { width: 22px; height: 22px; border-radius: 4px; border: 1px solid #ddd; background: #fff; cursor: pointer; font-size: 14px; }
.section label { font-size: 14px; color: #333; display: block; margin-bottom: 8px; }
.section textarea { width: 100%; border: 1px solid #eee; border-radius: 6px; padding: 8px; font-size: 13px; resize: none; }
.empty { text-align: center; color: #999; padding: 20px; }
.submit-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border-top: 1px solid #eee; }
.total { font-size: 14px; color: #333; }
.total b { color: #ee0a24; font-size: 18px; }
.submit-btn { background: #1989fa; color: #fff; border: none; padding: 10px 32px; border-radius: 22px; font-size: 15px; cursor: pointer; }
.submit-btn:disabled { background: #ccc; }

@media (min-width: 768px) {
  .cart-page { max-width: 600px; margin: 0 auto; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
}
</style>
