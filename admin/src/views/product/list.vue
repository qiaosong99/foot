<template>
  <div>
    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>菜品管理</span>
          <el-button type="primary" @click="openDialog()">新增菜品</el-button>
        </div>
      </template>
      <div style="margin-bottom:16px;display:flex;gap:12px">
        <el-select v-model="query.categoryId" placeholder="选择分类" clearable style="width:150px" @change="loadData">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-input v-model="query.keyword" placeholder="搜索菜品名" clearable style="width:200px" @clear="loadData" @keyup.enter="loadData" />
        <el-button @click="loadData">搜索</el-button>
      </div>
      <el-table :data="list" border stripe>
        <el-table-column label="图片" width="80">
          <template #default="{ row }">
            <el-image v-if="row.image" :src="row.image" style="width:50px;height:50px" fit="cover" />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="菜品名称" />
        <el-table-column prop="category.name" label="分类" width="100" />
        <el-table-column prop="price" label="价格" width="80">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="60" />
        <el-table-column prop="sales" label="销量" width="70" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '上架' : '下架' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:16px;justify-content:flex-end" v-model:current-page="query.page" :page-size="20" :total="total" layout="total, prev, pager, next" @current-change="loadData" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑菜品' : '新增菜品'" width="600px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.categoryId" style="width:100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格"><el-input-number v-model="form.price" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="单位"><el-input v-model="form.unit" style="width:100px" /></el-form-item>
        <el-form-item label="图片">
          <el-upload action="/api/upload/image" name="file" :show-file-list="false" :on-success="onUploadSuccess" :headers="uploadHeaders">
            <el-image v-if="form.image" :src="form.image" style="width:100px;height:100px" fit="cover" />
            <el-icon v-else style="width:100px;height:100px;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:24px"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="上架"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" /></el-form-item>
        <el-form-item label="规格">
          <div v-for="(spec, idx) in form.specs" :key="idx" style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
            <el-input v-model="spec.name" placeholder="规格名" style="width:100px" />
            <el-input v-model="spec.valuesStr" placeholder="值,逗号分隔" style="width:200px" />
            <el-button type="danger" size="small" @click="form.specs.splice(idx,1)">删除</el-button>
          </div>
          <el-button size="small" @click="form.specs.push({name:'',valuesStr:''})">添加规格</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProducts, addProduct, updateProduct, deleteProduct, getCategories } from '../../api'

const list = ref([])
const categories = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const query = reactive({ categoryId: '', keyword: '', page: 1 })
const form = ref({})
const uploadHeaders = { Authorization: `Bearer ${localStorage.getItem('token')}` }

const loadData = async () => {
  const res = await getProducts(query)
  if (res.code === 200) { list.value = res.data.list; total.value = res.data.total }
}

const loadCategories = async () => {
  const res = await getCategories()
  if (res.code === 200) categories.value = res.data
}

const openDialog = (row) => {
  if (row) {
    form.value = { ...row, specs: (row.specs || []).map(s => ({ name: s.name, valuesStr: JSON.parse(s.values).join(',') })) }
  } else {
    form.value = { name: '', categoryId: '', price: 0, unit: '份', image: '', description: '', sort: 0, status: 1, specs: [] }
  }
  dialogVisible.value = true
}

const onUploadSuccess = (res) => {
  if (res.code === 200) form.value.image = res.data.url
}

const handleSave = async () => {
  const data = { ...form.value, specs: form.value.specs.filter(s => s.name).map(s => ({ name: s.name, values: s.valuesStr.split(',').map(v => v.trim()) })) }
  const res = form.value.id ? await updateProduct(form.value.id, data) : await addProduct(data)
  if (res.code === 200) { ElMessage.success('保存成功'); dialogVisible.value = false; loadData() }
  else ElMessage.error(res.message)
}

const handleDelete = async (id) => {
  await ElMessageBox.confirm('确定删除该菜品？', '提示')
  const res = await deleteProduct(id)
  if (res.code === 200) { ElMessage.success('删除成功'); loadData() }
  else ElMessage.error(res.message)
}

onMounted(() => { loadData(); loadCategories() })
</script>
