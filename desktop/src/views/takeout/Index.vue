<template>
  <div class="takeout-page">
    <div class="takeout-left">
      <h4>菜单</h4>
      <div class="menu-body">
        <div class="cate-list">
          <div v-for="(cat, idx) in categories" :key="cat.id" :class="['cate-item', { active: activeCate === idx }]" @click="activeCate = idx">
            {{ cat.name }}
          </div>
        </div>
        <div class="product-list">
          <div v-for="product in currentProducts" :key="product.id" class="product-row">
            <span class="p-name">{{ product.name }}</span>
            <span class="p-price">¥{{ product.price }}</span>
            <el-button size="small" type="primary" @click="addToCart(product)">+</el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="takeout-right">
      <h4>外卖订单</h4>
      <div class="cart-section">
        <div class="cart-header">
          <el-select v-model="selectedTable" placeholder="选择外卖桌台" size="small" style="width: 160px;">
            <el-option v-for="t in takeoutTables" :key="t.id" :label="t.tableNo" :value="t.tableNo" />
          </el-select>
          <el-button size="small" text type="danger" @click="cart = []">清空</el-button>
        </div>
        <div class="cart-items">
          <div v-for="(item, idx) in cart" :key="idx" class="cart-item">
            <span>{{ item.name }}</span>
            <div class="ci-ctrl">
              <el-button size="small" text @click="item.qty > 1 ? item.qty-- : cart.splice(idx, 1)">-</el-button>
              <span>{{ item.qty }}</span>
              <el-button size="small" text @click="item.qty++">+</el-button>
            </div>
            <span class="ci-price">¥{{ (item.price * item.qty).toFixed(2) }}</span>
          </div>
          <div v-if="cart.length === 0" class="empty">请选择菜品</div>
        </div>
        <div class="cart-footer">
          <span class="cart-total">合计: ¥{{ cartTotal.toFixed(2) }}</span>
          <el-button type="primary" @click="submitOrder" :disabled="cart.length === 0 || !selectedTable">提交订单</el-button>
        </div>
      </div>

      <!-- 外卖订单列表 -->
      <div class="takeout-orders">
        <h4>外卖订单状态</h4>
        <el-table :data="takeoutOrders" size="small" stripe max-height="250">
          <el-table-column prop="orderNo" label="单号" width="160" />
          <el-table-column label="桌号" width="70">
            <template #default="{ row }">{{ row.table?.tableNo }}</template>
          </el-table-column>
          <el-table-column label="金额" width="80">
            <template #default="{ row }">¥{{ row.totalPrice?.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag size="small">{{ ['待制作','制作中','已上菜','已完成','已取消'][row.status] }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getMenu, getTables, createTakeoutOrder, getOrders } from '../../api'

const categories = ref([])
const activeCate = ref(0)
const cart = ref([])
const selectedTable = ref('')
const takeoutTables = ref([])
const takeoutOrders = ref([])

const currentProducts = computed(() => categories.value[activeCate.value]?.products || [])
const cartTotal = computed(() => cart.value.reduce((sum, i) => sum + i.price * i.qty, 0))

const addToCart = (product) => {
  const existing = cart.value.find(i => i.id === product.id)
  if (existing) { existing.qty++ } else { cart.value.push({ id: product.id, name: product.name, price: product.price, qty: 1 }) }
}

const submitOrder = async () => {
  const items = cart.value.map(i => ({ productId: i.id, quantity: i.qty }))
  const res = await createTakeoutOrder({ tableNo: selectedTable.value, items })
  if (res.code === 200) {
    ElMessage.success('外卖订单已提交')
    cart.value = []
    loadTakeoutOrders()
  } else {
    ElMessage.error(res.message)
  }
}

const loadTakeoutOrders = async () => {
  const res = await getOrders({ pageSize: 20 })
  if (res.code === 200) {
    takeoutOrders.value = (res.data.list || []).filter(o => o.orderType === 'takeout')
  }
}

onMounted(async () => {
  const [menuRes, tableRes] = await Promise.all([getMenu(), getTables()])
  if (menuRes.code === 200) categories.value = menuRes.data
  if (tableRes.code === 200) takeoutTables.value = tableRes.data.filter(t => t.type === 'takeout')
  loadTakeoutOrders()
})
</script>

<style scoped>
.takeout-page { height: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; }
.takeout-left, .takeout-right { display: flex; flex-direction: column; overflow: hidden; }
.takeout-left h4, .takeout-right h4 { font-size: 15px; color: #333; margin-bottom: 10px; }
.menu-body { flex: 1; display: flex; overflow: hidden; background: #fff; border-radius: 8px; }
.cate-list { width: 100px; background: #f7f8fa; overflow-y: auto; border-right: 1px solid #eee; }
.cate-item { padding: 12px 8px; text-align: center; font-size: 13px; cursor: pointer; border-left: 3px solid transparent; }
.cate-item.active { background: #fff; color: #409eff; font-weight: bold; border-left-color: #409eff; }
.product-list { flex: 1; overflow-y: auto; padding: 10px; }
.product-row { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
.p-name { flex: 1; font-size: 14px; }
.p-price { color: #ee0a24; margin-right: 10px; font-size: 14px; }
.cart-section { background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
.cart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.cart-items { max-height: 200px; overflow-y: auto; }
.cart-item { display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #f8f8f8; font-size: 13px; }
.cart-item span:first-child { flex: 1; }
.ci-ctrl { display: flex; align-items: center; gap: 8px; margin: 0 12px; }
.ci-price { color: #ee0a24; width: 60px; text-align: right; }
.cart-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; }
.cart-total { font-size: 16px; color: #ee0a24; font-weight: bold; }
.takeout-orders { flex: 1; overflow: hidden; }
.empty { text-align: center; color: #ccc; padding: 30px 0; }
</style>
