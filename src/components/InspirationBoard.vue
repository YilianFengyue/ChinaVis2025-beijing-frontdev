<!--
* @Component: InspirationBoard
* @Maintainer: J.K. Yang
* @Description: 灵感整理板 - 收藏药材、文献、图表等内容
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDisplay } from "vuetify"
import { useInspirationStore } from "@/stores/inspirationStore"
import CopyBtn from "@/components/common/CopyBtn.vue"
import { Icon } from "@iconify/vue"

const inspirationStore = useInspirationStore()
const { xs } = useDisplay()

// 组件状态
const dialog = ref(false)
const currentCategory = ref("all")
const searchKeyword = ref("")

// 从 store 获取数据
const categories = computed(() => inspirationStore.categories)
const inspirationItems = computed(() => inspirationStore.items)

// 过滤后的内容
const filteredItems = computed(() => {
  return inspirationStore.getItemsByType(currentCategory.value)
})

// 搜索后的内容
const searchedItems = computed(() => {
  if (!searchKeyword.value.trim()) {
    return filteredItems.value
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return filteredItems.value.filter(item => 
    item.title.toLowerCase().includes(keyword) ||
    item.content.toLowerCase().includes(keyword) ||
    item.subtitle?.toLowerCase().includes(keyword) ||
    item.tags.some(tag => tag.toLowerCase().includes(keyword))
  )
})

// 获取类型图标
const getTypeIcon = (type: string) => {
  const icons = {
    herb: "mdi-leaf",
    paper: "mdi-file-document",
    chart: "mdi-chart-scatter-plot",
    text: "mdi-text",
    video: "mdi-play-circle"
  }
  return icons[type] || "mdi-bookmark"
}

// 获取类型颜色
const getTypeColor = (type: string) => {
  const colors = {
    herb: "green",
    paper: "blue", 
    chart: "orange",
    text: "purple",
    video: "red"
  }
  return colors[type] || "grey"
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  
  if (days === 0) return "今天"
  if (days === 1) return "昨天"
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  if (days < 365) return `${Math.floor(days / 30)}个月前`
  return new Date(timestamp).toLocaleDateString()
}

// 删除项目
const deleteItem = (id: string) => {
  inspirationStore.removeItem(id)
}

// 清空所有
const clearAll = () => {
    inspirationStore.clearAll()
}

// 查看详情
const viewDetail = (item: any) => {
  // 这里可以实现详情查看功能
  console.log('查看详情:', item)
  
  // 如果有原始URL，可以跳转
  if (item.sourceUrl) {
    window.open(item.sourceUrl, '_blank')
  }
}

// 分享功能
const shareItem = (item: any) => {
  // 实现分享功能
  if (navigator.share) {
    navigator.share({
      title: item.title,
      text: item.content,
      url: item.sourceUrl || window.location.href
    }).catch(console.error)
  } else {
    // 降级到复制链接
    const shareText = `${item.title}\n${item.content}\n${item.sourceUrl || window.location.href}`
    navigator.clipboard.writeText(shareText).then(() => {
      // 这里可以显示成功提示
      console.log('已复制分享内容')
    }).catch(console.error)
  }
}

// 导出数据
const exportData = () => {
  inspirationStore.exportData()
}

// 导入数据
const importData = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    inspirationStore.importData(file)
  }
  // 重置 input 值，允许重复选择同一文件
  target.value = ''
}

// 组件挂载时加载数据
onMounted(() => {
  inspirationStore.loadFromLocalStorage()
})
</script>

<template>
  <v-btn size="50" @click="dialog = !dialog">
    <v-icon size="30">mdi-lightbulb-outline</v-icon>
    <v-tooltip
      activator="parent"
      location="left"
      text="灵感整理板"
    ></v-tooltip>
  </v-btn>

  <teleport to="body">
    <transition name="slide-y">
      <v-card
        v-if="dialog"
        class="dialog-bottom d-flex flex-column"
        :width="xs ? '100%' : '600px'"
        height="500px"
      >
        <!-- 标题栏 -->
        <v-card-title>
          <span class="flex-fill d-flex align-center">
            <v-avatar size="40" class="mr-3">
              <v-icon size="24" color="primary">mdi-lightbulb</v-icon>
            </v-avatar>
            <div>
              <div class="text-h6">灵感整理板</div>
              <div class="text-caption text-grey">
                共 {{ inspirationItems.length }} 项收藏
              </div>
            </div>
          </span>
          <v-spacer></v-spacer>
          
          <!-- 操作按钮 -->
          <v-btn icon size="small" @click="exportData" class="mr-1">
            <v-icon>mdi-download</v-icon>
            <v-tooltip activator="parent" text="导出数据" />
          </v-btn>
          
          <v-btn icon size="small" class="mr-1">
            <v-icon>mdi-upload</v-icon>
            <input 
              type="file" 
              accept=".json"
              @change="importData"
              style="position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer;"
            />
            <v-tooltip activator="parent" text="导入数据" />
          </v-btn>
          
          <v-btn icon @click.stop="dialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-divider />
        
        <!-- 操作栏 -->
        <v-card-actions class="px-5 py-3">
          <!-- 分类筛选 -->
          <v-btn-toggle
            v-model="currentCategory"
            variant="outlined"
            density="compact"
            color="primary"
            mandatory
            class="mr-2"
          >
            <v-btn
              v-for="cat in categories"
              :key="cat.value"
              :value="cat.value"
              size="small"
            >
              {{ cat.label }}
              <v-chip size="x-small" class="ml-1" v-if="cat.count">
                {{ cat.count }}
              </v-chip>
            </v-btn>
          </v-btn-toggle>

          <v-spacer></v-spacer>

          <!-- 清空按钮 -->
          <v-btn
            size="small"
            variant="text"
            color="error"
            @click="clearAll"
            :disabled="inspirationItems.length === 0"
          >
            <v-icon size="16" class="mr-1">mdi-delete-sweep</v-icon>
            清空
          </v-btn>
        </v-card-actions>

        <v-divider />

        <!-- 搜索栏 -->
        <div class="pa-3">
          <v-text-field
            v-model="searchKeyword"
            placeholder="搜索收藏内容..."
            variant="outlined"
            density="compact"
            hide-details
            prepend-inner-icon="mdi-magnify"
            clearable
          />
        </div>

        <!-- 内容区域 -->
        <v-card-text class="flex-grow-1 pa-0">
          <perfect-scrollbar class="inspiration-container">
            <!-- 空状态 -->
            <div v-if="searchedItems.length === 0" class="empty-state">
              <v-icon size="64" color="grey-lighten-2">
                {{ searchKeyword ? 'mdi-file-search-outline' : 'mdi-bookmark-outline' }}
              </v-icon>
              <p class="text-grey-lighten-1 mt-4">
                {{ searchKeyword ? '未找到匹配内容' : '还没有收藏任何内容' }}
              </p>
              <p class="text-caption text-grey-lighten-2">
                {{ searchKeyword ? '尝试其他关键词' : '在页面中悬停药材卡片并点击收藏按钮' }}
              </p>
            </div>

            <!-- 内容卡片列表 -->
            <div v-else class="pa-3">
              <v-card
                v-for="item in searchedItems"
                :key="item.id"
                class="inspiration-card mb-3"
                variant="outlined"
                hover
              >
                <!-- 卡片头部 -->
                <div class="d-flex align-center pa-3 pb-2">
                  <v-icon 
                    :icon="getTypeIcon(item.type)" 
                    :color="getTypeColor(item.type)"
                    size="20"
                    class="mr-2"
                  />
                  <div class="flex-grow-1">
                    <h6 class="text-subtitle-2 font-weight-bold mb-0">
                      {{ item.title }}
                    </h6>
                    <p class="text-caption text-grey-darken-1 mb-0" v-if="item.subtitle">
                      {{ item.subtitle }}
                    </p>
                  </div>
                  <v-btn 
                    icon 
                    size="small" 
                    variant="text"
                    @click="deleteItem(item.id)"
                  >
                    <v-icon size="16">mdi-close</v-icon>
                  </v-btn>
                </div>

                <!-- 图片预览 -->
                <div v-if="item.image" class="px-3">
                  <v-img
                    :src="item.image"
                    height="120"
                    cover
                    class="rounded"
                  >
                    <template #error>
                      <div class="d-flex align-center justify-center h-100 bg-grey-lighten-4">
                        <v-icon color="grey">mdi-image-broken</v-icon>
                      </div>
                    </template>
                  </v-img>
                </div>

                <!-- 内容 -->
                <v-card-text class="pt-2">
                  <p class="text-body-2 mb-2 text-clamp-2">
                    {{ item.content }}
                  </p>
                  
                  <!-- 标签 -->
                  <div class="mb-2" v-if="item.tags && item.tags.length">
                    <v-chip
                      v-for="tag in item.tags.slice(0, 4)"
                      :key="tag"
                      size="x-small"
                      variant="outlined"
                      class="mr-1 mb-1"
                    >
                      {{ tag }}
                    </v-chip>
                    <span v-if="item.tags.length > 4" class="text-caption text-grey">
                      +{{ item.tags.length - 4 }}
                    </span>
                  </div>
                  
                  <!-- 来源信息 -->
                  <div class="text-caption text-grey-darken-1" v-if="item.sourceType">
                    来源：{{ item.sourceType }}
                  </div>
                </v-card-text>

                <!-- 操作栏 -->
                <v-card-actions class="pt-0">
                  <span class="text-caption text-grey">
                    {{ formatTime(item.timestamp) }}
                  </span>
                  <v-spacer />
                  
                  <!-- 查看详情 -->
                  <v-btn size="small" variant="text" icon @click="viewDetail(item)">
                    <v-icon size="16">mdi-eye</v-icon>
                    <v-tooltip activator="parent" location="top">
                      查看详情
                    </v-tooltip>
                  </v-btn>
                  
                  <!-- 复制内容 -->
                  <CopyBtn :text="item.content" size="small" />
                  
                  <!-- 分享 -->
                  <v-btn size="small" variant="text" icon @click="shareItem(item)">
                    <v-icon size="16">mdi-share</v-icon>
                    <v-tooltip activator="parent" location="top">
                      分享
                    </v-tooltip>
                  </v-btn>
                </v-card-actions>
              </v-card>
            </div>
          </perfect-scrollbar>
        </v-card-text>
      </v-card>
    </transition>
  </teleport>
</template>

<style scoped lang="scss">
.dialog-bottom {
  z-index: 999;
  position: fixed;
  bottom: 10px;
  right: 0px;
}

.inspiration-container {
  height: 100%;
  max-height: 320px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
}

.inspiration-card {
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
}

.text-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 滑入滑出动画
.slide-y-enter-active,
.slide-y-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.slide-y-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-y-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.slide-y-enter-to,
.slide-y-leave-from {
  transform: translateY(0);
  opacity: 1;
}

// 响应式调整
@media screen and (max-width: 768px) {
  .inspiration-card {
    .v-card-actions {
      padding: 8px 16px;
    }
  }
}
</style>