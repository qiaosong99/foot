<template>
  <div class="decoration-page">
    <el-row :gutter="24">
      <!-- 左侧配置区 -->
      <el-col :span="14">
        <el-card>
          <template #header><span>页面装修配置</span></template>
          <el-form :model="form" label-width="100px">
            <el-form-item label="主题色">
              <el-color-picker v-model="form.themeColor" show-alpha />
              <span style="margin-left:12px;color:#999">{{ form.themeColor }}</span>
            </el-form-item>
            <el-form-item label="店铺名称">
              <el-input v-model="form.storeName" style="width:240px" />
            </el-form-item>
            <el-form-item label="店铺Logo">
              <el-upload action="/api/upload/image" name="file" :show-file-list="false" :on-success="(res) => { if(res.code===200) form.storeLogo = res.data.url }" :headers="uploadHeaders">
                <el-image v-if="form.storeLogo" :src="form.storeLogo" style="width:80px;height:80px;border-radius:8px" fit="cover" />
                <el-icon v-else style="width:80px;height:80px;border:1px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px"><Plus /></el-icon>
              </el-upload>
            </el-form-item>
            <el-form-item label="Banner广告图">
              <el-upload action="/api/upload/image" name="file" :show-file-list="false" :on-success="(res) => { if(res.code===200) form.banner = res.data.url }" :headers="uploadHeaders">
                <el-image v-if="form.banner" :src="form.banner" style="width:200px;height:80px;border-radius:8px" fit="cover" />
                <el-icon v-else style="width:200px;height:80px;border:1px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px"><Plus /></el-icon>
              </el-upload>
              <el-button v-if="form.banner" size="small" type="danger" style="margin-left:12px" @click="form.banner = ''">移除</el-button>
            </el-form-item>
            <el-form-item label="显示Banner">
              <el-switch v-model="form.showBanner" />
            </el-form-item>
            <el-form-item label="公告内容">
              <el-input v-model="form.notice" type="textarea" :rows="2" style="width:360px" />
            </el-form-item>
            <el-form-item label="显示公告">
              <el-switch v-model="form.showNotice" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSave" :loading="saving">保存配置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧预览区 -->
      <el-col :span="10">
        <el-card>
          <template #header><span>手机端预览</span></template>
          <div class="phone-preview">
            <div class="phone-frame">
              <!-- 模拟店铺头部 -->
              <div class="pv-header" :style="{ '--theme': form.themeColor }">
                <div class="pv-logo" :style="{ background: form.themeColor }">{{ (form.storeName || '餐')[0] }}</div>
                <div class="pv-store">
                  <p class="pv-name">{{ form.storeName || '店铺名称' }}</p>
                  <p class="pv-table">桌号: A01</p>
                </div>
              </div>
              <!-- 公告 -->
              <div class="pv-notice" v-if="form.showNotice && form.notice">📢 {{ form.notice }}</div>
              <!-- Banner -->
              <div class="pv-banner" v-if="form.showBanner && form.banner">
                <img :src="form.banner" />
              </div>
              <!-- 模拟商品区 -->
              <div class="pv-body">
                <div class="pv-sidebar">
                  <div class="pv-cate active" :style="{ color: form.themeColor, borderLeftColor: form.themeColor }">热菜</div>
                  <div class="pv-cate">凉菜</div>
                  <div class="pv-cate">汤类</div>
                  <div class="pv-cate">主食</div>
                </div>
                <div class="pv-products">
                  <div class="pv-product" v-for="i in 3" :key="i">
                    <div class="pv-p-img"></div>
                    <div class="pv-p-info">
                      <p>示例菜品 {{ i }}</p>
                      <span :style="{ color: form.themeColor }">¥38</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 模拟购物车栏 -->
              <div class="pv-cart" :style="{ '--theme': form.themeColor }">
                <div class="pv-cart-icon" :style="{ background: form.themeColor }">🛒</div>
                <span>¥0.00</span>
                <div class="pv-cart-btn" :style="{ background: form.themeColor }">去结算</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDecoration, saveDecoration } from '../../api'

const form = ref({ themeColor: '#DA5650', storeName: '美味餐厅', storeLogo: '', banner: '', notice: '欢迎光临，祝您用餐愉快！', showBanner: true, showNotice: true })
const saving = ref(false)
const uploadHeaders = { Authorization: `Bearer ${localStorage.getItem('token')}` }

onMounted(async () => {
  const res = await getDecoration()
  if (res.code === 200) form.value = res.data
})

const handleSave = async () => {
  saving.value = true
  try {
    const res = await saveDecoration(form.value)
    if (res.code === 200) ElMessage.success('保存成功')
    else ElMessage.error(res.message)
  } finally { saving.value = false }
}
</script>

<style scoped>
.phone-preview { display: flex; justify-content: center; }
.phone-frame { width: 300px; height: 560px; border: 8px solid #333; border-radius: 32px; overflow: hidden; display: flex; flex-direction: column; background: #f5f5f5; position: relative; }
.pv-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #fff; }
.pv-logo { width: 32px; height: 32px; border-radius: 6px; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; }
.pv-name { font-size: 13px; font-weight: bold; color: #333; }
.pv-table { font-size: 10px; color: #999; }
.pv-notice { font-size: 10px; padding: 4px 12px; background: #fffdf0; color: #e6a23c; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.pv-banner img { width: 100%; height: 60px; object-fit: cover; }
.pv-body { flex: 1; display: flex; overflow: hidden; }
.pv-sidebar { width: 52px; background: #f7f8fa; }
.pv-cate { padding: 10px 4px; text-align: center; font-size: 10px; color: #666; border-left: 2px solid transparent; }
.pv-cate.active { background: #fff; font-weight: bold; }
.pv-products { flex: 1; padding: 8px; background: #fff; }
.pv-product { display: flex; gap: 8px; margin-bottom: 10px; }
.pv-p-img { width: 44px; height: 44px; background: #eee; border-radius: 6px; }
.pv-p-info { font-size: 11px; color: #333; }
.pv-p-info span { font-size: 12px; font-weight: bold; }
.pv-cart { position: absolute; bottom: 10px; left: 10px; right: 10px; height: 36px; background: #2d2d2d; border-radius: 18px; display: flex; align-items: center; padding: 0 4px; color: #fff; font-size: 12px; }
.pv-cart-icon { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: -8px; margin-left: 4px; font-size: 16px; }
.pv-cart span { flex: 1; padding-left: 8px; font-weight: bold; }
.pv-cart-btn { padding: 6px 14px; border-radius: 14px; color: #fff; font-size: 11px; }
</style>
