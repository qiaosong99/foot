<template>
  <div class="app-container">
    <!-- 顶部导航 -->
    <div class="top-nav">
      <div class="nav-left">
        <span class="app-title">餐饮点餐系统</span>
      </div>
      <div class="nav-tabs">
        <router-link to="/screen" class="nav-tab" active-class="active">大屏</router-link>
        <router-link to="/kitchen" class="nav-tab" active-class="active">后厨</router-link>
        <router-link to="/cashier" class="nav-tab" active-class="active">收银</router-link>
        <router-link to="/refund" class="nav-tab" active-class="active">退菜</router-link>
        <router-link to="/takeout" class="nav-tab" active-class="active">外卖</router-link>
        <router-link to="/admin" class="nav-tab" active-class="active">管理</router-link>
        <router-link to="/settings" class="nav-tab" active-class="active">设置</router-link>
      </div>
      <div class="nav-right">
        <span class="server-status" :class="{ online: serverOnline }">
          {{ serverOnline ? '服务正常' : '连接中...' }}
        </span>
      </div>
    </div>
    <!-- 主内容 -->
    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getSocket } from './api/socket'

const serverOnline = ref(false)

onMounted(() => {
  const socket = getSocket()
  socket.on('connect', () => {
    serverOnline.value = true
    // 每次连接/重连时加入房间
    socket.emit('join_screen')
    socket.emit('join_kitchen')
  })
  socket.on('disconnect', () => { serverOnline.value = false })
})
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { height: 100%; font-family: 'Microsoft YaHei', sans-serif; }
.app-container { height: 100%; display: flex; flex-direction: column; background: #f0f2f5; }
.top-nav { height: 52px; background: #1a1a2e; display: flex; align-items: center; padding: 0 20px; gap: 20px; flex-shrink: 0; }
.nav-left { display: flex; align-items: center; }
.app-title { color: #fff; font-size: 16px; font-weight: bold; }
.nav-tabs { display: flex; gap: 4px; flex: 1; }
.nav-tab { color: rgba(255,255,255,0.7); text-decoration: none; padding: 8px 18px; border-radius: 6px; font-size: 14px; transition: all 0.2s; }
.nav-tab:hover { color: #fff; background: rgba(255,255,255,0.1); }
.nav-tab.active { color: #fff; background: #409eff; }
.nav-right { display: flex; align-items: center; }
.server-status { font-size: 12px; padding: 4px 10px; border-radius: 10px; background: rgba(255,255,255,0.1); color: #999; }
.server-status.online { color: #67c23a; background: rgba(103,194,58,0.1); }
.main-content { flex: 1; overflow: hidden; }
</style>
