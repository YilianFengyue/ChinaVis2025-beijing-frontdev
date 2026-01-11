<template>
  <v-card flat class="arch-panel">
    <div class="panel-header">
      <v-row align="center" dense no-gutters>
        <v-col cols="auto" class="d-flex align-center">
          <div class="header-block"></div>
          <div class="header-text-group">
            <h2 class="panel-title">历代生态环境因素贡献图</h2>
            <span class="panel-subtitle">ECOLOGICAL FACTOR CONTRIBUTION</span>
          </div>
        </v-col>

        <v-spacer></v-spacer>

        <div class="legend-bar">
          <div class="legend-group">
            <span class="legend-head">INDEX</span>
            <div class="legend-items">
              <span class="l-item"><span class="legend-color veg"></span>植被指数</span>
              <span class="l-item"><span class="legend-color climate"></span>气候适宜度</span>
              <span class="l-item"><span class="legend-color water"></span>水系丰沛</span>
            </div>
          </div>

          <div class="legend-sep">/</div>

          <div class="legend-group">
            <span class="legend-head">EVENT</span>
            <div class="legend-items">
              <span class="l-item"><span class="legend-dot positive"></span>植被记录</span>
              <span class="l-item"><span class="legend-dot negative"></span>退化/干旱</span>
            </div>
          </div>
        </div>
      </v-row>
    </div>

    <div class="card-content">
      <div ref="chartContainer" class="chart-container"></div>
    </div>

    <Teleport to="body">
      <Transition name="fade-up">
        <div
          v-if="tooltip.show"
          class="arch-tooltip"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >
          <div class="tt-header">
            <div class="tt-title-row">
              <span class="tt-name">{{ tooltip.title }}</span>
              <span class="tt-id">{{ tooltip.subLabel }}</span>
            </div>
          </div>

          <div class="tt-note">
            <div class="tt-note-label">ARCHIVE RECORD:</div>
            <p class="tt-note-text">{{ tooltip.note }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'
// 导入线索收集器
import { useClueCollector } from '@/composables/useClueCollector'

const { collectClue } = useClueCollector()

// ==================== 数据定义 ====================

// 生态贡献指数数据（直接使用提供的数据）
const ecoIndexData = [
  { label: "史前",     start: -2500, end: -800, mid: -1650, veg: 5, climate: 5, water: 5 },
  { label: "先秦至汉", start: -800, end: 220,  mid: -290, veg: 5, climate: 5, water: 5 },
  { label: "汉至唐",   start: 220,  end: 907,  mid: 563.5, veg: 4, climate: 4, water: 4 },
  { label: "辽",       start: 907,  end: 1115, mid: 1011,  veg: 4, climate: 3, water: 4 },
  { label: "金",       start: 1115, end: 1234, mid: 1175, veg: 3, climate: 2, water: 5 },
  { label: "元",       start: 1234, end: 1368, mid: 1301, veg: 3, climate: 1, water: 5 },
  { label: "明",       start: 1368, end: 1644, mid: 1506, veg: 2, climate: 3, water: 3 },
  { label: "清",       start: 1644, end: 1912, mid: 1778, veg: 1, climate: 2, water: 3 },
]

// 植被事件点（从植被.json提取的关键信息）
// 植被事件（精简版 - 适合可视化）
const vegetationEvents = [
  // ========== 史前概括 ==========
  {
    year: -2500,
    dynasty: '史前',
    title: '全新世暖湿期·森林草原繁茂',
    content: '距今8000-6500年为中全新世暖湿峰值，气温比今高2-3℃，降水多100-200mm。约3000年前起气候向干凉转化。',
    type: 'positive'
  },

  // ========== 先秦 ==========
  {
    year: -2000,
    dynasty: '先秦',
    title: '大禹"随山刊木"',
    content: '《尚书·禹贡》载大禹治水"随山刊木"，山西境内山上森林很多，包含今永定河上游流域。',
    type: 'positive'
  },

  // ========== 西汉 ==========
  {
    year: -100,
    dynasty: '西汉',
    title: '"山西饶材、竹、谷"',
    content: '《史记·货殖列传》云"夫山西饶材、竹、谷"，永定河上游流域森林植被茂盛。',
    type: 'positive'
  },

  // ========== 魏晋 ==========
  {
    year: 319,
    dynasty: '魏晋',
    title: '暴雨冲漂巨木百万根',
    content: '太兴二年（319）大雨，"巨松僵拔，流漂巨木百余万根"，来自太行山原始森林。',
    type: 'positive'
  },

  // ========== 北魏 ==========
  {
    year: 486,
    dynasty: '北魏',
    title: '"杂树交荫·林渊锦镜"',
    content: '《水经注》载太和十年"夹塘之上，杂树交荫"，"林渊锦镜，缀目日新"。',
    type: 'positive'
  },

  // ========== 隋唐 ==========
  {
    year: 620,
    dynasty: '隋唐',
    title: '鬻材致富·吕梁山森林茂盛',
    content: '武士彟与许文宝以卖木材发家，"常聚材木数万茎"，说明隋唐时吕梁山森林十分茂盛。',
    type: 'positive'
  },
  {
    year: 720,
    dynasty: '唐',
    title: '"求巨木于岚、胜间"',
    content: '开元间长安"近山无巨木，求之岚、胜间"。岚州土产松柏木，石州土产松木。',
    type: 'positive'
  },

  // ========== 宋辽 ==========
  {
    year: 987,
    dynasty: '宋辽',
    title: '"松林广数千里"',
    content: '《晋献契丹全燕之图》标注"松林广数千里"，火山宁化之间"材木薪炭足以供一路"。',
    type: 'positive'
  },

  // ========== 金（⚠️转折点）==========
  {
    year: 1180,
    dynasty: '金',
    title: '⚠️ 砍伐日益严重（转折点）',
    content: '金元时期永定河中上游"仍多森林"，但"砍伐取材日益严重"，为后续植被退化埋下伏笔。',
    type: 'negative'
  },

  // ========== 元 ==========
  {
    year: 1280,
    dynasty: '元',
    title: '设官专督伐木·制度化采伐',
    content: '元代在矾山县、蔚州设砍伐机构，委派官员专督伐木。《卢沟运筏图》记录规模化运输。',
    type: 'negative'
  },

  // ========== 明 ==========
  {
    year: 1450,
    dynasty: '明',
    title: '山区林木广布·皇陵繁茂',
    content: '山区广泛分布松、柏、槐、杨、楸等林木及栗、核桃等果木，明皇陵周围林木尤为繁茂。',
    type: 'positive'
  },

  // ========== 清 ==========
  {
    year: 1750,
    dynasty: '清',
    title: '地名遗存证林木曾广布',
    content: '《大清一统志》所载大量山名地名（"多柏""林木深秀""多产桦树"等）反映历史上林木广泛分布。',
    type: 'positive'
  },

  // ========== 辽金以来总结 ==========
  {
    year: 1850,
    dynasty: '清末',
    title: '长期破坏→少林地区',
    content: '辽金以来特别是元明清，长期人为破坏，北京山区由"森林茂密"逐渐成为少林地区。',
    type: 'negative'
  },

  // ========== 近代 ==========
  {
    year: 1980,
    dynasty: '近代',
    title: '森林覆盖率仅10.7%',
    content: '80年代初调查：森林总面积159.41万亩，覆盖率10.7%。树种以辽东栎林面积最大。',
    type: 'negative'
  },

  // ========== 现代 ==========
  {
    year: 2000,
    dynasty: '现代',
    title: '封山育林·逐渐恢复',
    content: '近年封山育林，植被才逐渐恢复。北京市维管植物2056种，区系成分以华北成分为主。',
    type: 'positive'
  }
]

// 预处理：为事件增加随机Y轴偏移，防止过于整齐
vegetationEvents.forEach(event => {
  event.randomY = (Math.random() - 0.5) * 0.9
})

// ==================== 响应式数据 ====================
const chartContainer = ref(null)
const tooltip = ref({ show: false, x: 0, y: 0, kind: 'event', title: '', subLabel: '', note: '' })

let svg = null
let resizeObserver = null

// ==================== 颜色配置 ====================
const colors = {
  veg: '#B3D6C0',        // 植被指数 - 浅绿
  vegLight: '#B8D4B8',
  climate: '#CEE5F1',    // 气候适宜度 - 天蓝
  climateLight: '#B0E0E6',
  water: '#6495B2',      // 水系丰沛 - 深蓝
  waterLight: '#6495ED',
  eventPositive: '#2E8B57',  // 正面事件 - 深绿
  eventNegative: '#CD5C5C',  // 负面事件 - 印第安红
  eventHover: '#B79157',
  text: '#4A4A4A',
  axis: '#999999',
  grid: '#e0e0e0'
}

// ==================== 绑定事件 ====================
const bindEvents = (eventDots, xScale) => {
  eventDots
    .on('mouseenter', (event, d) => {
      let clientX = event.clientX
      let clientY = event.clientY
      if (document.body.clientWidth - clientX < 320) clientX -= 320

      tooltip.value = {
        show: true,
        kind: 'event',
        x: clientX + 15,
        y: clientY - 80,
        title: d.title,
        subLabel: `${d.dynasty} · ${d.year < 0 ? `前${Math.abs(Math.round(d.year))}` : Math.round(d.year)}年`,
        note: d.content
      }

      d3.select(event.currentTarget)
        .raise()
        .transition()
        .duration(180)
        .attr('r', 8)
        .attr('fill', colors.eventHover)
        .attr('stroke', colors.eventHover)

      const rippleLayer = d3.select(chartContainer.value).select('svg g')
      const cx = xScale(d.year)
      const cy = Number(d3.select(event.currentTarget).attr('cy'))
      rippleLayer
        .append('circle')
        .attr('class', 'event-ripple')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 6)
        .attr('fill', 'none')
        .attr('stroke', colors.eventHover)
        .attr('stroke-width', 2)
        .attr('opacity', 0.7)
        .transition()
        .duration(450)
        .attr('r', 18)
        .attr('opacity', 0)
        .remove()
    })
    .on('mouseleave', (event) => {
      tooltip.value.show = false
      d3.select(event.currentTarget)
        .transition()
        .duration(180)
        .attr('r', 5)
        .attr('fill', d => d.type === 'positive' ? colors.eventPositive : colors.eventNegative)
        .attr('stroke', '#fff')
    })
    .on('dblclick', (event, d) => {
      // 双击收集生态线索
      collectClue({
        title: d.title,
        dynasty: d.dynasty,
        year: d.year,
        content: d.content,
        subLabel: `${d.dynasty} · ${d.year < 0 ? `前${Math.abs(d.year)}` : d.year}年`
      }, 'clue_eco', '生态贡献')
    })
}

// ==================== 绑定绑定 ====================
const drawChart = () => {
  if (!chartContainer.value) return
  
  // 清除旧图表
  d3.select(chartContainer.value).selectAll('*').remove()
  
  const containerRect = chartContainer.value.getBoundingClientRect()
  const margin = { top: 40, right: 30, bottom: 50, left: 30 }
  const width = containerRect.width - margin.left - margin.right
  const height = containerRect.height - margin.top - margin.bottom
  
  if (width <= 0 || height <= 0) return
  
  // 创建SVG
  svg = d3.select(chartContainer.value)
    .append('svg')
    .attr('width', containerRect.width)
    .attr('height', containerRect.height)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
  
  // X轴比例尺（时间）
  const minYear = d3.min(ecoIndexData, d => d.start) ?? -800
  const maxYear = d3.max(ecoIndexData, d => d.end) ?? 1912

  const xScale = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([0, width])
  
  // Y轴比例尺（堆叠值 0-15）
  const yScale = d3.scaleLinear()
    .domain([0, 16])
    .range([height, 0])
  
  // 准备堆叠数据
  const stackKeys = ['water', 'climate', 'veg']
  const stack = d3.stack()
    .keys(stackKeys)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone)
  
  // 用“曲线点”渲染（避免矩形台阶），并在左右端补点填满边界
  const firstSeg = ecoIndexData[0]
  const lastSeg = ecoIndexData[ecoIndexData.length - 1]
  const ecoCurvePoints = [
    { year: minYear, veg: firstSeg.veg, climate: firstSeg.climate, water: firstSeg.water },
    ...ecoIndexData.map(d => ({ year: d.mid, veg: d.veg, climate: d.climate, water: d.water })),
    { year: maxYear, veg: lastSeg.veg, climate: lastSeg.climate, water: lastSeg.water }
  ]

  // 为每个数据点创建堆叠数据
  const stackedData = stack(ecoCurvePoints)
  
  // 创建曲线面积生成器
  const area = d3.area()
    .x(d => xScale(d.data.year))
    .y0(d => yScale(d[0]))
    .y1(d => yScale(d[1]))
    .curve(d3.curveMonotoneX)  // 使用单调曲线使其更平滑
  
  // 颜色映射
  const colorMap = {
    water: colors.water,
    climate: colors.climate,
    veg: colors.veg
  }
  
  // 绘制Y轴网格线
  const yTicks = [0, 3, 6, 9, 12, 15]
  svg.selectAll('.grid-line')
    .data(yTicks)
    .enter()
    .append('line')
    .attr('class', 'grid-line')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', d => yScale(d))
    .attr('y2', d => yScale(d))
    .attr('stroke', colors.grid)
    .attr('stroke-dasharray', '3,3')
    .attr('opacity', 0.7)
  
  // 绘制堆叠面积
  const areas = svg.selectAll('.area-layer')
    .data(stackedData)
    .enter()
    .append('path')
    .attr('class', 'area-layer')
    .attr('d', area)
    .attr('fill', d => colorMap[d.key])
    .attr('opacity', 0.8)
    .attr('stroke', d => colorMap[d.key])
    .attr('stroke-width', 2)
  
  // 绘制植被事件点
  const eventBandY = height * 0.08
  const eventBandHeight = height * 0.22
  const eventsInRange = vegetationEvents.filter(e => e.year >= minYear && e.year <= maxYear)
  
  const eventDots = svg.selectAll('.event-dot')
    .data(eventsInRange)
    .enter()
    .append('circle')
    .attr('class', 'event-dot')
    .attr('cx', d => xScale(d.year))
    .attr('cy', d => eventBandY + eventBandHeight / 2 + d.randomY * eventBandHeight)
    .attr('r', 5)
    .attr('fill', d => d.type === 'positive' ? colors.eventPositive : colors.eventNegative)
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .style('filter', 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))')
  
  // 绑定事件
  bindEvents(eventDots, xScale)
  
  // Y轴
  const yAxis = d3.axisLeft(yScale)
    .tickValues(yTicks)
    .tickSize(-5)
  
  svg.append('g')
    .attr('class', 'y-axis')
    .call(yAxis)
    .selectAll('text')
    .attr('fill', colors.axis)
    .attr('font-size', '10px')
  
  svg.select('.y-axis').selectAll('line')
    .attr('stroke', colors.axis)
  
  svg.select('.y-axis').select('.domain')
    .attr('stroke', colors.axis)
  
  // Y轴标签
  svg.append('text')
    .attr('x', -height / 2)
    .attr('y', -30)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle')
    .attr('fill', colors.text)
    .attr('font-size', '10px')
    .text('贡献分数')
  
  // X轴朝代标签
  svg.selectAll('.dynasty-label')
    .data(ecoIndexData)
    .enter()
    .append('text')
    .attr('class', 'dynasty-label')
    .attr('x', d => xScale(d.mid))
    .attr('y', height + 25)
    .attr('text-anchor', 'middle')
    .attr('fill', colors.text)
    .attr('font-size', '10px')
    .text(d => d.label)

  // 只保留“事件点”交互：不做时间段 hover（避免遮挡 event dots）
}

// ==================== 生命周期 ====================
onMounted(() => {
  setTimeout(() => {
    drawChart()
  }, 100)
  
  resizeObserver = new ResizeObserver(() => {
    drawChart()
  })
  if (chartContainer.value) {
    resizeObserver.observe(chartContainer.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Product+Sans:wght@400;700&display=swap');

.arch-panel {
  --font-en: "Product Sans", sans-serif;
  --font-cn: "Source Han Serif SC", "SimSun", serif;

  --tooltip-bg: #E8E6E2;
  --tooltip-border: #D1CEC7;
  --tooltip-text: #2D3748;
  --highlight: #B79157;

  height: 100%;
  min-height: 380px;
  background: #E9E9E9;
  font-family: var(--font-cn);
  border-radius: 0;
  color: #333;
}

.panel-header {
  padding: 16px 24px;
  background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%);
  border-bottom: 1px solid #DCDCDC;
}

.header-block { width: 6px; height: 32px; background: #2C3E50; margin-right: 12px; }
.panel-title { font-size: 20px; font-weight: 900; color: #212121; letter-spacing: 2px; margin: 0; }
.panel-subtitle { font-family: var(--font-en); font-size: 10px; letter-spacing: 2px; color: #616161; }

.legend-bar { display: flex; align-items: center; gap: 16px; font-family: var(--font-en); }
.legend-head { font-size: 9px; color: #999; font-weight: 700; margin-bottom: 2px; }
.legend-items { display: flex; gap: 12px; }
.l-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #555; font-family: var(--font-cn); }
.legend-sep { color: #CCC; font-weight: 300; }

.legend-color { width: 12px; height: 12px; border-radius: 2px; border: 1px solid rgba(0,0,0,0.08); }
.legend-color.veg { background: #B3D6C0; }
.legend-color.climate { background: #CEE5F1; }
.legend-color.water { background: #6495B2; }

.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-dot.positive { background: #2E8B57; }
.legend-dot.negative { background: #CD5C5C; }

.card-content { position: relative; height: calc(100% - 70px); width: 100%; padding: 0 16px; }
.chart-container { width: 100%; height: 100%; }

/* ==================== Tooltip (Blueprint style) ==================== */
.fade-up-enter-active, .fade-up-leave-active { transition: all 0.2s ease-out; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(6px); }

.arch-tooltip {
  position: fixed;
  z-index: 99999;
  width: 280px;
  background: #E8E6E2; /* 浅灰色背景，不透明 */
  color: #333;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  border-left: 3px solid #EFD160; /* 金色左边框 */
  pointer-events: none;
  font-family: var(--font-en);
}

.tt-header { border-bottom: 1px solid #CCC; padding-bottom: 8px; margin-bottom: 12px; background: #F0EFEB; padding: 12px 16px; margin: -16px -16px 12px -16px; }
.tt-title-row { display: flex; justify-content: space-between; align-items: baseline; }
.tt-name { font-family: var(--font-cn); font-size: 18px; font-weight: 700; color: #333; }
.tt-id { font-size: 10px; color: #666; font-family: var(--font-en); }

/* 保留结构类名以便未来扩展 */
.tt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.tt-item { display: flex; flex-direction: column; }
.tt-item.full { grid-column: span 2; }
.tt-label { font-size: 9px; color: #888; letter-spacing: 1px; margin-bottom: 2px; font-weight: 700; font-family: var(--font-en); }
.tt-value { font-size: 13px; color: #333; font-family: var(--font-cn); }
.highlight-gold { color: var(--highlight); font-weight: 800; }

.tt-note { background: #F0EFEB; padding: 10px; border-radius: 2px; border: 1px solid rgba(0,0,0,0.06); }
.tt-note-label { font-size: 9px; color: #666; margin-bottom: 4px; font-family: var(--font-en); font-weight: 700; }
.tt-note-text { font-size: 11px; line-height: 1.5; color: #444; font-family: var(--font-cn); text-align: justify; margin: 0; }

/* Y轴样式 */
:deep(.y-axis) .domain {
  stroke: #999;
}

:deep(.y-axis) .tick line {
  stroke: #999;
}
</style>
