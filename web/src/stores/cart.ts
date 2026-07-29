import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref([]) // { product, specInfo, quantity }
  const tableNo = ref('')

  const totalCount = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))
  const totalPrice = computed(() => items.value.reduce((sum, i) => sum + i.product.price * i.quantity, 0))

  function setTable(no) { tableNo.value = no }

  function addItem(product, specInfo = '') {
    const key = `${product.id}_${specInfo}`
    const existing = items.value.find(i => `${i.product.id}_${i.specInfo}` === key)
    if (existing) {
      existing.quantity++
    } else {
      items.value.push({ product, specInfo, quantity: 1 })
    }
  }

  function removeItem(product, specInfo = '') {
    const key = `${product.id}_${specInfo}`
    const idx = items.value.findIndex(i => `${i.product.id}_${i.specInfo}` === key)
    if (idx > -1) {
      if (items.value[idx].quantity > 1) items.value[idx].quantity--
      else items.value.splice(idx, 1)
    }
  }

  function getQuantity(product, specInfo = '') {
    const key = `${product.id}_${specInfo}`
    const item = items.value.find(i => `${i.product.id}_${i.specInfo}` === key)
    return item ? item.quantity : 0
  }

  function clear() { items.value = [] }

  return { items, tableNo, totalCount, totalPrice, setTable, addItem, removeItem, getQuantity, clear }
})
