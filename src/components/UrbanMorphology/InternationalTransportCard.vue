<template>
  <v-card flat class="arch-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <v-row align="center" dense no-gutters>
        <v-col cols="auto" class="d-flex align-center mr-4">
          <div class="header-block"></div>
          <div class="header-text-group">
            <h2 class="panel-title">国际通达</h2>
            <span class="panel-subtitle">INTERNATIONAL ROUTES</span>
          </div>
        </v-col>

        <v-spacer></v-spacer>

        <!-- 筛选器 -->
        <v-col cols="auto" class="d-flex align-center gap-2">
          <select v-model="filterDynasty" class="arch-select">
            <option value="">全部朝代</option>
            <option v-for="d in availableDynasties" :key="d" :value="d">{{ d }}</option>
          </select>

          <select v-model="filterType" class="arch-select">
            <option value="">全部方式</option>
            <option v-for="t in transportTypes" :key="t" :value="t">{{ t }}</option>
          </select>
        </v-col>
      </v-row>
    </div>

    <!-- 卡片网格 -->
    <div class="cards-container">
      <div class="cards-grid">
        <div
          v-for="dest in filteredDestinations"
          :key="dest.name"
          class="dest-card"
          :class="{ expanded: expandedCard === dest.name }"
          @click="toggleExpand(dest.name)"
        >
          <!-- 卡片头部 -->
          <div class="card-header">
            <span class="card-title">{{ dest.name }}</span>
            <span class="card-count">{{ dest.records.length }}条</span>
          </div>

          <!-- 交通类型标签 -->
          <div class="card-chips">
            <span 
              v-for="type in dest.types" 
              :key="type"
              class="type-chip"
              :style="{ background: TRANSPORT_COLORS[type], color: '#fff' }"
            >
              {{ type }}
            </span>
          </div>

          <!-- 朝代小字 -->
          <div class="card-dynasties">
            {{ [...dest.dynasties].join(' / ') }}
          </div>

          <!-- 展开的证据列表 -->
          <Transition name="slide-down">
            <div v-if="expandedCard === dest.name" class="card-evidences">
              <div class="evidence-divider"></div>
              <div 
                v-for="(record, idx) in dest.records.slice(0, 5)" 
                :key="idx"
                class="evidence-item"
              >
                <span class="ev-dynasty">{{ record.standard_dynasty }}</span>
                <span class="ev-type" :style="{ color: TRANSPORT_COLORS[record.transport_type] }">
                  {{ record.transport_type }}
                </span>
                <p class="ev-text">{{ truncateEvidence(record.evidence) }}</p>
              </div>
              <div v-if="dest.records.length > 5" class="evidence-more">
                +{{ dest.records.length - 5 }} 更多记录...
              </div>
            </div>
          </Transition>

          <!-- 展开指示器 -->
          <div class="expand-indicator">
            <v-icon size="small">
              {{ expandedCard === dest.name ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
            </v-icon>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredDestinations.length === 0" class="empty-state">
        <v-icon size="48" color="#ccc">mdi-airplane-off</v-icon>
        <p>暂无符合条件的国际目的地</p>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
      <span class="stat-item">
        <span class="stat-label">目的地</span>
        <span class="stat-value">{{ filteredDestinations.length }}</span>
      </span>
      <span class="stat-item">
        <span class="stat-label">总记录</span>
        <span class="stat-value">{{ totalRecords }}</span>
      </span>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getTransportData,
  getInternationalDestinations,
  DYNASTIES,
  TRANSPORT_COLORS,
  type TransportRecord,
  type InternationalDestination,
} from './transportUtils'

// ==================== 响应式状态 ====================

const rawData = ref<TransportRecord[]>([])
const allDestinations = ref<InternationalDestination[]>([])
const filterDynasty = ref('')
const filterType = ref('')
const expandedCard = ref<string | null>(null)

const transportTypes = ['陆路', '水路', '航线']

// ==================== 计算属性 ====================

const availableDynasties = computed(() => {
  const dynasties = new Set<string>()
  allDestinations.value.forEach(dest => {
    dest.dynasties.forEach(d => dynasties.add(d))
  })
  return DYNASTIES.filter(d => dynasties.has(d))
})

const filteredDestinations = computed(() => {
  return allDestinations.value.filter(dest => {
    // 朝代筛选
    if (filterDynasty.value && !dest.dynasties.has(filterDynasty.value)) {
      return false
    }
    // 类型筛选
    if (filterType.value && !dest.types.has(filterType.value)) {
      return false
    }
    return true
  }).map(dest => {
    // 过滤记录
    let records = dest.records
    if (filterDynasty.value) {
      records = records.filter(r => r.standard_dynasty === filterDynasty.value)
    }
    if (filterType.value) {
      records = records.filter(r => r.transport_type === filterType.value)
    }
    return {
      ...dest,
      records,
      types: new Set(records.map(r => r.transport_type)),
      dynasties: new Set(records.map(r => r.standard_dynasty)),
    }
  })
})

const totalRecords = computed(() => {
  return filteredDestinations.value.reduce((sum, d) => sum + d.records.length, 0)
})

// ==================== 方法 ====================

const toggleExpand = (name: string) => {
  expandedCard.value = expandedCard.value === name ? null : name
}

const truncateEvidence = (text: string): string => {
  if (!text) return '暂无详细记录'
  return text.length > 80 ? text.slice(0, 80) + '...' : text
}

// ==================== 生命周期 ====================

onMounted(() => {
  rawData.value = getTransportData()
  allDestinations.value = getInternationalDestinations(rawData.value)
})
</script>

<style scoped>
/* ==================== 面板样式 ==================== */
.arch-panel {
  --font-cn: "Source Han Serif SC", "Noto Serif SC", serif;
  --bg-color: #F5F0E6;
  --accent-gold: #C4A35A;
  --accent-blue: #1E90FF;
  
  background: var(--bg-color);
  font-family: var(--font-cn);
  border: none;
  border-radius: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ==================== 头部 ==================== */
.panel-header {
  padding: 16px 20px;
  background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%);
  border-bottom: 1px solid #D1C4A8;
}

.header-block {
  width: 5px;
  height: 28px;
  background: var(--accent-blue);
  margin-right: 10px;
}

.header-text-group {
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: #2C3E50;
  margin: 0;
  letter-spacing: 2px;
}

.panel-subtitle {
  font-size: 9px;
  color: #888;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.gap-2 {
  gap: 8px;
}

.arch-select {
  padding: 4px 8px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 2px;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}

/* ==================== 卡片网格 ==================== */
.cards-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #F8F4EC;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.dest-card {
  background: #fff;
  border: 1px solid #D1C4A8;
  border-radius: 4px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.dest-card:hover {
  border-color: var(--accent-gold);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.dest-card.expanded {
  border-color: var(--accent-blue);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #2C3E50;
}

.card-count {
  font-size: 10px;
  color: #888;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 10px;
}

.card-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.type-chip {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 2px;
}

.card-dynasties {
  font-size: 10px;
  color: #888;
  line-height: 1.4;
}

/* ==================== 展开的证据 ==================== */
.card-evidences {
  margin-top: 10px;
}

.evidence-divider {
  height: 1px;
  background: #E8E0D0;
  margin-bottom: 10px;
}

.evidence-item {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #eee;
}

.evidence-item:last-child {
  border-bottom: none;
}

.ev-dynasty {
  font-size: 9px;
  background: #2C3E50;
  color: #fff;
  padding: 1px 5px;
  border-radius: 2px;
  margin-right: 4px;
}

.ev-type {
  font-size: 9px;
  font-weight: 500;
}

.ev-text {
  font-size: 11px;
  color: #555;
  margin: 4px 0 0 0;
  line-height: 1.5;
}

.evidence-more {
  font-size: 10px;
  color: var(--accent-blue);
  text-align: center;
  padding: 4px;
}

.expand-indicator {
  position: absolute;
  bottom: 4px;
  right: 8px;
  color: #ccc;
}

/* ==================== 空状态 ==================== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #999;
}

.empty-state p {
  margin-top: 12px;
  font-size: 12px;
}

/* ==================== 统计栏 ==================== */
.stats-bar {
  display: flex;
  gap: 24px;
  padding: 10px 20px;
  background: #F0EBE0;
  border-top: 1px solid #D1C4A8;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-label {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #2C3E50;
}

/* ==================== 动画 ==================== */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 300px;
}
</style>
