<template>
  <view class="page">
    <view class="section">
      <text class="section-title">服务器设置</text>
      <view class="form-item">
        <text class="label">服务器地址</text>
        <input class="input" v-model="serverUrl" placeholder="http://192.168.0.100:3000" />
      </view>
      <button class="save-btn" @click="save">保存</button>
    </view>

    <view class="section">
      <text class="section-title">连接测试</text>
      <button class="test-btn" @click="testConnection">测试连接</button>
      <text class="test-result" v-if="testResult">{{ testResult }}</text>
    </view>

    <view class="section">
      <text class="section-title">关于</text>
      <text class="about">服务员点餐端 v1.0.0</text>
      <text class="about">用于服务员代客点单、退菜、查看桌台点单情况</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { BASE_URL_KEY, getTables } from '../../api'

const serverUrl = ref('')
const testResult = ref('')

const save = () => {
  uni.setStorageSync(BASE_URL_KEY, serverUrl.value)
  uni.showToast({ title: '已保存', icon: 'success' })
}

const testConnection = async () => {
  testResult.value = '连接中...'
  try {
    const res = await getTables()
    if (res.code === 200) {
      testResult.value = `连接成功！共 ${res.data.length} 张桌台`
    } else {
      testResult.value = '连接失败: ' + (res.message || '未知错误')
    }
  } catch (e) {
    testResult.value = '连接失败，请检查地址和网络'
  }
}

onMounted(() => {
  serverUrl.value = uni.getStorageSync(BASE_URL_KEY) || ''
})
</script>

<style scoped>
.page { padding: 30rpx; }
.section { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 24rpx; }
.section-title { display: block; font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; }
.form-item { margin-bottom: 20rpx; }
.label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.input { border: 1rpx solid #ddd; border-radius: 8rpx; padding: 18rpx 20rpx; font-size: 28rpx; }
.save-btn { background: #409eff; color: #fff; border: none; border-radius: 44rpx; font-size: 30rpx; margin-top: 20rpx; }
.test-btn { background: #67c23a; color: #fff; border: none; border-radius: 44rpx; font-size: 30rpx; }
.test-result { display: block; margin-top: 20rpx; font-size: 26rpx; color: #666; }
.about { display: block; font-size: 26rpx; color: #999; line-height: 1.8; }
</style>
