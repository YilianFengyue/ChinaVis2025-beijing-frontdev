// stores/inspirationStore.ts
import { defineStore } from 'pinia'
import { useSnackbarStore } from '@/stores/snackbarStore'

export interface InspirationItem {
  id: string
  type: 'herb' | 'paper' | 'chart' | 'text' | 'video'
  title: string
  subtitle?: string
  content: string
  image?: string
  sourceUrl?: string
  sourceType: string // 来源页面类型
  tags: string[]
  metadata: Record<string, any>
  timestamp: number
}

export const useInspirationStore = defineStore('inspiration', {
  state: () => ({
    items: [] as InspirationItem[],
    loading: false
  }),

  getters: {
    // 计算各分类数量
    categories: (state) => {
      const counts = state.items.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return [
        { label: "全部", value: "all", count: state.items.length },
        { label: "药材", value: "herb", count: counts.herb || 0 },
        { label: "文献", value: "paper", count: counts.paper || 0 },
        { label: "图表", value: "chart", count: counts.chart || 0 }
      ]
    },

    // 检查是否已收藏
    isCollected: (state) => {
      return (title: string, type: string) => {
        return state.items.some(item => 
          item.title === title && item.type === type
        )
      }
    },

    // 按类型筛选
    getItemsByType: (state) => {
      return (type: string) => {
        if (type === 'all') return state.items
        return state.items.filter(item => item.type === type)
      }
    }
  },

  actions: {
    // 添加收藏
    async addItem(data: Partial<InspirationItem>) {
      const snackbarStore = useSnackbarStore()
      
      try {
        // 检查是否已存在
        const exists = this.items.some(item => 
          item.title === data.title && item.type === data.type
        )
        
        if (exists) {
          snackbarStore.showWarningMessage('已经收藏过此内容')
          return false
        }

        // 创建完整的收藏项
        const newItem: InspirationItem = {
          id: this.generateId(),
          type: data.type || 'text',
          title: data.title || '未命名',
          subtitle: data.subtitle || '',
          content: data.content || '',
          image: data.image || '',
          sourceUrl: data.sourceUrl || window.location.href,
          sourceType: data.sourceType || '药材库',
          tags: data.tags || [],
          metadata: data.metadata || {},
          timestamp: Date.now()
        }

        this.items.unshift(newItem) // 新收藏的放在最前面
        this.saveToLocalStorage()
        
        snackbarStore.showSuccessMessage(`已收藏「${newItem.title}」`)
        return true
        
      } catch (error) {
        console.error('收藏失败:', error)
        snackbarStore.showErrorMessage('收藏失败，请重试')
        return false
      }
    },

    // 删除收藏
    removeItem(id: string) {
      const snackbarStore = useSnackbarStore()
      const index = this.items.findIndex(item => item.id === id)
      
      if (index > -1) {
        const item = this.items[index]
        this.items.splice(index, 1)
        this.saveToLocalStorage()
        snackbarStore.showSuccessMessage(`已删除「${item.title}」`)
      }
    },

    // 批量删除
    removeItems(ids: string[]) {
      const snackbarStore = useSnackbarStore()
      this.items = this.items.filter(item => !ids.includes(item.id))
      this.saveToLocalStorage()
      snackbarStore.showSuccessMessage(`已删除 ${ids.length} 项内容`)
    },

    // 清空所有
    clearAll() {
      const snackbarStore = useSnackbarStore()
      this.items = []
      this.saveToLocalStorage()
      snackbarStore.showSuccessMessage('已清空所有收藏')
    },

    // 更新收藏项
    updateItem(id: string, updates: Partial<InspirationItem>) {
      const index = this.items.findIndex(item => item.id === id)
      if (index > -1) {
        this.items[index] = { ...this.items[index], ...updates }
        this.saveToLocalStorage()
      }
    },

    // 生成唯一ID
    generateId(): string {
      return `inspiration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },

    // 本地存储
    saveToLocalStorage() {
      try {
        localStorage.setItem('inspiration_items', JSON.stringify(this.items))
      } catch (error) {
        console.error('保存到本地存储失败:', error)
      }
    },

    // 从本地存储加载
    loadFromLocalStorage() {
      try {
        const stored = localStorage.getItem('inspiration_items')
        if (stored) {
          this.items = JSON.parse(stored)
        }
      } catch (error) {
        console.error('从本地存储加载失败:', error)
        this.items = []
      }
    },

    // 导出数据
    exportData() {
      const data = {
        exportTime: new Date().toISOString(),
        version: '1.0',
        items: this.items
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inspiration_backup_${new Date().toLocaleDateString()}.json`
      a.click()
      URL.revokeObjectURL(url)
    },

    // 导入数据
    async importData(file: File) {
      const snackbarStore = useSnackbarStore()
      
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        if (data.items && Array.isArray(data.items)) {
          this.items = [...this.items, ...data.items]
          this.saveToLocalStorage()
          snackbarStore.showSuccessMessage(`成功导入 ${data.items.length} 项内容`)
        } else {
          throw new Error('数据格式不正确')
        }
      } catch (error) {
        console.error('导入失败:', error)
        snackbarStore.showErrorMessage('导入失败，请检查文件格式')
      }
    }
  }
})