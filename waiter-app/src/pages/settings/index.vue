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
      <button class="diag-btn" @click="diagnose">网络诊断</button>
      <text class="test-result" v-if="testResult">{{ testResult }}</text>
      <view v-if="diagLines.length" class="diag-box">
        <text class="diag-line" v-for="(line, i) in diagLines" :key="i">{{ line }}</text>
      </view>
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

// 清理地址：去空格、全角字符转半角、去末尾斜杠
const cleanUrl = (url) => {
  return (url || '')
    .replace(/：/g, ':').replace(/／/g, '/').replace(/\s/g, '')
    .replace(/\/+$/, '')
}

const save = () => {
  const cleaned = cleanUrl(serverUrl.value)
  if (!/^https?:\/\/.+/.test(cleaned)) {
    uni.showToast({ title: '地址格式应为 http://IP:3000', icon: 'none' })
    return
  }
  serverUrl.value = cleaned
  uni.setStorageSync(BASE_URL_KEY, cleaned)
  uni.showToast({ title: '已保存: ' + cleaned, icon: 'none' })
}

const testConnection = async () => {
  // 先用当前输入框的地址保存，确保测试的就是用户看到的地址
  const cleaned = cleanUrl(serverUrl.value)
  if (!cleaned) {
    testResult.value = '请先填写服务器地址'
    return
  }
  serverUrl.value = cleaned
  uni.setStorageSync(BASE_URL_KEY, cleaned)
  testResult.value = '正在连接 ' + cleaned + ' ...'
  try {
    const res = await getTables()
    if (res.code === 200) {
      testResult.value = `连接成功！共 ${res.data.length} 张桌台`
    } else {
      testResult.value = '连接失败: ' + (res.message || '未知错误')
    }
  } catch (e) {
    console.error('[testConnection]', e)
    testResult.value = '连接失败: ' + (e.errMsg || '请确认手机与电脑同一WiFi，且已关闭移动数据')
  }
}

onMounted(() => {
  serverUrl.value = uni.getStorageSync(BASE_URL_KEY) || ''
})

// ============ 网络诊断 ============
const diagLines = ref([])
const diag = (msg) => { diagLines.value.push(msg) }

const parseUrl = (url) => {
  const m = /^https?:\/\/([^:/]+):?(\d+)?/.exec(url)
  if (!m) return null
  return { host: m[1], port: m[2] ? parseInt(m[2]) : 80 }
}

// HTTP 探测，返回详细结果
const httpProbe = (url, timeout = 8000) => {
  const start = Date.now()
  return new Promise((resolve) => {
    uni.request({
      url,
      timeout,
      success: (res) => resolve({ ok: true, status: res.statusCode, ms: Date.now() - start }),
      fail: (err) => resolve({ ok: false, err: err.errMsg || JSON.stringify(err), ms: Date.now() - start })
    })
  })
}

const diagnose = async () => {
  diagLines.value = []
  const cleaned = cleanUrl(serverUrl.value)
  if (!cleaned) { diag('请先填写服务器地址'); return }
  const u = parseUrl(cleaned)
  if (!u) { diag('地址格式错误'); return }

  // ① 网络类型
  try {
    const nt = await new Promise((res) => uni.getNetworkType({ success: res, fail: () => res({ networkType: 'unknown' }) }))
    diag('① 网络类型: ' + nt.networkType)
  } catch (e) { diag('① 网络类型检测失败') }

  // ② 局域网探测（目标服务器）
  diag('② 探测局域网 ' + cleaned + ' ...')
  const lan = await httpProbe(cleaned + '/api/waiter/tables')
  if (lan.ok) {
    diag('   ✔ HTTP成功 状态码:' + lan.status + ' 耗时' + lan.ms + 'ms → 连接正常！')
    diag('→ 请直接点“测试连接”使用')
  } else {
    diag('   ✘ 失败(' + lan.ms + 'ms): ' + lan.err)
  }

  // ③ 外网对照（判断App本身能否联网）
  diag('③ 对照探测外网 http://www.baidu.com ...')
  const net = await httpProbe('http://www.baidu.com')
  if (net.ok) {
    diag('   ✔ 外网可达 状态码:' + net.status + ' 耗时' + net.ms + 'ms')
  } else {
    diag('   ✘ 外网也失败(' + net.ms + 'ms): ' + net.err)
  }

  // ④ 结论
  diag('—— 结论 ——')
  if (lan.ok) {
    diag('服务器连接正常，可直接使用')
  } else if (net.ok) {
    diag('App能上外网但连不上局域网服务器。')
    diag('请确认: 1)电脑端程序已打开 2)地址IP与电脑当前IP一致 3)手机与电脑同一网络。')
    diag('若用“手机开热点+电脑连热点”方式仍失败，建议改用路由器WiFi或“电脑开热点+手机连电脑热点”')
  } else {
    diag('App外网和局域网都不通，但浏览器能上网：')
    diag('系统对App联网有限制。请: 卸载重装App，首次打开时允许联网；或在手机安全中心/手机管家里放行该App')
  }
}
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
.diag-btn { background: #e6a23c; color: #fff; border: none; border-radius: 44rpx; font-size: 30rpx; margin-top: 16rpx; }
.test-result { display: block; margin-top: 20rpx; font-size: 26rpx; color: #666; }
.diag-box { margin-top: 20rpx; background: #f7f8fa; border-radius: 8rpx; padding: 16rpx; }
.diag-line { display: block; font-size: 24rpx; color: #333; line-height: 1.8; }
.about { display: block; font-size: 26rpx; color: #999; line-height: 1.8; }
</style>
