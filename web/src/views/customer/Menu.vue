<template>
  <div class="menu-page" :style="{ '--theme': deco.themeColor }">
    <!-- 顶部店铺信息 -->
    <div class="store-header">
      <div class="store-info">
        <img v-if="deco.storeLogo" :src="deco.storeLogo" class="store-logo" />
        <div v-else class="store-logo placeholder">{{ (deco.storeName || '餐')[0] }}</div>
        <div class="store-meta">
          <p class="store-name">{{ deco.storeName }}</p>
          <p class="table-tag" v-if="tableNo">桌号: {{ tableNo }}</p>
        </div>
      </div>
    </div>
    <!-- 当前订单跟踪入口 -->
    <div class="current-order-tip" v-if="sessionOrders.length > 0" @click="$router.push('/c/orders?table=' + tableNo)">
      📋 您有 {{ sessionOrders.length }} 笔订单，点击查看状态
    </div>

    <!-- 公告栏 -->
    <div class="notice-bar" v-if="deco.showNotice && deco.notice">
      <span class="notice-icon">📢</span>
      <div class="notice-scroll">
        <span class="notice-text">{{ deco.notice }}</span>
      </div>
    </div>

    <!-- Banner -->
    <div class="banner" v-if="deco.showBanner && deco.banner">
      <img :src="deco.banner" alt="" />
    </div>

    <!-- 主体: 分类 + 商品 -->
    <div class="menu-body">
      <div class="cate-sidebar">
        <div
          v-for="(cat, idx) in categories"
          :key="cat.id"
          :class="['cate-item', { active: activeCate === idx }]"
          @click="activeCate = idx"
        >
          <span>{{ cat.name }}</span>
          <em v-if="cateCartCount(cat) > 0" class="cate-badge">{{ cateCartCount(cat) }}</em>
        </div>
      </div>

      <div class="product-area">
        <template v-if="currentCategory">
          <h3 class="area-title">{{ currentCategory.name }}</h3>
          <div v-for="product in currentCategory.products" :key="product.id" class="product-card">
            <div class="p-img" @click="openDetail(product)">
              <img v-if="product.image" :src="product.image" alt="" />
              <div v-else class="p-img-ph">{{ product.name[0] }}</div>
            </div>
            <div class="p-info">
              <p class="p-name">{{ product.name }}</p>
              <p class="p-desc">{{ product.description || '' }}</p>
              <div class="p-bottom">
                <span class="p-price"><i>¥</i>{{ product.price }}<small>/{{ product.unit }}</small></span>
                <div class="p-action">
                  <template v-if="hasSpecs(product)">
                    <button class="spec-btn" @click="openDetail(product)">选规格</button>
                    <em v-if="cart.getQuantity(product) > 0" class="p-badge">{{ cart.getQuantity(product) }}</em>
                  </template>
                  <template v-else>
                    <button v-if="cart.getQuantity(product) > 0" class="minus-btn" @click="cart.removeItem(product)">−</button>
                    <span v-if="cart.getQuantity(product) > 0" class="p-qty">{{ cart.getQuantity(product) }}</span>
                    <button class="plus-btn" @click="cart.addItem(product)">＋</button>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <div v-if="currentCategory.products.length === 0" class="empty">暂无菜品</div>
        </template>
      </div>
    </div>

    <!-- 底部购物车栏 -->
    <div class="cart-bar" v-show="cart.totalCount > 0">
      <div class="cart-icon-wrap" @click="showCartPopup = true">
        <div class="cart-icon">🛒</div>
        <em class="cart-count">{{ cart.totalCount }}</em>
      </div>
      <span class="cart-price">¥{{ cart.totalPrice.toFixed(2) }}</span>
      <button class="checkout-btn" @click="$router.push('/c/cart?table=' + tableNo)">去结算</button>
    </div>

    <!-- 商品详情弹窗 -->
    <div class="modal-mask" v-if="detailVisible" @click.self="detailVisible = false">
      <div class="detail-modal">
        <div class="d-img">
          <img v-if="detailProduct.image" :src="detailProduct.image" alt="" />
          <div v-else class="d-img-ph">{{ detailProduct.name?.[0] }}</div>
          <span class="d-close" @click="detailVisible = false">✕</span>
        </div>
        <div class="d-body">
          <h4 class="d-name">{{ detailProduct.name }}</h4>
          <p class="d-desc">{{ detailProduct.description }}</p>
          <!-- 规格选择 -->
          <div v-for="(spec, si) in detailSpecs" :key="si" class="d-spec">
            <p class="d-spec-title">{{ spec.name }}</p>
            <div class="d-spec-values">
              <span
                v-for="(val, vi) in spec.values"
                :key="vi"
                :class="['d-spec-val', { active: selectedSpecs[si] === val }]"
                @click="selectedSpecs[si] = val"
              >{{ val }}</span>
            </div>
          </div>
        </div>
        <div class="d-footer">
          <div class="d-price">¥{{ detailProduct.price }}</div>
          <div class="d-stepper">
            <button class="minus-btn" @click="detailQty > 1 && detailQty--">−</button>
            <span>{{ detailQty }}</span>
            <button class="plus-btn" @click="detailQty++">＋</button>
          </div>
        </div>
        <button class="d-add-btn" @click="addFromDetail">加入购物车</button>
      </div>
    </div>

    <!-- 购物车弹出层 -->
    <div class="modal-mask" v-if="showCartPopup" @click.self="showCartPopup = false">
      <div class="cart-popup">
        <div class="cp-header">
          <span>已选商品</span>
          <span class="cp-clear" @click="cart.clear(); showCartPopup = false">清空</span>
        </div>
        <div class="cp-list">
          <div v-for="item in cart.items" :key="item.product.id + item.specInfo" class="cp-item">
            <div class="cp-left">
              <p class="cp-name">{{ item.product.name }}</p>
              <p class="cp-spec" v-if="item.specInfo">{{ item.specInfo }}</p>
            </div>
            <span class="cp-price">¥{{ (item.product.price * item.quantity).toFixed(2) }}</span>
            <div class="cp-stepper">
              <button class="minus-btn sm" @click="cart.removeItem(item.product, item.specInfo)">−</button>
              <span>{{ item.quantity }}</span>
              <button class="plus-btn sm" @click="cart.addItem(item.product, item.specInfo)">＋</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getMenu, getDecoration } from '../../api'
import { useCartStore } from '../../stores/cart'
import { joinTable } from '../../utils/socket'

const route = useRoute()
const cart = useCartStore()
const categories = ref([])
const activeCate = ref(0)
const tableNo = ref(route.query.table || '')
const deco = ref({ themeColor: '#DA5650', storeName: '美味餐厅', storeLogo: '', banner: '', notice: '', showBanner: false, showNotice: true })
const currentOrderNo = ref(sessionStorage.getItem('current_order') || '')
const sessionOrders = ref(JSON.parse(sessionStorage.getItem('current_orders') || '[]'))

// 商品详情弹窗
const detailVisible = ref(false)
const detailProduct = ref({})
const detailSpecs = ref([])
const selectedSpecs = ref([])
const detailQty = ref(1)

// 购物车弹出层
const showCartPopup = ref(false)

const currentCategory = computed(() => categories.value[activeCate.value])

const hasSpecs = (product) => product.specs && product.specs.length > 0

const cateCartCount = (cat) => {
  if (!cat.products) return 0
  return cat.products.reduce((sum, p) => sum + cart.getQuantity(p), 0)
}

const openDetail = (product) => {
  detailProduct.value = product
  detailQty.value = 1
  if (hasSpecs(product)) {
    detailSpecs.value = product.specs.map(s => ({ name: s.name, values: JSON.parse(s.values) }))
    selectedSpecs.value = detailSpecs.value.map(s => s.values[0])
  } else {
    detailSpecs.value = []
    selectedSpecs.value = []
  }
  detailVisible.value = true
}

const addFromDetail = () => {
  const specInfo = selectedSpecs.value.join(',')
  for (let i = 0; i < detailQty.value; i++) {
    cart.addItem(detailProduct.value, specInfo)
  }
  detailVisible.value = false
}

if (tableNo.value) {
  cart.setTable(tableNo.value)
  joinTable(tableNo.value)
}

onMounted(async () => {
  const [menuRes, decoRes] = await Promise.all([getMenu(), getDecoration()])
  if (menuRes.code === 200) categories.value = menuRes.data
  if (decoRes.code === 200) deco.value = decoRes.data
})
</script>

<style scoped>
.menu-page { height: 100vh; display: flex; flex-direction: column; background: #f5f5f5; --theme: #DA5650; }

/* 店铺头部 */
.store-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; }
.store-info { display: flex; align-items: center; gap: 10px; }
.store-logo { width: 42px; height: 42px; border-radius: 8px; object-fit: cover; }
.store-logo.placeholder { background: var(--theme); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; }
.store-name { font-size: 16px; font-weight: bold; color: #333; }
.table-tag { font-size: 12px; color: #999; margin-top: 2px; }
.my-orders { font-size: 13px; color: var(--theme); }
.current-order-tip { padding: 8px 16px; background: #f0f9eb; color: #67c23a; font-size: 13px; text-align: center; cursor: pointer; }

/* 公告 */
.notice-bar { display: flex; align-items: center; gap: 6px; padding: 6px 16px; background: #fffdf0; font-size: 12px; color: #e6a23c; overflow: hidden; }
.notice-icon { flex-shrink: 0; }
.notice-scroll { overflow: hidden; white-space: nowrap; }
.notice-text { display: inline-block; animation: scrollNotice 12s linear infinite; }
@keyframes scrollNotice { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }

/* Banner */
.banner { margin: 8px 12px 0; border-radius: 10px; overflow: hidden; }
.banner img { width: 100%; height: 120px; object-fit: cover; display: block; }

/* 主体 */
.menu-body { flex: 1; display: flex; overflow: hidden; margin-top: 8px; }
.cate-sidebar { width: 82px; background: #f7f8fa; overflow-y: auto; flex-shrink: 0; }
.cate-item { position: relative; padding: 15px 6px; text-align: center; font-size: 13px; color: #666; cursor: pointer; border-left: 3px solid transparent; transition: all .2s; }
.cate-item.active { background: #fff; color: var(--theme); font-weight: bold; border-left-color: var(--theme); }
.cate-badge { position: absolute; top: 6px; right: 4px; min-width: 16px; height: 16px; line-height: 16px; text-align: center; font-size: 10px; font-style: normal; color: #fff; background: var(--theme); border-radius: 8px; padding: 0 3px; }

.product-area { flex: 1; overflow-y: auto; padding: 12px; background: #fff; }
.area-title { font-size: 15px; font-weight: bold; color: #333; margin-bottom: 12px; padding-left: 8px; border-left: 3px solid var(--theme); }
.product-card { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
.product-card:last-child { border-bottom: none; }
.p-img { width: 88px; height: 88px; border-radius: 8px; overflow: hidden; flex-shrink: 0; cursor: pointer; }
.p-img img { width: 100%; height: 100%; object-fit: cover; }
.p-img-ph { width: 100%; height: 100%; background: linear-gradient(135deg, #f0f0f0, #e0e0e0); display: flex; align-items: center; justify-content: center; font-size: 28px; color: #bbb; }
.p-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }
.p-name { font-size: 15px; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p-desc { font-size: 12px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 4px; }
.p-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.p-price { color: var(--theme); font-size: 17px; font-weight: bold; }
.p-price i { font-style: normal; font-size: 12px; }
.p-price small { font-size: 11px; color: #999; font-weight: normal; }
.p-action { display: flex; align-items: center; gap: 6px; position: relative; }
.spec-btn { background: var(--theme); color: #fff; border: none; padding: 4px 12px; border-radius: 14px; font-size: 12px; cursor: pointer; }
.p-badge { position: absolute; top: -8px; right: -8px; min-width: 16px; height: 16px; line-height: 16px; text-align: center; font-size: 10px; font-style: normal; color: #fff; background: var(--theme); border-radius: 8px; }
.plus-btn, .minus-btn { width: 24px; height: 24px; border-radius: 50%; border: none; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform .1s; }
.plus-btn { background: var(--theme); color: #fff; }
.plus-btn:active { transform: scale(0.9); }
.minus-btn { background: #fff; border: 1px solid #ddd; color: #666; }
.minus-btn.sm, .plus-btn.sm { width: 22px; height: 22px; font-size: 13px; }
.p-qty { font-size: 14px; min-width: 18px; text-align: center; }
.empty { text-align: center; color: #ccc; padding: 40px 0; }

/* 底部购物车栏 */
.cart-bar { position: fixed; bottom: 16px; left: 16px; right: 16px; height: 50px; background: #2d2d2d; border-radius: 25px; display: flex; align-items: center; padding: 0 6px 0 0; box-shadow: 0 4px 16px rgba(0,0,0,0.2); z-index: 100; }
.cart-icon-wrap { position: relative; width: 56px; height: 56px; background: var(--theme); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: -14px; margin-left: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.cart-icon { font-size: 24px; }
.cart-count { position: absolute; top: -2px; right: -2px; min-width: 18px; height: 18px; line-height: 18px; text-align: center; font-size: 11px; font-style: normal; color: #fff; background: #ff4d4f; border-radius: 9px; padding: 0 4px; }
.cart-price { flex: 1; color: #fff; font-size: 18px; font-weight: bold; padding-left: 12px; }
.checkout-btn { background: var(--theme); color: #fff; border: none; padding: 10px 24px; border-radius: 20px; font-size: 14px; font-weight: 500; cursor: pointer; }

/* 弹窗通用 */
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }

/* 商品详情弹窗 */
.detail-modal { width: 100%; max-width: 500px; background: #fff; border-radius: 16px 16px 0 0; overflow: hidden; }
.d-img { position: relative; height: 180px; background: #f5f5f5; }
.d-img img { width: 100%; height: 100%; object-fit: cover; }
.d-img-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; color: #ccc; }
.d-close { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; background: rgba(0,0,0,0.4); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; }
.d-body { padding: 16px; max-height: 40vh; overflow-y: auto; }
.d-name { font-size: 17px; font-weight: bold; color: #333; }
.d-desc { font-size: 13px; color: #999; margin-top: 6px; }
.d-spec { margin-top: 14px; }
.d-spec-title { font-size: 13px; color: #333; margin-bottom: 8px; font-weight: 500; }
.d-spec-values { display: flex; flex-wrap: wrap; gap: 8px; }
.d-spec-val { padding: 5px 14px; font-size: 13px; background: #f5f5f5; border-radius: 6px; color: #666; cursor: pointer; transition: all .2s; }
.d-spec-val.active { background: var(--theme); color: #fff; }
.d-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fafafa; }
.d-price { font-size: 20px; font-weight: bold; color: var(--theme); }
.d-stepper { display: flex; align-items: center; gap: 12px; font-size: 15px; }
.d-add-btn { width: 100%; padding: 13px; background: var(--theme); color: #fff; border: none; font-size: 15px; font-weight: 500; cursor: pointer; }

/* 购物车弹出层 */
.cart-popup { width: 100%; max-width: 500px; background: #fff; border-radius: 16px 16px 0 0; max-height: 60vh; display: flex; flex-direction: column; }
.cp-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 500; }
.cp-clear { font-size: 13px; color: #999; cursor: pointer; }
.cp-list { overflow-y: auto; padding: 0 16px; }
.cp-item { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f8f8f8; }
.cp-item:last-child { border-bottom: none; }
.cp-left { flex: 1; min-width: 0; }
.cp-name { font-size: 14px; color: #333; }
.cp-spec { font-size: 12px; color: #999; margin-top: 2px; }
.cp-price { font-size: 14px; color: var(--theme); margin: 0 12px; }
.cp-stepper { display: flex; align-items: center; gap: 8px; font-size: 14px; }

/* PC 适配 */
@media (min-width: 768px) {
  .menu-page { max-width: 480px; margin: 0 auto; box-shadow: 0 0 30px rgba(0,0,0,0.08); position: relative; }
  .cart-bar { max-width: 448px; left: 50%; transform: translateX(-50%); }
  .banner img { height: 160px; }
}
</style>
