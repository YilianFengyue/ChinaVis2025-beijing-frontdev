<template>
  <v-card flat class="arch-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <v-row align="center" dense no-gutters>
        <v-col cols="auto" class="d-flex align-center mr-6">
          <div class="header-block"></div>
          <div class="header-text-group">
            <h2 class="panel-title">朝代舆图</h2>
            <span class="panel-subtitle">TRANSPORT ATLAS</span>
          </div>
        </v-col>

        <v-spacer></v-spacer>

        <!-- 视图切换 -->
        <v-col cols="auto" class="mr-6">
          <div class="view-toggle">
            <button 
              class="toggle-btn" 
              :class="{ active: viewMode === 'domestic' }"
              @click="viewMode = 'domestic'"
            >
              国内
            </button>
            <button 
              class="toggle-btn" 
              :class="{ active: viewMode === 'international' }"
              @click="viewMode = 'international'"
            >
              国际
            </button>
          </div>
        </v-col>

        <!-- 交通类型筛选 -->
        <v-col cols="auto" v-if="viewMode === 'domestic'">
          <div class="filter-group">
            <v-chip
              v-for="type in transportTypes" 
              :key="type"
              label
              size="small"
              :color="activeTypes.includes(type) ? TRANSPORT_COLORS[type] : 'grey'"
              :variant="activeTypes.includes(type) ? 'flat' : 'outlined'"
              @click="toggleType(type)"
              class="ma-1 font-weight-bold"
              style="border-radius: 2px;"
            >
              <v-icon start size="x-small" v-if="type === '航线'">mdi-airplane</v-icon>
              <v-icon start size="x-small" v-else-if="type === '水路'">mdi-ferry</v-icon>
              <v-icon start size="x-small" v-else>mdi-road-variant</v-icon>
              {{ type }}
            </v-chip>
          </div>
        </v-col>

        <!-- 国际视图筛选器 -->
        <v-col cols="auto" v-if="viewMode === 'international'" class="d-flex align-center gap-2">
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

    <!-- Map Container -->
    <div v-show="viewMode === 'domestic'" ref="mapContainer" class="map-container">
      <svg ref="svgMap"></svg>
      
      <!-- Reset Zoom Button -->
      <v-btn
        position="absolute"
        location="top right"
        icon="mdi-image-filter-center-focus"
        size="small"
        variant="text"
        color="grey-darken-3"
        class="ma-2 bg-white-translucent"
        @click="resetZoom"
        style="z-index: 10;"
      ></v-btn>

       <!-- Legend (Right Side Floating) -->
      <div class="map-legend-floating">
        <div class="legend-group">
          <span class="legend-head">TYPE</span>
          <div class="legend-items-vertical">
            <span class="l-item" v-for="(color, name) in TRANSPORT_COLORS" :key="name">
              <span 
                class="line-mark" 
                :style="{ background: color }"
                :class="{ dashed: name === '航线' }"
              ></span>
              {{ name }}
            </span>
          </div>
        </div>
        <div class="legend-sep-h"></div>
        <div class="legend-group">
          <span class="legend-head">WEIGHT</span>
          <span class="l-item" style="color:#555">粗细 = 记录数</span>
        </div>
      </div>

      <!-- Tooltip -->
      <Teleport to="body">
        <Transition name="fade-up">
          <div
            v-if="tooltip.show"
            class="map-tooltip"
            :style="{
              left: tooltip.x + 15 + 'px', 
              top: tooltip.y - 10 + 'px'
            }"
          >
            <div class="tt-header">
              <span class="tt-province">{{ tooltip.data.province }}</span>
              <span class="tt-type" :style="{ color: TRANSPORT_COLORS[tooltip.data.type] }">
                {{ tooltip.data.type }}
              </span>
            </div>
            <div class="tt-body">
              <div class="tt-stat">
                <span class="tt-label">记录条数</span>
                <span class="tt-value">{{ tooltip.data.count }}</span>
              </div>
              <div class="tt-stat" v-if="tooltip.data.dynasty">
                <span class="tt-label">朝代</span>
                <span class="tt-value">{{ tooltip.data.dynasty }}</span>
              </div>
            </div>
            <div class="tt-hint">点击查看详情</div>
          </div>
        </Transition>
      </Teleport>
    </div>

    <!-- International Cards -->
    <div v-show="viewMode === 'international'" class="cards-container">
      <div class="cards-masonry">
         <div
          v-for="dest in filteredDestinations"
          :key="dest.name"
          class="dest-card"
          :class="{ expanded: expandedCard === dest.name }"
          v-ripple
          @click="toggleExpand(dest.name)"
        >
          <div class="card-header">
            <span class="card-title">{{ dest.name }}</span>
            <span class="card-count">{{ dest.records.length }}条</span>
          </div>
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
          <div class="card-dynasties">
            {{ [...dest.dynasties].join(' / ') }}
          </div>
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
          <div class="expand-indicator">
            <v-icon size="small">
              {{ expandedCard === dest.name ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
            </v-icon>
          </div>
        </div>
      </div>
      <div v-if="filteredDestinations.length === 0" class="empty-state">
        <v-icon size="48" color="#ccc">mdi-airplane-off</v-icon>
        <p>暂无符合条件的国际目的地</p>
      </div>
    </div>

    <!-- Timeline -->
    <div v-if="viewMode === 'domestic'" class="timeline-wrapper">
      <div class="dynasty-timeline">
        <v-chip
          v-for="dynasty in DYNASTIES"
          :key="dynasty"
          label
          size="small"
          rounded="sm"
          :color="selectedDynasty === dynasty ? 'grey-darken-3' : 'grey-lighten-2'"
           :class="{'on-surface': selectedDynasty !== dynasty, 'text-white': selectedDynasty === dynasty}"
          :variant="selectedDynasty === dynasty ? 'flat' : 'flat'"
          class="dynasty-chip mb-1"
          @click="selectDynasty(dynasty)"
        >
          {{ dynasty }}
        </v-chip>
        <v-spacer></v-spacer>
        <v-chip 
          label
          size="small"
          rounded="sm"
          color="brown-darken-1"
          variant="flat"
          class="dynasty-chip text-white"
          @click="selectDynasty(null)"
        >
          全部
        </v-chip>
      </div>
    </div>

    <!-- Evidence Dialog -->
    <v-dialog v-model="evidenceDialog.show" max-width="500">
      <v-card class="evidence-dialog-card">
        <v-card-title class="d-flex align-center bg-grey-lighten-3 pa-3">
          <span class="text-h6 font-weight-bold">{{ evidenceDialog.data?.province }}</span>
          <v-chip size="x-small" label class="ml-2 text-white" :color="TRANSPORT_COLORS[evidenceDialog.data?.type || '陆路']">
            {{ evidenceDialog.data?.type }}
          </v-chip>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" size="small" @click="evidenceDialog.show = false"></v-btn>
        </v-card-title>
        <v-card-text class="pa-4 bg-white" style="max-height: 400px; overflow-y: auto;">
          <div v-for="(ev, idx) in evidenceDialog.data?.evidences" :key="idx" class="mb-3 pb-3 border-b-dashed">
            <div class="text-caption text-grey-darken-3 mb-1 font-song">
              {{ ev }}
            </div>
            <div class="d-flex justify-end">
               <v-chip size="x-small" variant="outlined" color="grey" class="font-song">{{ evidenceDialog.data?.dynasty }}</v-chip>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="pa-3 pt-0">
          <v-btn
            color="amber-darken-3"
            variant="tonal"
            size="small"
            prepend-icon="mdi-pin-outline"
            @click="collectEvidenceDialog"
          >
            收集线索
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" size="small" @click="evidenceDialog.show = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import {
  getTransportData,
  getDomesticConnections,
  getInternationalDestinations,
  filterByDynasty,
  filterByType,
  normalizeProvinceName,
  calculateLineWeight,
  DYNASTIES,
  TRANSPORT_COLORS,
  PROVINCE_CENTERS,
  type TransportRecord,
  type InternationalDestination,
} from './transportUtils'
// 导入线索收集器
import { useClueCollector } from '@/composables/useClueCollector'

const { collectClue } = useClueCollector()

// ==================== 状态 ====================

const mapContainer = ref<HTMLElement | null>(null)
const svgMap = ref<SVGSVGElement | null>(null)
const viewMode = ref<'domestic' | 'international'>('domestic')
const selectedDynasty = ref<string | null>(null)
const activeTypes = ref<string[]>(['陆路', '水路', '航线'])
const transportTypes = ['陆路', '水路', '航线']

// 国际视图
const filterDynasty = ref('')
const filterType = ref('')
const expandedCard = ref<string | null>(null)

// 交互
const tooltip = ref({ show: false, x: 0, y: 0, data: {} as any })
const evidenceDialog = ref({ show: false, data: null as any })
const zoomBehavior = ref<any>(null)
// 保存当前选中的连接以便保持高亮
const selectedConnection = ref<any>(null)

// 数据
const rawData = ref<TransportRecord[]>([])
const allDestinations = ref<InternationalDestination[]>([])
const geoData = ref<any>(null)

// ==================== 计算 ====================

const filteredConnections = computed(() => {
  let data = rawData.value
  data = filterByDynasty(data, selectedDynasty.value)
  data = filterByType(data, activeTypes.value)
  return getDomesticConnections(data)
})

const availableDynasties = computed(() => {
  const dynasties = new Set<string>()
  allDestinations.value.forEach(dest => {
    dest.dynasties.forEach(d => dynasties.add(d))
  })
  return DYNASTIES.filter(d => dynasties.has(d))
})

const filteredDestinations = computed(() => {
  return allDestinations.value.filter(dest => {
    if (filterDynasty.value && !dest.dynasties.has(filterDynasty.value)) return false
    if (filterType.value && !dest.types.has(filterType.value)) return false
    return true
  }).map(dest => {
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

// ==================== 方法 ====================

const toggleType = (type: string) => {
  const idx = activeTypes.value.indexOf(type)
  if (idx >= 0) {
    if (activeTypes.value.length > 1) activeTypes.value.splice(idx, 1)
  } else {
    activeTypes.value.push(type)
  }
}

const selectDynasty = (dynasty: string | null) => {
  selectedDynasty.value = selectedDynasty.value === dynasty ? null : dynasty
}

const toggleExpand = (name: string) => {
  expandedCard.value = expandedCard.value === name ? null : name
}

const truncateEvidence = (text: string): string => {
  if (!text) return '暂无详细记录'
  return text.length > 80 ? text.slice(0, 80) + '...' : text
}

// 收集弹窗内的交通线路线索
const collectEvidenceDialog = () => {
  const d = evidenceDialog.value.data
  if (!d) return
  collectClue({
    title: `北京 → ${d.province}`,
    dynasty: d.dynasty || '多朝代',
    content: `${d.type} · 记录数: ${d.count}`,
    subLabel: `${d.type} · ${d.dynasty || '全部'}`
  }, 'clue_event', '朝代舆图')
  evidenceDialog.value.show = false
}

// const loadGeoData = async () => {
//   try {
//     const response = await fetch('/src/data/transport/中国_省.geojson')
//     geoData.value = await response.json()
//   } catch (error) {
//     console.error('Failed to load GeoJSON:', error)
//   }
// }
const loadGeoData = async () => {
  try {
    const geoJsonUrl = new URL('../../data/transport/中国_省.geojson', import.meta.url)
    const response = await fetch(geoJsonUrl)
    geoData.value = await response.json()
  } catch (error) {
    console.error('Failed to load GeoJSON:', error)
  }
}
const resetZoom = () => {
  if (!svgMap.value || !zoomBehavior.value) return
  d3.select(svgMap.value)
    .transition()
    .duration(750)
    .call(zoomBehavior.value.transform, d3.zoomIdentity)
}

// ==================== D3 地图绘制 ====================

const drawMap = () => {
  if (!svgMap.value || !mapContainer.value || !geoData.value) return

  const width = mapContainer.value.clientWidth
  const height = mapContainer.value.clientHeight || 600

  const svg = d3.select(svgMap.value)
    .attr('width', width)
    .attr('height', height)

  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })
  zoomBehavior.value = zoom
  svg.call(zoom as any)

  svg.selectAll('.main-group').remove()
  const g = svg.append('g').attr('class', 'main-group')

  // 投影
  const projection = d3.geoMercator()
    .center([105, 35])
    .scale(Math.min(width, height) * 1.25)
    .translate([width / 2, height / 2])

  const path = d3.geoPath().projection(projection)

  // 绘制底图（中国省份）
  g.append('g')
    .attr('class', 'provinces')
    .selectAll('path')
    .data(geoData.value.features)
    .enter()
    .append('path')
    .attr('d', path as any)
    .attr('fill', (d: any) => {
      const name = d.properties.name
      // 北京位置颜色稍深，其他陆地为浅灰
      if (name === '北京' || name === '北京市') return '#8D6E63' // Brownish
      if (name === '北京' || name === '北京市') return '#8D6E63' 
      return '#C8B696' // Low saturation Gold (User: C5A061 -> desaturated)
    })
    .attr('stroke', '#F5F5F5') // 边框基本隐入背景
    .attr('stroke-width', 0.8)

  const beijingCoord = projection([116.4, 39.9])
  if (!beijingCoord) return

  // 绘制连线
  const lineGroup = g.append('g').attr('class', 'connections')

  filteredConnections.value.forEach((conn, index) => {
    const targetCoord = PROVINCE_CENTERS[normalizeProvinceName(conn.province)]
    if (!targetCoord) return
    const target = projection(targetCoord)
    if (!target) return

    const lineWeight = calculateLineWeight(conn.count)
    const color = TRANSPORT_COLORS[conn.type] || '#8D6E63'
    
    // 透明度逻辑：60-70% 半透明
    const baseOpacity = selectedDynasty.value ? 0.9 : 0.65

    // 计算贝塞尔曲线
    // 起点: beijingCoord, 终点: target
    const source = beijingCoord
    const midX = (source[0] + target[0]) / 2
    const midY = (source[1] + target[1]) / 2
    
    // 计算法向量以偏移控制点
    const dx = target[0] - source[0]
    const dy = target[1] - source[1]
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    // 左右对称：全部向上拱 (Opening Down visually means concave down n-shape)
    // West (target < source): Normal is (0,-1) [Up]. Offset + => Up.
    // East (target > source): Normal is (0,1) [Down]. Offset - => Up.
    const isEast = target[0] > source[0]
    const loopOffset = (isEast ? -1 : 1) * dist * 0.15 
    
    // 归一化法向量 (-dy, dx)
    const normalX = -dy / dist
    const normalY = dx / dist
    
    const controlX = midX + loopOffset * normalX
    const controlY = midY + loopOffset * normalY

    // 构建 path d 属性
    // M source Q control target
    const pathD = `M${source[0]},${source[1]} Q${controlX},${controlY} ${target[0]},${target[1]}`

    const path = lineGroup.append('path')
      .attr('d', pathD)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', lineWeight)
      .attr('stroke-opacity', baseOpacity)
      .attr('stroke-linecap', 'round')
      .style('cursor', 'pointer')

    if (conn.type === '航线') {
      path.attr('stroke-dasharray', '5,3')
    }

    path
      .on('mouseenter', function(e) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-width', lineWeight * 1.8)
          .attr('stroke-opacity', 1)

        tooltip.value = {
          show: true,
          x: e.clientX,
          y: e.clientY,
          data: conn
        }
      })
      .on('mousemove', (e) => {
        tooltip.value.x = e.clientX
        tooltip.value.y = e.clientY
      })
      .on('mouseleave', function() {
        // 如果被选中，不恢复透明
        if (selectedConnection.value !== conn) {
           d3.select(this)
            .transition()
            .duration(200)
            .attr('stroke-width', lineWeight)
            .attr('stroke-opacity', baseOpacity)
        }
        tooltip.value.show = false
      })
      .on('click', (e) => {
        e.stopPropagation()
        selectedConnection.value = conn
        // 高亮当前线 (通过重绘或者单独操作太麻烦，依赖对话框关闭清理亦可，
        // 这里简单设置当前不透明)
        d3.select(e.currentTarget).attr('stroke-opacity', 1)
        
        evidenceDialog.value = { show: true, data: conn }
      })
  })

  // 北京中心点
  g.append('circle')
    .attr('cx', beijingCoord[0])
    .attr('cy', beijingCoord[1])
    .attr('r', 4)
    .attr('fill', '#8D6E63')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)

  g.append('text')
    .attr('x', beijingCoord[0])
    .attr('y', beijingCoord[1] - 8)
    .attr('text-anchor', 'middle')
    .attr('fill', '#5D4037')
    .attr('font-size', '11px')
    .attr('font-weight', 'bold')
    .style('text-shadow', '0 1px 2px #fff')
    .text('北京')
}

// ==================== 生命周期 ====================

onMounted(async () => {
  rawData.value = getTransportData()
  allDestinations.value = getInternationalDestinations(rawData.value)
  await loadGeoData()
  nextTick(() => {
    drawMap()
  })
  window.addEventListener('resize', drawMap)
})

onUnmounted(() => {
  window.removeEventListener('resize', drawMap)
})

watch([selectedDynasty, activeTypes, viewMode], () => {
  if (viewMode.value === 'domestic') {
    nextTick(() => drawMap())
  }
}, { deep: true })
</script>

<style scoped>
/* ==================== 面板样式 ==================== */
.arch-panel {
  --font-cn: "Source Han Serif SC", "Noto Serif SC", serif;
  /* 左侧卡片背景：70% + 模糊 */
  background: rgba(233, 233, 233, 0.7);
  backdrop-filter: blur(10px);
  font-family: var(--font-cn);
  border: none;
  border-radius: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ==================== 头部 ==================== */
.panel-header {
  padding: 16px 24px;
  background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%);
  border-bottom: 1px solid #CCC;
}

.header-block {
  width: 6px;
  height: 28px;
  background: var(--accent-brown);
  margin-right: 12px;
}

.header-text-group { display: flex; flex-direction: column; }
.panel-title { font-size: 20px; font-weight: 900; color: #4E342E; margin: 0; letter-spacing: 2px; }
.panel-subtitle { font-size: 10px; color: #795548; letter-spacing: 1px; text-transform: uppercase; }

/* ==================== 视图切换按钮 ==================== */
.view-toggle {
  display: flex;
  background: #D7CCC8;
  border-radius: 4px;
  padding: 2px;
}
.toggle-btn {
  padding: 6px 16px;
  font-size: 13px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 2px;
  color: #5D4037; font-weight: 500;
}
.toggle-btn.active {
  background: #4E342E; color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

/* ==================== 地图容器 ==================== */
.map-container {
  flex: 1;
  position: relative;
  background: #E0E0E0;
  overflow: hidden;
}
.map-container svg { width: 100%; height: 100%; }

.bg-white-translucent {
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(4px);
  border-radius: 4px;
}

.map-legend-floating {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(4px);
  padding: 12px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  font-size: 11px;
  color: #555;
  border: 1px solid #CCC;
}
.legend-group { display: flex; flex-direction: column; gap: 6px; }
.legend-head { font-weight: 700; color: #333; margin-bottom: 4px; letter-spacing: 1px; }
.legend-items-vertical { display: flex; flex-direction: column; gap: 6px; }
.legend-sep-h { height: 1px; background: #DDD; margin: 8px 0; }
.l-item { display: flex; align-items: center; gap: 6px; }
.line-mark { width: 14px; height: 3px; border-radius: 1px; }
.line-mark.dashed { background: repeating-linear-gradient(90deg, currentColor 0px, currentColor 3px, transparent 3px, transparent 6px) !important; }

/* ==================== 瀑布流布局 ==================== */
.cards-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #E0E0E0;
}
.cards-masonry {
  column-count: 5;
  column-gap: 12px;
}
@media (max-width: 1400px) { .cards-masonry { column-count: 4; } }
@media (max-width: 1200px) { .cards-masonry { column-count: 3; } }
@media (max-width: 900px) { .cards-masonry { column-count: 2; } }

.dest-card {
  break-inside: avoid; /* 防止卡片被截断 */
  margin-bottom: 12px;
  background: #F5F5F5;
  border: 1px solid #D7D7D7;
  border-radius: 2px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.dest-card:hover { transform: translateY(-2px); border-color: var(--accent-brown); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
.dest-card.expanded { background: #FFF; border-color: var(--accent-brown); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }

.card-title { font-size: 14px; font-weight: 700; color: #3E2723; }
.card-count { font-size: 10px; color: #795548; background: #D7CCC8; padding: 1px 4px; border-radius: 2px; }

/* ==================== 底部时间轴 ==================== */
.timeline-wrapper {
  padding: 10px 24px;
  background: #D7D7D7;
  border-top: 1px solid #C0C0C0;
}
.dynasty-timeline { display: flex; flex-wrap: wrap; gap: 2px; align-items: center; }
.dynasty-chip { font-family: var(--font-cn); }

/* ==================== Tooltip & Dialog ==================== */
.map-tooltip {
  position: fixed; z-index: 9999;
  background: rgba(62, 39, 35, 0.95);
  color: #fff; padding: 10px 14px;
  border-radius: 2px; pointer-events: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  font-family: var(--font-cn);
}
.font-song { font-family: "Source Han Serif SC", serif !important; }
.border-b-dashed { border-bottom: 1px dashed #DDD; }
</style>
