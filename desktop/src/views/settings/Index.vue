<template>
  <div class="settings-page">
    <el-tabs v-model="activeTab">
      <!-- 打印机设置 -->
      <el-tab-pane label="打印机设置" name="printer">
        <div style="margin-bottom: 16px;">
          <el-button type="success" :loading="scanning" @click="scanPrinters">
            {{ scanning ? '扫描中...' : '搜索局域网打印机' }}
          </el-button>
          <span v-if="scanResult" style="margin-left: 12px; font-size: 13px; color: #666;">{{ scanResult }}</span>
        </div>
        <!-- 发现的打印机 -->
        <div v-if="foundPrinters.length > 0" style="margin-bottom: 20px;">
          <h5 style="margin-bottom: 8px;">发现的打印机（点击选择）</h5>
          <el-tag v-for="ip in foundPrinters" :key="ip" style="margin-right: 8px; cursor: pointer;" @click="selectPrinter(ip)">{{ ip }}:9100</el-tag>
        </div>
        <el-divider />
        <el-form :model="printerForm" label-width="100px" style="max-width: 500px;">
          <el-form-item label="打印机名称">
            <el-input v-model="printerForm.name" placeholder="默认打印机" />
          </el-form-item>
          <el-form-item label="打印方式">
            <el-radio-group v-model="printerForm.printMode">
              <el-radio label="system">系统打印机（USB/共享）</el-radio>
              <el-radio label="network">网络打印机（IP:9100）</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="printerForm.printMode === 'system'" label="选择打印机">
            <el-select v-model="printerForm.deviceName" placeholder="选择已安装的打印机" style="width: 280px;" :loading="loadingPrinters">
              <el-option v-for="p in systemPrinters" :key="p.name" :label="p.name + (p.isDefault ? '（默认）' : '')" :value="p.name" />
            </el-select>
            <el-button size="small" style="margin-left: 8px;" @click="loadSystemPrinters">刷新</el-button>
          </el-form-item>
          <template v-else>
            <el-form-item label="IP地址">
              <el-input v-model="printerForm.ip" placeholder="192.168.0.100" />
            </el-form-item>
            <el-form-item label="端口">
              <el-input-number v-model="printerForm.port" :min="1" :max="65535" />
            </el-form-item>
          </template>
          <el-form-item label="纸宽">
            <el-radio-group v-model="printerForm.paperWidth">
              <el-radio :label="58">58mm</el-radio>
              <el-radio :label="80">80mm</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="savePrinter">保存配置</el-button>
            <el-button v-if="printerForm.printMode === 'network'" type="info" @click="handleTestConnection">测试连接</el-button>
            <el-button type="success" @click="handleTestPrint">测试打印（按模板出纸）</el-button>
          </el-form-item>
          <el-form-item v-if="connResult">
            <el-alert :type="connSuccess ? 'success' : 'error'" :title="connResult" :closable="false" style="width:100%" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 小票模板 -->
      <el-tab-pane label="小票模板" name="template">
        <div class="template-layout">
          <el-form :model="templateForm" label-width="100px" style="max-width: 500px;">
            <el-form-item label="店铺名称">
              <el-input v-model="templateForm.storeName" />
            </el-form-item>
            <el-form-item label="电话">
              <el-input v-model="templateForm.storePhone" />
            </el-form-item>
            <el-form-item label="地址">
              <el-input v-model="templateForm.storeAddr" />
            </el-form-item>
            <el-form-item label="头部文字">
              <el-input v-model="templateForm.headerText" placeholder="欢迎光临" />
            </el-form-item>
            <el-form-item label="底部文字">
              <el-input v-model="templateForm.footerText" placeholder="谢谢惠顾，欢迎下次光临！" />
            </el-form-item>
            <el-form-item label="纸宽">
              <el-radio-group v-model="templateForm.paperWidth">
                <el-radio :label="58">58mm</el-radio>
                <el-radio :label="80">80mm</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveTemplate">保存模板</el-button>
            </el-form-item>
          </el-form>

          <!-- 小票预览 -->
          <div class="receipt-preview">
            <div class="receipt-paper" :style="{ width: templateForm.paperWidth === 80 ? '300px' : '220px' }">
              <div class="rp-store">{{ templateForm.storeName || '店铺名称' }}</div>
              <div class="rp-info" v-if="templateForm.storePhone">电话: {{ templateForm.storePhone }}</div>
              <div class="rp-info" v-if="templateForm.storeAddr">{{ templateForm.storeAddr }}</div>
              <div class="rp-info" v-if="templateForm.headerText">{{ templateForm.headerText }}</div>
              <div class="rp-line"></div>
              <div class="rp-info">单号: 20260730120001</div>
              <div class="rp-info">桌号: A01  类型: 堂食</div>
              <div class="rp-info">时间: 2026-07-30 12:00:00</div>
              <div class="rp-line"></div>
              <div class="rp-bold">菜名      数量  小计</div>
              <div class="rp-item">宫保鸡丁(微辣) x1 ¥38.00</div>
              <div class="rp-item">米饭 x2 ¥6.00</div>
              <div class="rp-line"></div>
              <div class="rp-bold rp-right">共3件 合计: ¥44.00</div>
              <div class="rp-line"></div>
              <div class="rp-center" v-if="templateForm.footerText">{{ templateForm.footerText }}</div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 服务器设置 -->
      <el-tab-pane label="服务器" name="server">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
          <template #title>
            手机配置服务器地址请填写：<b>http://局域网IP:3000</b>（手机需与本机在同一局域网/WiFi）
          </template>
        </el-alert>
        <div class="lan-ip-box">
          <div class="lan-ip-title">当前本机局域网IP <el-button size="small" text type="primary" @click="loadLanIps">刷新</el-button></div>
          <div v-if="lanIps.length === 0" style="color:#999;font-size:13px;">未检测到局域网IP，请检查网络连接</div>
          <div v-for="item in lanIps" :key="item.address" class="lan-ip-row">
            <el-tag type="success" size="large">http://{{ item.address }}:3000</el-tag>
            <el-tag v-if="item.recommended" type="warning" size="small">推荐</el-tag>
            <span class="lan-ip-nic">{{ item.name }}（{{ item.subnet }}.x）</span>
            <el-button size="small" type="primary" @click="copyText('http://' + item.address + ':3000')">复制地址</el-button>
          </div>
          <div v-if="lanIps.length > 1" class="lan-ip-tip">
            检测到多个IP（多网卡/热点）：手机连哪个WiFi，就选与手机IP前三段一致的那个地址（手机WiFi详情可查看IP）。优先选标“推荐”的。
          </div>
        </div>
        <el-divider />
        <el-form label-width="100px" style="max-width: 500px;">
          <el-form-item label="服务地址">
            <el-input v-model="serverUrl" placeholder="http://localhost:3000" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveServerUrl">保存</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getPrinterConfig, savePrinterConfig, getReceiptTemplate, saveReceiptTemplate, saveSettings } from '../../api'
import request from '../../api'
import { getSocket } from '../../api/socket'

const activeTab = ref('printer')
const serverUrl = ref(localStorage.getItem('server_url') || 'http://localhost:3000')

const printerForm = ref({ name: '默认打印机', printMode: 'system', deviceName: '', ip: '', port: 9100, paperWidth: 58 })
const templateForm = ref({ storeName: '', storePhone: '', storeAddr: '', headerText: '', footerText: '', paperWidth: 58 })

// 系统打印机列表
const systemPrinters = ref([])
const loadingPrinters = ref(false)
const loadSystemPrinters = async () => {
  if (!window.electronAPI?.getPrinters) return
  loadingPrinters.value = true
  const res = await window.electronAPI.getPrinters()
  loadingPrinters.value = false
  if (res.success) {
    systemPrinters.value = (res.data || []).map(p => ({ name: p.name || p.printerName, isDefault: p.isDefault }))
  }
}

// 测试打印用示例订单（验证模板真实效果）
const buildSampleOrder = () => ({
  orderNo: 'TEST' + Date.now().toString().slice(-8),
  tableNo: 'A01',
  orderType: 'dine_in',
  createdAt: new Date().toISOString(),
  items: [
    { name: '宫保鸡丁', specInfo: '微辣', quantity: 1, price: 38, subtotal: 38 },
    { name: '米饭', specInfo: '', quantity: 2, price: 3, subtotal: 6 }
  ],
  totalPrice: 44,
  itemCount: 3
})

// 打印机扫描
const scanning = ref(false)
const scanResult = ref('')
const foundPrinters = ref([])

const scanPrinters = async () => {
  scanning.value = true
  scanResult.value = ''
  foundPrinters.value = []
  try {
    const res = await request.post('/admin/printer/scan', {})
    if (res.code === 200) {
      foundPrinters.value = res.data
      scanResult.value = res.message
    }
  } catch (e) {
    scanResult.value = '扫描失败'
  }
  scanning.value = false
}

const selectPrinter = async (ip) => {
  printerForm.value.ip = ip
  printerForm.value.port = 9100
  // 自动保存
  const res = await savePrinterConfig(printerForm.value)
  if (res.code === 200) {
    localStorage.setItem('printer_config', JSON.stringify(printerForm.value))
    ElMessage.success(`已选择并保存打印机 ${ip}`)
  }
}

const savePrinter = async () => {
  const res = await savePrinterConfig(printerForm.value)
  if (res.code === 200) {
    ElMessage.success('保存成功')
    localStorage.setItem('printer_config', JSON.stringify(printerForm.value))
  }
}

const handleTestPrint = async () => {
  if (printerForm.value.printMode === 'system') {
    if (!printerForm.value.deviceName) { ElMessage.warning('请先选择系统打印机'); return }
  } else if (!printerForm.value.ip) {
    ElMessage.warning('请先填写打印机IP'); return
  }
  if (window.electronAPI) {
    // 先保存配置，确保与收银/外卖正式打印使用完全一致的配置
    await savePrinter()
    const printer = JSON.parse(localStorage.getItem('printer_config') || '{}')
    const template = JSON.parse(localStorage.getItem('receipt_template') || '{}')
    // 用当前小票模板+示例订单走与正式打印完全相同的链路
    const result = await window.electronAPI.testPrint({
      printer,
      template: Object.keys(template).length > 0 ? template : templateForm.value,
      order: buildSampleOrder()
    })
    if (result.success) {
      ElMessage.success('测试小票已发送' + (result.message ? '，' + result.message : '') + '，请查看出纸')
      connResult.value = '测试打印成功: ' + result.message
      connSuccess.value = true
    } else {
      ElMessage.error('测试打印失败: ' + result.message)
      connResult.value = result.message
      connSuccess.value = false
    }
  } else {
    ElMessage.info('请在桌面端运行以使用打印功能')
  }
}

// 连接测试诊断（连接成功后自动打印测试页）
const connResult = ref('')
const connSuccess = ref(false)
const handleTestConnection = async () => {
  if (!printerForm.value.ip) { ElMessage.warning('请先填写打印机IP'); return }
  connResult.value = '连接中...'
  connSuccess.value = false
  if (window.electronAPI) {
    const result = await window.electronAPI.testConnection({ ip: printerForm.value.ip, port: printerForm.value.port })
    connResult.value = result.message
    connSuccess.value = result.success
    // 连接成功自动打印测试页
    if (result.success) {
      await handleTestPrint()
    }
  } else {
    connResult.value = '请在桌面端运行以使用连接测试'
    connSuccess.value = false
  }
}

const saveTemplate = async () => {
  const res = await saveReceiptTemplate(templateForm.value)
  if (res.code === 200) {
    ElMessage.success('模板保存成功')
    localStorage.setItem('receipt_template', JSON.stringify(templateForm.value))
  }
}

const saveServerUrl = async () => {
  // 清理地址：去空格、去末尾斜杠、补全协议头
  let url = (serverUrl.value || '').trim().replace(/\/+$/, '')
  if (url && !/^https?:\/\//.test(url)) url = 'http://' + url
  if (!url) {
    ElMessage.warning('请填写服务地址')
    return
  }
  serverUrl.value = url
  localStorage.setItem('server_url', url)
  // 文件持久化双保险（防止 localStorage 丢失）
  if (window.electronAPI?.saveServerConfig) {
    await window.electronAPI.saveServerConfig({ serverUrl: url })
  }
  // 同步到后端：桌台二维码生成将使用该地址
  try {
    await saveSettings({ server_address: url })
  } catch (e) { /* 服务未启动时忽略 */ }
  // 立即重建 socket 连接，无需重启
  getSocket()
  ElMessage.success('已保存，立即生效（桌台二维码将使用该地址）')
}

// 局域网IP（供手机配置）
const lanIps = ref([])
const loadLanIps = async () => {
  if (window.electronAPI?.getLanIp) {
    const res = await window.electronAPI.getLanIp()
    if (res.success) lanIps.value = res.data || []
  }
}
const copyText = async (text) => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    ElMessage.success('已复制: ' + text)
  } catch {
    ElMessage.warning('复制失败，请手动输入: ' + text)
  }
}

onMounted(async () => {
  // 服务地址：localStorage 为空时从配置文件恢复
  if (!localStorage.getItem('server_url') && window.electronAPI?.getServerConfig) {
    const cfg = await window.electronAPI.getServerConfig()
    if (cfg.success && cfg.data?.serverUrl) {
      localStorage.setItem('server_url', cfg.data.serverUrl)
      serverUrl.value = cfg.data.serverUrl
    }
  }
  loadSystemPrinters()
  loadLanIps()
  const [pRes, tRes] = await Promise.all([getPrinterConfig(), getReceiptTemplate()])
  if (pRes.code === 200 && pRes.data?.length > 0) {
    const p = pRes.data[0]
    printerForm.value = { id: p.id, name: p.name, printMode: p.printMode || 'network', deviceName: p.deviceName || '', ip: p.ip, port: p.port, paperWidth: p.paperWidth }
    localStorage.setItem('printer_config', JSON.stringify(printerForm.value))
  }
  if (tRes.code === 200 && tRes.data) {
    const t = tRes.data
    templateForm.value = { id: t.id, storeName: t.storeName, storePhone: t.storePhone, storeAddr: t.storeAddr, headerText: t.headerText, footerText: t.footerText, paperWidth: t.paperWidth }
    localStorage.setItem('receipt_template', JSON.stringify(templateForm.value))
  }
})
</script>

<style scoped>
.settings-page { height: 100%; padding: 20px; overflow-y: auto; }
.lan-ip-box { background: #f5f7fa; border-radius: 8px; padding: 14px 16px; max-width: 560px; }
.lan-ip-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 10px; }
.lan-ip-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.lan-ip-nic { font-size: 12px; color: #999; }
.lan-ip-tip { margin-top: 8px; font-size: 12px; color: #e6a23c; line-height: 1.6; }
.template-layout { display: flex; gap: 30px; }
.receipt-preview { flex-shrink: 0; }
.receipt-paper { background: #fff; border: 1px dashed #ccc; padding: 16px; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.6; }
.rp-store { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 4px; }
.rp-info { color: #333; }
.rp-line { border-top: 1px dashed #999; margin: 6px 0; }
.rp-bold { font-weight: bold; }
.rp-right { text-align: right; }
.rp-center { text-align: center; }
.rp-item { padding: 1px 0; }
</style>
