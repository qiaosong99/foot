<template>
  <div>
    <el-card>
      <template #header><span>系统设置</span></template>
      <el-form :model="form" label-width="100px" style="max-width:500px">
        <el-form-item label="餐厅名称"><el-input v-model="form.restaurant_name" /></el-form-item>
        <el-form-item label="公告"><el-input v-model="form.announcement" type="textarea" :rows="3" /></el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave" :loading="saving">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSettings, updateSettings } from '../../api'

const form = ref({ restaurant_name: '', announcement: '' })
const saving = ref(false)

onMounted(async () => {
  const res = await getSettings()
  if (res.code === 200) form.value = res.data
})

const handleSave = async () => {
  saving.value = true
  try {
    const res = await updateSettings(form.value)
    if (res.code === 200) ElMessage.success('保存成功')
    else ElMessage.error(res.message)
  } finally {
    saving.value = false
  }
}
</script>
