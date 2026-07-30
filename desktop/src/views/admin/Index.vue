<template>
  <div class="admin-page">
    <div class="admin-sidebar">
      <div v-for="item in menuItems" :key="item.key" :class="['menu-item', { active: activeMenu === item.key }]" @click="activeMenu = item.key">
        {{ item.label }}
      </div>
    </div>
    <div class="admin-content">
      <!-- 分类管理 -->
      <div v-if="activeMenu === 'categories'">
        <div class="content-header"><h4>分类管理</h4><el-button type="primary" size="small" @click="openCateDialog()">新增分类</el-button></div>
        <el-table :data="categories" size="small" stripe>
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="sort" label="排序" width="70" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }"><el-tag size="small" :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="openCateDialog(row)">编辑</el-button>
              <el-button size="small" text type="danger" @click="delCate(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 桌台管理 -->
      <div v-if="activeMenu === 'tables'">
        <div class="content-header"><h4>桌台管理</h4><el-button type="primary" size="small" @click="openTableDialog()">新增桌台</el-button></div>
        <el-table :data="tables" size="small" stripe>
          <el-table-column prop="tableNo" label="桌号" width="90" />
          <el-table-column prop="seats" label="座位" width="60" />
          <el-table-column label="类型" width="70">
            <template #default="{ row }">{{ row.type === 'takeout' ? '外卖' : '堂食' }}</template>
          </el-table-column>
          <el-table-column prop="area" label="区域" width="80" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }"><el-tag size="small" :type="row.status === 1 ? 'warning' : 'success'">{{ row.status === 1 ? '使用中' : '空闲' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button size="small" text type="success" @click="showQrCode(row)">二维码</el-button>
              <el-button size="small" text type="primary" @click="openTableDialog(row)">编辑</el-button>
              <el-button size="small" text type="danger" @click="delTable(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 菜品管理 -->
      <div v-if="activeMenu === 'products'">
        <div class="content-header"><h4>菜品管理</h4><el-button type="primary" size="small" @click="openProductDialog()">新增菜品</el-button></div>
        <el-table :data="products" size="small" stripe>
          <el-table-column prop="name" label="名称" />
          <el-table-column label="分类" width="90"><template #default="{ row }">{{ row.category?.name }}</template></el-table-column>
          <el-table-column label="价格" width="70"><template #default="{ row }">¥{{ row.price }}</template></el-table-column>
          <el-table-column label="状态" width="70">
            <template #default="{ row }"><el-tag size="small" :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '上架' : '下架' }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="sales" label="销量" width="60" />
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="openProductDialog(row)">编辑</el-button>
              <el-button size="small" text type="danger" @click="delProduct(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 订单管理 -->
      <div v-if="activeMenu === 'orders'">
        <h4>订单管理</h4>
        <el-table :data="orders" size="small" stripe>
          <el-table-column prop="orderNo" label="订单号" width="170" />
          <el-table-column label="桌号" width="60"><template #default="{ row }">{{ row.table?.tableNo }}</template></el-table-column>
          <el-table-column label="类型" width="70"><template #default="{ row }">{{ {dine_in:'堂食',takeout:'外卖',waiter:'服务员'}[row.orderType] }}</template></el-table-column>
          <el-table-column label="金额" width="80"><template #default="{ row }">¥{{ row.totalPrice?.toFixed(2) }}</template></el-table-column>
          <el-table-column label="状态" width="70"><template #default="{ row }"><el-tag size="small">{{ ['待制作','制作中','已上菜','已完成','已取消'][row.status] }}</el-tag></template></el-table-column>
          <el-table-column label="结算" width="80"><template #default="{ row }"><el-tag size="small" :type="row.settleStatus === 2 ? 'success' : row.settleStatus === 1 ? 'warning' : 'info'">{{ ['未结算','请求中','已结算'][row.settleStatus] }}</el-tag></template></el-table-column>
        </el-table>
      </div>

      <!-- 页面装修 -->
      <div v-if="activeMenu === 'decoration'">
        <h4>页面装修</h4>
        <el-form :model="deco" label-width="100px" style="max-width: 500px;">
          <el-form-item label="店铺名称"><el-input v-model="deco.storeName" /></el-form-item>
          <el-form-item label="主题色"><el-color-picker v-model="deco.themeColor" /></el-form-item>
          <el-form-item label="店铺Logo">
            <el-upload :action="uploadUrl" name="file" :show-file-list="false" :on-success="(res) => { if(res.code===200) deco.storeLogo = res.data.url }">
              <img v-if="deco.storeLogo" :src="imgUrl(deco.storeLogo)" style="width:60px;height:60px;object-fit:cover;border-radius:6px;" />
              <el-button v-else size="small">选择图片</el-button>
            </el-upload>
          </el-form-item>
          <el-form-item label="Banner图">
            <el-upload :action="uploadUrl" name="file" :show-file-list="false" :on-success="(res) => { if(res.code===200) deco.banner = res.data.url }">
              <img v-if="deco.banner" :src="imgUrl(deco.banner)" style="width:200px;height:80px;object-fit:cover;border-radius:6px;" />
              <el-button v-else size="small">选择图片</el-button>
            </el-upload>
          </el-form-item>
          <el-form-item label="显示Banner"><el-switch v-model="deco.showBanner" /></el-form-item>
          <el-form-item label="公告内容"><el-input v-model="deco.notice" type="textarea" /></el-form-item>
          <el-form-item label="显示公告"><el-switch v-model="deco.showNotice" /></el-form-item>
          <el-form-item><el-button type="primary" @click="saveDeco">保存装修</el-button></el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 分类弹窗 -->
    <el-dialog v-model="cateDialogVisible" :title="cateForm.id ? '编辑分类' : '新增分类'" width="400px">
      <el-form :model="cateForm" label-width="70px">
        <el-form-item label="名称"><el-input v-model="cateForm.name" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="cateForm.sort" :min="0" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="cateForm.status" :active-value="1" :inactive-value="0" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="cateDialogVisible = false">取消</el-button><el-button type="primary" @click="saveCate">保存</el-button></template>
    </el-dialog>

    <!-- 桌台弹窗 -->
    <el-dialog v-model="tableDialogVisible" :title="tableForm.id ? '编辑桌台' : '新增桌台'" width="400px">
      <el-form :model="tableForm" label-width="70px">
        <el-form-item label="桌号"><el-input v-model="tableForm.tableNo" /></el-form-item>
        <el-form-item label="座位数"><el-input-number v-model="tableForm.seats" :min="0" /></el-form-item>
        <el-form-item label="类型"><el-select v-model="tableForm.type"><el-option label="堂食" value="dine_in" /><el-option label="外卖" value="takeout" /></el-select></el-form-item>
        <el-form-item label="区域"><el-input v-model="tableForm.area" placeholder="大厅/包间/外卖" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="tableDialogVisible = false">取消</el-button><el-button type="primary" @click="saveTable">保存</el-button></template>
    </el-dialog>

    <!-- 二维码弹窗 -->
    <el-dialog v-model="qrDialogVisible" :title="`${qrTable?.tableNo} 桌二维码`" width="360px">
      <div style="text-align:center;">
        <img v-if="qrImageUrl" :src="qrImageUrl" style="width:220px;height:220px;" />
        <p v-else style="color:#999;padding:40px 0;">点击下方按钮生成二维码</p>
        <p style="font-size:12px;color:#999;margin-top:8px;">{{ qrUrl }}</p>
      </div>
      <template #footer>
        <el-button @click="generateQr">{{ qrImageUrl ? '重新生成' : '生成二维码' }}</el-button>
        <el-button type="primary" :disabled="!qrImageUrl" @click="downloadQr">保存到电脑</el-button>
      </template>
    </el-dialog>

    <!-- 菜品弹窗 -->
    <el-dialog v-model="productDialogVisible" :title="productForm.id ? '编辑菜品' : '新增菜品'" width="450px">
      <el-form :model="productForm" label-width="70px">
        <el-form-item label="名称"><el-input v-model="productForm.name" /></el-form-item>
        <el-form-item label="分类"><el-select v-model="productForm.categoryId"><el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" /></el-select></el-form-item>
        <el-form-item label="价格"><el-input-number v-model="productForm.price" :min="0" :precision="1" /></el-form-item>
        <el-form-item label="图片">
          <el-upload :action="uploadUrl" name="file" :show-file-list="false" :on-success="(res) => { if(res.code===200) productForm.image = res.data.url }">
            <img v-if="productForm.image" :src="imgUrl(productForm.image)" style="width:80px;height:80px;object-fit:cover;border-radius:6px;" />
            <el-button v-else size="small">选择图片</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="单位"><el-input v-model="productForm.unit" placeholder="份" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="productForm.description" type="textarea" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="productForm.status" :active-value="1" :inactive-value="0" active-text="上架" inactive-text="下架" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="productDialogVisible = false">取消</el-button><el-button type="primary" @click="saveProduct">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories, createCategory, updateCategory, deleteCategory, getTables, createTable, updateTable, deleteTable, getOrders } from '../../api'
import request from '../../api'

const menuItems = [
  { key: 'categories', label: '分类管理' },
  { key: 'tables', label: '桌台管理' },
  { key: 'products', label: '菜品管理' },
  { key: 'orders', label: '订单管理' },
  { key: 'decoration', label: '页面装修' },
]
const activeMenu = ref('categories')
const categories = ref([])
const tables = ref([])
const products = ref([])
const orders = ref([])
const deco = ref({ themeColor: '#DA5650', storeName: '', storeLogo: '', banner: '', notice: '', showBanner: true, showNotice: true })

// 上传相关
const serverBase = localStorage.getItem('server_url') || 'http://localhost:3000'
const uploadUrl = serverBase + '/api/upload/image'
const imgUrl = (path) => path ? (path.startsWith('http') ? path : serverBase + path) : ''

// 分类 CRUD
const cateDialogVisible = ref(false)
const cateForm = ref({ name: '', sort: 0, status: 1 })
const openCateDialog = (row) => { cateForm.value = row ? { ...row } : { name: '', sort: 0, status: 1 }; cateDialogVisible.value = true }
const saveCate = async () => {
  const res = cateForm.value.id ? await updateCategory(cateForm.value.id, cateForm.value) : await createCategory(cateForm.value)
  if (res.code === 200) { ElMessage.success('保存成功'); cateDialogVisible.value = false; loadCategories() } else ElMessage.error(res.message)
}
const delCate = async (row) => {
  await ElMessageBox.confirm(`删除分类「${row.name}」？`, '确认')
  const res = await deleteCategory(row.id)
  if (res.code === 200) { ElMessage.success('已删除'); loadCategories() } else ElMessage.error(res.message)
}

// 桌台 CRUD
const tableDialogVisible = ref(false)
const tableForm = ref({ tableNo: '', seats: 4, type: 'dine_in', area: '' })
const openTableDialog = (row) => { tableForm.value = row ? { ...row } : { tableNo: '', seats: 4, type: 'dine_in', area: '' }; tableDialogVisible.value = true }
const saveTable = async () => {
  const res = tableForm.value.id ? await updateTable(tableForm.value.id, tableForm.value) : await createTable(tableForm.value)
  if (res.code === 200) { ElMessage.success('保存成功'); tableDialogVisible.value = false; loadTables() } else ElMessage.error(res.message)
}
const delTable = async (row) => {
  await ElMessageBox.confirm(`删除桌台「${row.tableNo}」？`, '确认')
  const res = await deleteTable(row.id)
  if (res.code === 200) { ElMessage.success('已删除'); loadTables() } else ElMessage.error(res.message)
}

// 二维码
const qrDialogVisible = ref(false)
const qrTable = ref(null)
const qrImageUrl = ref('')
const qrUrl = ref('')
const showQrCode = (row) => {
  qrTable.value = row
  qrImageUrl.value = row.qrCodeUrl ? imgUrl(row.qrCodeUrl) : ''
  qrUrl.value = `${serverBase}/c/menu?table=${row.tableNo}`
  qrDialogVisible.value = true
}
const generateQr = async () => {
  const res = await request.get(`/admin/tables/${qrTable.value.id}/qrcode`)
  if (res.code === 200) {
    qrImageUrl.value = imgUrl(res.data.qrCodeUrl)
    qrUrl.value = res.data.url
    ElMessage.success('二维码已生成')
    loadTables()
  } else ElMessage.error(res.message)
}
const downloadQr = () => {
  const a = document.createElement('a')
  a.href = qrImageUrl.value
  a.download = `二维码_${qrTable.value.tableNo}.png`
  a.click()
}

// 菜品 CRUD
const productDialogVisible = ref(false)
const productForm = ref({ name: '', categoryId: null, price: 0, unit: '份', description: '', status: 1, image: '' })
const openProductDialog = (row) => { productForm.value = row ? { ...row } : { name: '', categoryId: categories.value[0]?.id, price: 0, unit: '份', description: '', status: 1, image: '' }; productDialogVisible.value = true }
const saveProduct = async () => {
  const res = productForm.value.id ? await updateProduct(productForm.value.id, productForm.value) : await createProduct(productForm.value)
  if (res.code === 200) { ElMessage.success('保存成功'); productDialogVisible.value = false; loadProducts() } else ElMessage.error(res.message)
}
const delProduct = async (row) => {
  await ElMessageBox.confirm(`删除菜品「${row.name}」？`, '确认')
  const res = await deleteProduct(row.id)
  if (res.code === 200) { ElMessage.success('已删除'); loadProducts() } else ElMessage.error(res.message)
}

// 装修
const saveDeco = async () => {
  const res = await request.put('/admin/decoration', deco.value)
  if (res.code === 200) ElMessage.success('装修保存成功')
}

// 数据加载
const loadCategories = async () => { const res = await getCategories(); if (res.code === 200) categories.value = res.data }
const loadTables = async () => { const res = await getTables(); if (res.code === 200) tables.value = res.data }
const loadProducts = async () => { const res = await getProducts({ pageSize: 100 }); if (res.code === 200) products.value = res.data.list || [] }
const loadOrders = async () => { const res = await getOrders({ pageSize: 50 }); if (res.code === 200) orders.value = res.data.list || [] }
const loadDeco = async () => { const res = await request.get('/admin/decoration'); if (res.code === 200) deco.value = res.data }

const loadData = () => {
  if (activeMenu.value === 'categories') loadCategories()
  else if (activeMenu.value === 'tables') loadTables()
  else if (activeMenu.value === 'products') { loadCategories(); loadProducts() }
  else if (activeMenu.value === 'orders') loadOrders()
  else if (activeMenu.value === 'decoration') loadDeco()
}

watch(activeMenu, () => loadData())
onMounted(() => loadData())
</script>

<style scoped>
.admin-page { height: 100%; display: flex; }
.admin-sidebar { width: 130px; background: #fff; border-right: 1px solid #eee; padding: 12px 0; flex-shrink: 0; }
.menu-item { padding: 12px 20px; font-size: 14px; color: #666; cursor: pointer; border-left: 3px solid transparent; }
.menu-item:hover { color: #409eff; background: #f5f7fa; }
.menu-item.active { color: #409eff; font-weight: bold; border-left-color: #409eff; background: #ecf5ff; }
.admin-content { flex: 1; padding: 20px; overflow-y: auto; }
.admin-content h4 { font-size: 16px; color: #333; margin-bottom: 16px; }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.content-header h4 { margin-bottom: 0; }
</style>
