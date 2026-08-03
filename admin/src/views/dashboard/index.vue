<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background:#409EFF"><el-icon size="28"><List /></el-icon></div>
          <div class="stat-info">
            <p class="stat-value">{{ data.todayOrders }}</p>
            <p class="stat-label">今日订单</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background:#67C23A"><el-icon size="28"><Money /></el-icon></div>
          <div class="stat-info">
            <p class="stat-value">¥{{ data.todayRevenue?.toFixed(2) }}</p>
            <p class="stat-label">今日营收</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background:#E6A23C"><el-icon size="28"><Timer /></el-icon></div>
          <div class="stat-info">
            <p class="stat-value">{{ data.pendingOrders }}</p>
            <p class="stat-label">待处理订单</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background:#F56C6C"><el-icon size="28"><Grid /></el-icon></div>
          <div class="stat-info">
            <p class="stat-value">{{ data.busyTables }} / {{ data.totalTables }}</p>
            <p class="stat-label">使用中桌台</p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top:20px">
      <el-col :span="12">
        <el-card>
          <template #header>快捷操作</template>
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/product/list')">管理菜品</el-button>
            <el-button type="success" @click="$router.push('/order/list')">查看订单</el-button>
            <el-button type="warning" @click="$router.push('/table/list')">桌台管理</el-button>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>系统信息</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="当前服务器IP"><b style="color:#409EFF">{{ data.serverIP }}</b></el-descriptions-item>
            <el-descriptions-item label="菜品总数">{{ data.totalProducts }}</el-descriptions-item>
            <el-descriptions-item label="桌台总数">{{ data.totalTables }}</el-descriptions-item>
            <el-descriptions-item label="系统状态"><el-tag type="success">运行中</el-tag></el-descriptions-item>
          </el-descriptions>
          <el-alert type="warning" :closable="false" style="margin-top:12px" title="更换网络环境(如手机热点/WiFi)后，请到《桌台管理》一键刷新二维码，否则顾客扫码无法打开菜单" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getDashboard } from '../../api'

const data = ref({})

onMounted(async () => {
  const res = await getDashboard()
  if (res.code === 200) data.value = res.data
})
</script>

<style scoped>
.stat-card { display: flex; align-items: center; }
.stat-card :deep(.el-card__body) { display: flex; align-items: center; gap: 16px; width: 100%; }
.stat-icon { width: 56px; height: 56px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; }
.stat-value { font-size: 24px; font-weight: bold; color: #333; }
.stat-label { font-size: 13px; color: #999; margin-top: 4px; }
.quick-actions { display: flex; gap: 12px; flex-wrap: wrap; }
</style>
