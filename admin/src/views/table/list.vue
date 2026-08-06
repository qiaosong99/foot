<template>
  <div>
    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>桌台管理</span>
          <div>
            <el-button type="success" @click="handleRefreshAll">一键刷新全部二维码</el-button>
            <el-button type="primary" @click="openDialog()">新增桌台</el-button>
          </div>
        </div>
      </template>
      <el-table :data="list" border stripe>
        <el-table-column prop="tableNo" label="桌号" width="100" />
        <el-table-column prop="area" label="区域" width="100" />
        <el-table-column prop="seats" label="座位数" width="80" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'success' : 'warning'">{{ row.status === 0 ? '空闲' : '使用中' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="_count.orders" label="历史订单" width="90" />
        <el-table-column label="二维码" width="100">
          <template #default="{ row }">
            <el-image v-if="row.qrCodeUrl" :src="row.qrCodeUrl" style="width:40px;height:40px" :preview-src-list="[row.qrCodeUrl]" />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="success" @click="genQrcode(row)">生成二维码</el-button>
            <el-button v-if="row.status !== 0" size="small" type="warning" @click="handleForceRelease(row)">强制释放</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑桌台' : '新增桌台'" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="桌号"><el-input v-model="form.tableNo" placeholder="如 A01" /></el-form-item>
        <el-form-item label="区域"><el-input v-model="form.area" placeholder="如 大厅、包间" /></el-form-item>
        <el-form-item label="座位数"><el-input-number v-model="form.seats" :min="1" :max="20" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="qrVisible" title="桌台二维码" width="360px">
      <div style="text-align:center">
        <el-image :src="qrData.qrCodeUrl" style="width:200px;height:200px" />
        <p style="margin-top:12px;color:#666">扫码地址: {{ qrData.url }}</p>
        <el-button type="primary" style="margin-top:12px" @click="downloadQr">下载二维码</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTables, addTable, updateTable, deleteTable, forceReleaseTable, getTableQrcode, refreshAllQrcodes } from '../../api'

const list = ref([])
const dialogVisible = ref(false)
const qrVisible = ref(false)
const form = ref({ tableNo: '', area: '', seats: 4 })
const qrData = ref({})

const loadData = async () => {
  const res = await getTables()
  if (res.code === 200) list.value = res.data
}

const handleRefreshAll = async () => {
  await ElMessageBox.confirm('更换网络环境(如热点/WiFi)后需刷新二维码，是否用当前服务器IP重新生成全部桌台二维码？', '提示')
  const res = await refreshAllQrcodes()
  if (res.code === 200) {
    ElMessage.success(res.message)
    loadData()
  } else {
    ElMessage.error(res.message)
  }
}

const openDialog = (row) => {
  form.value = row ? { ...row } : { tableNo: '', area: '', seats: 4 }
  dialogVisible.value = true
}

const handleSave = async () => {
  const res = form.value.id ? await updateTable(form.value.id, form.value) : await addTable(form.value)
  if (res.code === 200) { ElMessage.success('保存成功'); dialogVisible.value = false; loadData() }
  else ElMessage.error(res.message)
}

const handleDelete = async (id) => {
  await ElMessageBox.confirm('确定删除该桌台？', '提示')
  const res = await deleteTable(id)
  if (res.code === 200) { ElMessage.success('删除成功'); loadData() }
  else ElMessage.error(res.message)
}

const handleForceRelease = async (row) => {
  await ElMessageBox.confirm(`强制释放「${row.tableNo}」桌？\n该桌所有未结算订单将被取消，桌台置为空闲（适用于0元订单无法结算的场景）`, '强制释放', { type: 'warning' })
  const res = await forceReleaseTable(row.id)
  if (res.code === 200) { ElMessage.success(res.message); loadData() }
  else ElMessage.error(res.message)
}

const genQrcode = async (row) => {
  const res = await getTableQrcode(row.id)
  if (res.code === 200) { qrData.value = res.data; qrVisible.value = true; loadData() }
  else ElMessage.error(res.message)
}

const downloadQr = () => {
  const a = document.createElement('a')
  a.href = qrData.value.qrCodeUrl
  a.download = `table_${qrData.value.url?.split('table=')[1] || ''}.png`
  a.click()
}

onMounted(loadData)
</script>
