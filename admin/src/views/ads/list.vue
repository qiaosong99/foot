<template>
  <div>
    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>广告管理</span>
          <el-button type="primary" @click="openDialog()">新增广告</el-button>
        </div>
      </template>
      <el-table :data="list" border stripe>
        <el-table-column label="图片" width="100">
          <template #default="{ row }">
            <el-image :src="row.image" style="width:70px;height:40px" fit="cover" :preview-src-list="[row.image]" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="url" label="链接" show-overflow-tooltip />
        <el-table-column prop="sort" label="排序" width="70" />
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

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑广告' : '新增广告'" width="450px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="图片">
          <el-upload action="/api/upload/image" name="file" :show-file-list="false" :on-success="onUploadSuccess" :headers="uploadHeaders">
            <el-image v-if="form.image" :src="form.image" style="width:150px;height:80px" fit="cover" />
            <el-icon v-else style="width:150px;height:80px;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:24px"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="链接"><el-input v-model="form.url" placeholder="可选" /></el-form-item>
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
import { getAds, addAd, updateAd, deleteAd } from '../../api'

const list = ref([])
const dialogVisible = ref(false)
const form = ref({})
const uploadHeaders = { Authorization: `Bearer ${localStorage.getItem('token')}` }

const loadData = async () => {
  const res = await getAds()
  if (res.code === 200) list.value = res.data
}

const openDialog = (row) => {
  form.value = row ? { ...row } : { title: '', image: '', url: '', sort: 0, status: 1 }
  dialogVisible.value = true
}

const onUploadSuccess = (res) => {
  if (res.code === 200) form.value.image = res.data.url
}

const handleSave = async () => {
  const res = form.value.id ? await updateAd(form.value.id, form.value) : await addAd(form.value)
  if (res.code === 200) { ElMessage.success('保存成功'); dialogVisible.value = false; loadData() }
  else ElMessage.error(res.message)
}

const handleDelete = async (id) => {
  await ElMessageBox.confirm('确定删除？', '提示')
  const res = await deleteAd(id)
  if (res.code === 200) { ElMessage.success('删除成功'); loadData() }
  else ElMessage.error(res.message)
}

onMounted(loadData)
</script>
