<template>
  <div>
    <el-card>
      <template #header><span>订单管理</span></template>
      <div style="margin-bottom:16px;display:flex;gap:12px">
        <el-select v-model="query.status" placeholder="订单状态" clearable style="width:130px" @change="loadData">
          <el-option label="待制作" :value="0" /><el-option label="制作中" :value="1" />
          <el-option label="已上菜" :value="2" /><el-option label="已完成" :value="3" /><el-option label="已取消" :value="4" />
        </el-select>
        <el-input v-model="query.tableNo" placeholder="桌号" clearable style="width:120px" @clear="loadData" @keyup.enter="loadData" />
        <el-button @click="loadData">搜索</el-button>
      </div>
      <el-table :data="list" border stripe>
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="table.tableNo" label="桌号" width="70" />
        <el-table-column prop="itemCount" label="菜品数" width="70" />
        <el-table-column prop="totalPrice" label="金额" width="80">
          <template #default="{ row }">¥{{ row.totalPrice }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="下单时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:16px;justify-content:flex-end" v-model:current-page="query.page" :page-size="20" :total="total" layout="total, prev, pager, next" @current-change="loadData" />
    </el-card>

    <el-dialog v-model="detailVisible" title="订单详情" width="500px">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="订单号">{{ detail.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="桌号">{{ detail.table?.tableNo }}</el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="statusType(detail.status)">{{ statusText(detail.status) }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ detail.totalPrice }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.remark || '无' }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="detail.items" border size="small" style="margin-top:16px">
        <el-table-column prop="name" label="菜品" />
        <el-table-column prop="specInfo" label="规格" width="100" />
        <el-table-column prop="quantity" label="数量" width="60" />
        <el-table-column prop="price" label="单价" width="70">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 1 ? 'success' : 'warning'">{{ row.status === 1 ? '已上菜' : '待制作' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getOrders } from '../../api'

const list = ref([])
const total = ref(0)
const detailVisible = ref(false)
const detail = ref({})
const query = reactive({ status: '', tableNo: '', page: 1 })

const statusText = (s) => ['待制作','制作中','已上菜','已完成','已取消'][s] || '未知'
const statusType = (s) => ['warning','primary','success','info','danger'][s] || 'info'

const loadData = async () => {
  const res = await getOrders(query)
  if (res.code === 200) { list.value = res.data.list; total.value = res.data.total }
}

const showDetail = (row) => { detail.value = row; detailVisible.value = true }

onMounted(loadData)
</script>
