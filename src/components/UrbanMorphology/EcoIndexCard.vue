<template>
  <v-card class="eco-card" elevation="2">
    <v-card-title class="card-title">
      <span class="title-text">历代生态环境因素贡献图</span>
      <div class="legend">
        <span class="legend-item">
          <span class="legend-color veg"></span>植被指数
        </span>
        <span class="legend-item">
          <span class="legend-color climate"></span>气候适宜度
        </span>
        <span class="legend-item">
          <span class="legend-color water"></span>水系丰沛
        </span>
      </div>
    </v-card-title>
    <v-card-text class="card-content">
      <div ref="chartContainer" class="chart-container"></div>
    </v-card-text>
    
    <!-- Tooltip -->
    <div 
      v-if="tooltip.show" 
      class="custom-tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <div class="tooltip-title">{{ tooltip.title }}</div>
      <div class="tooltip-year">{{ tooltip.year }}</div>
      <div class="tooltip-content">{{ tooltip.content }}</div>
      <div v-if="tooltip.scores" class="tooltip-scores">
        <div class="score-item">
          <span class="score-dot veg"></span>植被: {{ tooltip.scores.veg }}
        </div>
        <div class="score-item">
          <span class="score-dot climate"></span>气候: {{ tooltip.scores.climate }}
        </div>
        <div class="score-item">
          <span class="score-dot water"></span>水系: {{ tooltip.scores.water }}
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as d3 from 'd3'
import { useClimateLinkageStore } from '@/stores/climateLinkageStore'

// 气候联动 Store
const climateLinkageStore = useClimateLinkageStore()

// ==================== 数据定义 ====================

// 生态贡献指数数据（直接使用提供的数据）
const ecoIndexData = [
  { label: "先秦至汉", start: -800, end: 220,  mid: -290, veg: 5, climate: 5, water: 5 },
  { label: "汉至唐",   start: 220,  end: 960,  mid: 590,  veg: 4, climate: 4, water: 4 },
  { label: "辽",       start: 907,  end: 1125, mid: 1016, veg: 4, climate: 3, water: 4 },
  { label: "金",       start: 1115, end: 1234, mid: 1175, veg: 3, climate: 2, water: 5 },
  { label: "元",       start: 1234, end: 1368, mid: 1301, veg: 3, climate: 1, water: 5 },
  { label: "明",       start: 1368, end: 1644, mid: 1506, veg: 2, climate: 3, water: 3 },
  { label: "清",       start: 1644, end: 1912, mid: 1778, veg: 1, climate: 2, water: 3 },
]

// 气候适宜度映射（用于联动匹配）
// climate >= 4 为暖期适宜，climate <= 2 为冷期适宜
const getClimateType = (climateScore) => {
  if (climateScore >= 4) return 'warm'
  if (climateScore <= 2) return 'cold'
  return 'stable'
}

// 植被事件点（从植被.json提取的关键信息）
const vegetationEvents = [
  {
    year: -500,
    dynasty: '先秦',
    title: '永定河上游森林茂密',
    content: '《尚书·禹贡》载大禹"随山刊木"，山西境内山上森林很多，包括今永定河上游流域。',
    type: 'positive'
  },
  {
    year: -100,
    dynasty: '西汉',
    title: '山西饶材竹谷',
    content: '《史记·货殖列传》云："夫山西饶材、竹、谷。"永定河上游流域森林植被茂盛。',
    type: 'positive'
  },
  {
    year: 400,
    dynasty: '魏晋',
    title: '原始森林广布',
    content: '太兴二年大雨，"巨松僵拔，浮于滹沱，东至渤海，原隰之间皆如山积"。流漂巨木百余万根。',
    type: 'positive'
  },
  {
    year: 700,
    dynasty: '隋唐',
    title: '吕梁山森林茂盛',
    content: '武士彟以卖木材发家致富，说明隋唐时吕梁山上森林十分茂盛，为重要木材产地。',
    type: 'positive'
  },
  {
    year: 1000,
    dynasty: '宋辽',
    title: '松林广数千里',
    content: '《晋献契丹全燕之图》标注"松林广数千里"，火山、宁化之间"材木薪炭足以供一路"。',
    type: 'positive'
  },
  {
    year: 1180,
    dynasty: '金',
    title: '⚠️ 砍伐日益严重',
    content: '金元时期永定河中上游仍多森林，但"砍伐取材日益严重"。《卢沟运筏图》记录林木顺河漂运。',
    type: 'negative'  // 转折点！
  },
  {
    year: 1500,
    dynasty: '明',
    title: '平原山间林木繁茂',
    content: '明代山区广泛分布松、柏、槐、杨、楸等林木和栗、核桃等果木。皇陵周围林木尤为繁茂。',
    type: 'positive'
  },
  {
    year: 1800,
    dynasty: '清',
    title: '森林覆盖率下降',
    content: '辽金以来特别是元明清，长期人为破坏，遂成少林地区。至20世纪80年代森林覆盖率仅10.7%。',
    type: 'negative'
  }
]

// ==================== 响应式数据 ====================
const chartContainer = ref(null)
const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  title: '',
  year: '',
  content: '',
  scores: null
})

let svg = null
let resizeObserver = null

// ==================== 颜色配置 ====================
const colors = {
  veg: '#8FBC8F',        // 植被指数 - 浅绿
  vegLight: '#B8D4B8',
  climate: '#87CEEB',    // 气候适宜度 - 天蓝
  climateLight: '#B0E0E6',
  water: '#4682B4',      // 水系丰沛 - 深蓝
  waterLight: '#6495ED',
  eventPositive: '#2E8B57',  // 正面事件 - 深绿
  eventNegative: '#CD5C5C',  // 负面事件 - 印第安红
  text: '#4A4A4A',
  axis: '#999999',
  grid: '#e0e0e0'
}

// ==================== 绑定事件 ====================
const bindEvents = (eventDots, xScale, chartHeight) => {
  eventDots
    .on('mouseenter', (event, d) => {
      const rect = chartContainer.value.getBoundingClientRect()
      tooltip.value = {
        show: true,
        x: event.clientX - rect.left + 10,
        y: event.clientY - rect.top - 10,
        title: d.title,
        year: `${d.dynasty} · ${d.year < 0 ? '前' + Math.abs(d.year) : d.year}年`,
        content: d.content,
        scores: null
      }
      d3.select(event.currentTarget)
        .transition()
        .duration(200)
        .attr('r', 8)
    })
    .on('mouseleave', (event) => {
      tooltip.value.show = false
      d3.select(event.currentTarget)
        .transition()
        .duration(200)
        .attr('r', 5)
    })
}

// ==================== 绑定区域事件 ====================
const bindAreaEvents = (areas, xScale, yScale) => {
  areas
    .on('mouseenter', (event, d) => {
      const rect = chartContainer.value.getBoundingClientRect()
      const data = d.data || d
      tooltip.value = {
        show: true,
        x: event.clientX - rect.left + 10,
        y: event.clientY - rect.top - 10,
        title: data.label,
        year: `${data.start < 0 ? '前' + Math.abs(data.start) : data.start} - ${data.end}年`,
        content: `总贡献分数: ${data.veg + data.climate + data.water}`,
        scores: {
          veg: data.veg,
          climate: data.climate,
          water: data.water
        }
      }
    })
    .on('mouseleave', () => {
      tooltip.value.show = false
    })
}

// ==================== 绑定绑定 ====================
const drawChart = () => {
  if (!chartContainer.value) return
  
  // 清除旧图表
  d3.select(chartContainer.value).selectAll('*').remove()
  
  const containerRect = chartContainer.value.getBoundingClientRect()
  const margin = { top: 20, right: 30, bottom: 50, left: 40 }
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
  const xScale = d3.scaleLinear()
    .domain([-800, 1912])
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
  
  // 为每个数据点创建堆叠数据
  const stackedData = stack(ecoIndexData)
  
  // 创建曲线面积生成器
  const area = d3.area()
    .x(d => xScale(d.data.mid))
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
  
  // 绘制顶部曲线上的数据点和标签
  const topData = stackedData[2]  // veg层是最顶层
  svg.selectAll('.data-point')
    .data(topData)
    .enter()
    .append('circle')
    .attr('class', 'data-point')
    .attr('cx', d => xScale(d.data.mid))
    .attr('cy', d => yScale(d[1]))
    .attr('r', 4)
    .attr('fill', '#fff')
    .attr('stroke', colors.veg)
    .attr('stroke-width', 2)
  
  // 顶部数值标签
  svg.selectAll('.value-label')
    .data(topData)
    .enter()
    .append('text')
    .attr('class', 'value-label')
    .attr('x', d => xScale(d.data.mid))
    .attr('y', d => yScale(d[1]) - 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', '11px')
    .attr('font-weight', '600')
    .attr('fill', colors.text)
    .text(d => d.data.veg + d.data.climate + d.data.water)
  
  // 绘制植被事件点
  const eventY = height * 0.15  // 事件点在图表上部
  
  const eventDots = svg.selectAll('.event-dot')
    .data(vegetationEvents)
    .enter()
    .append('circle')
    .attr('class', 'event-dot')
    .attr('cx', d => xScale(d.year))
    .attr('cy', eventY)
    .attr('r', 5)
    .attr('fill', d => d.type === 'positive' ? colors.eventPositive : colors.eventNegative)
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .style('filter', 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))')
  
  // 绑定事件
  bindEvents(eventDots, xScale, height)
  
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
  
  // 添加交互区域（透明矩形）
  const interactAreas = svg.selectAll('.interact-area')
    .data(ecoIndexData)
    .enter()
    .append('rect')
    .attr('class', 'interact-area')
    .attr('x', d => xScale(d.start))
    .attr('y', 0)
    .attr('width', d => xScale(d.end) - xScale(d.start))
    .attr('height', height)
    .attr('fill', 'transparent')
    .style('cursor', 'pointer')
  
  bindAreaEvents(interactAreas, xScale, yScale)
}

// ==================== 联动高亮更新 ====================
const updateHighlight = () => {
  if (!chartContainer.value) return
  
  const highlightClimate = climateLinkageStore.highlightClimate
  const highlightPeriod = climateLinkageStore.highlightPeriod
  
  // 没有高亮时恢复原样
  if (!highlightClimate && !highlightPeriod) {
    d3.select(chartContainer.value)
      .selectAll('.interact-area')
      .transition()
      .duration(300)
      .attr('fill', 'transparent')
    
    d3.select(chartContainer.value)
      .selectAll('.area-layer')
      .transition()
      .duration(300)
      .attr('opacity', 0.8)
    
    d3.select(chartContainer.value)
      .selectAll('.dynasty-label')
      .transition()
      .duration(300)
      .attr('font-weight', 'normal')
      .attr('fill', colors.text)
    return
  }
  
  // 有高亮时根据条件更新
  d3.select(chartContainer.value)
    .selectAll('.interact-area')
    .each(function(d) {
      let isHighlighted = false
      
      // 检查气候类型匹配
      if (highlightClimate) {
        const type = getClimateType(d.climate)
        if (type === highlightClimate) isHighlighted = true
      }
      
      // 检查朝代匹配
      if (highlightPeriod) {
        if (d.label.includes(highlightPeriod) || 
            (highlightPeriod === '元' && d.label === '元') ||
            (highlightPeriod === '明' && d.label === '明') ||
            (highlightPeriod === '清' && d.label === '清')) {
          isHighlighted = true
        }
      }
      
      d3.select(this)
        .transition()
        .duration(300)
        .attr('fill', isHighlighted ? 'rgba(255, 107, 53, 0.2)' : 'transparent')
    })
  
  // 同时更新朝代标签
  d3.select(chartContainer.value)
    .selectAll('.dynasty-label')
    .each(function(d) {
      let isHighlighted = false
      
      if (highlightClimate) {
        const type = getClimateType(d.climate)
        if (type === highlightClimate) isHighlighted = true
      }
      
      if (highlightPeriod) {
        if (d.label.includes(highlightPeriod) || 
            (highlightPeriod === '元' && d.label === '元') ||
            (highlightPeriod === '明' && d.label === '明') ||
            (highlightPeriod === '清' && d.label === '清')) {
          isHighlighted = true
        }
      }
      
      d3.select(this)
        .transition()
        .duration(300)
        .attr('font-weight', isHighlighted ? 'bold' : 'normal')
        .attr('fill', isHighlighted ? '#FF6B35' : colors.text)
    })
}

// 监听联动状态变化
watch(
  () => [climateLinkageStore.highlightClimate, climateLinkageStore.highlightPeriod],
  () => {
    updateHighlight()
  },
  { immediate: true }
)

// ==================== 生命周期 ====================
onMounted(() => {
  setTimeout(() => {
    drawChart()
    updateHighlight()
  }, 100)
  
  resizeObserver = new ResizeObserver(() => {
    drawChart()
    updateHighlight()
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
.eco-card {
  height: 100%;
  min-height: 280px;
  background: linear-gradient(135deg, #fdfbf9 0%, #f8f6f3 100%);
  border: 1px solid #e8e4df;
  position: relative;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e8e4df;
  background: rgba(255, 255, 255, 0.6);
  flex-wrap: wrap;
  gap: 8px;
}

.title-text {
  font-size: 14px;
  font-weight: 600;
  color: #5D4E37;
  letter-spacing: 0.5px;
}

.legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #666;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-color {
  width: 14px;
  height: 10px;
  border-radius: 2px;
}

.legend-color.veg {
  background: #8FBC8F;
}

.legend-color.climate {
  background: #87CEEB;
}

.legend-color.water {
  background: #4682B4;
}

.card-content {
  padding: 8px 12px;
  height: calc(100% - 52px);
}

.chart-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
}

.custom-tooltip {
  position: absolute;
  background: rgba(93, 78, 55, 0.95);
  color: #fff;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 12px;
  max-width: 300px;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  backdrop-filter: blur(4px);
}

.tooltip-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
  color: #F5DEB3;
}

.tooltip-year {
  font-size: 11px;
  color: #ccc;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
}

.tooltip-content {
  line-height: 1.5;
  color: #eee;
  margin-bottom: 8px;
}

.tooltip-scores {
  display: flex;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.2);
}

.score-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.score-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.score-dot.veg {
  background: #8FBC8F;
}

.score-dot.climate {
  background: #87CEEB;
}

.score-dot.water {
  background: #4682B4;
}

/* Y轴样式 */
:deep(.y-axis) .domain {
  stroke: #999;
}

:deep(.y-axis) .tick line {
  stroke: #999;
}
</style>
