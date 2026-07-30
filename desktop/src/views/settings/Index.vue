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
          <el-form-item label="IP地址">
            <el-input v-model="printerForm.ip" placeholder="192.168.0.100" />
          </el-form-item>
          <el-form-item label="端口">
            <el-input-number v-model="printerForm.port" :min="1" :max="65535" />
          </el-form-item>
          <el-form-item label="纸宽">
            <el-radio-group v-model="printerForm.paperWidth">
              <el-radio :label="58">58mm</el-radio>
              <el-radio :label="80">80mm</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="savePrinter">保存配置</el-button>
            <el-button @click="handleTestPrint">测试打印</el-button>
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
import { getPrinterConfig, savePrinterConfig, getReceiptTemplate, saveReceiptTemplate } from '../../api'
import request from '../../api'

const activeTab = ref('printer')
const serverUrl = ref(localStorage.getItem('server_url') || 'http://localhost:3000')

const printerForm = ref({ name: '默认打印机', ip: '', port: 9100, paperWidth: 58 })
const templateForm = ref({ storeName: '', storePhone: '', storeAddr: '', headerText: '', footerText: '', paperWidth: 58 })

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
  if (!printerForm.value.ip) { ElMessage.warning('请先填写打印机IP'); return }
  if (window.electronAPI) {
    const result = await window.electronAPI.testPrint({ ip: printerForm.value.ip, port: printerForm.value.port })
    if (result.success) ElMessage.success('测试打印成功')
    else ElMessage.error(result.message)
  } else {
    ElMessage.info('请在桌面端运行以使用打印功能')
  }
}

const saveTemplate = async () => {
  const res = await saveReceiptTemplate(templateForm.value)
  if (res.code === 200) {
    ElMessage.success('模板保存成功')
    localStorage.setItem('receipt_template', JSON.stringify(templateForm.value))
  }
}

const saveServerUrl = () => {
  localStorage.setItem('server_url', serverUrl.value)
  ElMessage.success('已保存，重启后生效')
}

onMounted(async () => {
  const [pRes, tRes] = await Promise.all([getPrinterConfig(), getReceiptTemplate()])
  if (pRes.code === 200 && pRes.data?.length > 0) {
    const p = pRes.data[0]
    printerForm.value = { id: p.id, name: p.name, ip: p.ip, port: p.port, paperWidth: p.paperWidth }
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
