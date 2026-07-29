<template>
  <div>
    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>分类管理</span>
          <el-button type="primary" @click="openDialog()">新增分类</el-button>
        </div>
      </template>
      <el-table :data="list" border stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="分类名称" />
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column prop="_count.products" label="菜品数" width="80" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑分类' : '新增分类'" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCategories, addCategory, updateCategory, deleteCategory } from '../../api'

const list = ref([])
const dialogVisible = ref(false)
const form = ref({ name: '', sort: 0, status: 1 })

const loadData = async () => {
  const res = await getCategories()
  if (res.code === 200) list.value = res.data
}

const openDialog = (row) => {
  form.value = row ? { ...row } : { name: '', sort: 0, status: 1 }
  dialogVisible.value = true
}

const handleSave = async () => {
  const res = form.value.id
    ? await updateCategory(form.value.id, form.value)
    : await addCategory(form.value)
  if (res.code === 200) {
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } else {
    ElMessage.error(res.message)
  }
}

const handleDelete = async (id) => {
  await ElMessageBox.confirm('确定删除该分类？', '提示')
  const res = await deleteCategory(id)
  if (res.code === 200) { ElMessage.success('删除成功'); loadData() }
  else ElMessage.error(res.message)
}

onMounted(loadData)
</script>
