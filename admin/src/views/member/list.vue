<template>
  <div>
    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>会员管理</span>
          <el-button type="primary" @click="openDialog()">新增会员</el-button>
        </div>
      </template>
      <div style="margin-bottom:16px;display:flex;gap:12px">
        <el-input v-model="keyword" placeholder="搜索昵称/手机号" clearable style="width:200px" @clear="loadData" @keyup.enter="loadData" />
        <el-button @click="loadData">搜索</el-button>
      </div>
      <el-table :data="list" border stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="balance" label="余额" width="90">
          <template #default="{ row }">¥{{ row.balance?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="points" label="积分" width="80" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? '正常' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:16px;justify-content:flex-end" v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" @current-change="loadData" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑会员' : '新增会员'" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="余额"><el-input-number v-model="form.balance" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="积分"><el-input-number v-model="form.points" :min="0" /></el-form-item>
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
import { getMembers, addMember, updateMember, deleteMember } from '../../api'

const list = ref([])
const total = ref(0)
const page = ref(1)
const keyword = ref('')
const dialogVisible = ref(false)
const form = ref({})

const loadData = async () => {
  const res = await getMembers({ keyword: keyword.value, page: page.value })
  if (res.code === 200) { list.value = res.data.list; total.value = res.data.total }
}

const openDialog = (row) => {
  form.value = row ? { ...row } : { nickname: '', phone: '', balance: 0, points: 0, status: 1 }
  dialogVisible.value = true
}

const handleSave = async () => {
  const res = form.value.id ? await updateMember(form.value.id, form.value) : await addMember(form.value)
  if (res.code === 200) { ElMessage.success('保存成功'); dialogVisible.value = false; loadData() }
  else ElMessage.error(res.message)
}

const handleDelete = async (id) => {
  await ElMessageBox.confirm('确定删除该会员？', '提示')
  const res = await deleteMember(id)
  if (res.code === 200) { ElMessage.success('删除成功'); loadData() }
  else ElMessage.error(res.message)
}

onMounted(loadData)
</script>
