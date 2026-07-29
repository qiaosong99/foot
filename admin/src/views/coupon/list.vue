<template>
  <div>
    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>优惠券管理</span>
          <el-button type="primary" @click="openDialog()">新增优惠券</el-button>
        </div>
      </template>
      <el-table :data="list" border stripe>
        <el-table-column prop="name" label="名称" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ row.type === 1 ? '满减券' : '折扣券' }}</template>
        </el-table-column>
        <el-table-column label="面值/折扣" width="100">
          <template #default="{ row }">{{ row.type === 1 ? `¥${row.value}` : `${row.value}折` }}</template>
        </el-table-column>
        <el-table-column prop="minAmount" label="最低消费" width="90">
          <template #default="{ row }">¥{{ row.minAmount }}</template>
        </el-table-column>
        <el-table-column label="领取/总量" width="100">
          <template #default="{ row }">{{ row.used }} / {{ row.total }}</template>
        </el-table-column>
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

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑优惠券' : '新增优惠券'" width="450px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type"><el-radio :value="1">满减券</el-radio><el-radio :value="2">折扣券</el-radio></el-radio-group>
        </el-form-item>
        <el-form-item :label="form.type === 1 ? '减免金额' : '折扣(如8.5)'">
          <el-input-number v-model="form.value" :min="0" :precision="1" />
        </el-form-item>
        <el-form-item label="最低消费"><el-input-number v-model="form.minAmount" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="发放总量"><el-input-number v-model="form.total" :min="1" /></el-form-item>
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
import { getCoupons, addCoupon, updateCoupon, deleteCoupon } from '../../api'

const list = ref([])
const dialogVisible = ref(false)
const form = ref({})

const loadData = async () => {
  const res = await getCoupons()
  if (res.code === 200) list.value = res.data
}

const openDialog = (row) => {
  form.value = row ? { ...row } : { name: '', type: 1, value: 0, minAmount: 0, total: 100, status: 1 }
  dialogVisible.value = true
}

const handleSave = async () => {
  const res = form.value.id ? await updateCoupon(form.value.id, form.value) : await addCoupon(form.value)
  if (res.code === 200) { ElMessage.success('保存成功'); dialogVisible.value = false; loadData() }
  else ElMessage.error(res.message)
}

const handleDelete = async (id) => {
  await ElMessageBox.confirm('确定删除？', '提示')
  const res = await deleteCoupon(id)
  if (res.code === 200) { ElMessage.success('删除成功'); loadData() }
  else ElMessage.error(res.message)
}

onMounted(loadData)
</script>
