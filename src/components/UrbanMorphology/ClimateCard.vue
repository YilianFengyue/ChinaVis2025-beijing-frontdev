<template>
  <v-card class="climate-card" elevation="2">
    <v-card-title class="card-title">
      <span class="title-text">北京历代气候演变</span>
      <div class="legend">
        <span class="legend-item">
          <span class="legend-color warm"></span>暖期
        </span>
        <span class="legend-item">
          <span class="legend-color cold"></span>冷期
        </span>
        <span class="legend-item">
          <span class="legend-dot"></span>气候事件
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
    </div>
  </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'

// ==================== 数据定义 ====================

// 朝代时间段与冷暖（根据一等奖文档表3）
const dynastyData = [
  { id: 'preqin', label: '先秦', start: -800, end: -221, climate: 'warm' },
  { id: 'qinhan', label: '秦汉', start: -221, end: 220, climate: 'warm' },
  { id: 'weijin', label: '魏晋', start: 220, end: 581, climate: 'cold' },
  { id: 'suitang', label: '隋唐', start: 581, end: 907, climate: 'warm' },
  { id: 'liao', label: '辽', start: 907, end: 1125, climate: 'warm' },
  { id: 'jin', label: '金', start: 1125, end: 1234, climate: 'cold' },
  { id: 'yuan', label: '元', start: 1234, end: 1368, climate: 'cold' },
  { id: 'ming', label: '明', start: 1368, end: 1644, climate: 'cold' },
  { id: 'qing', label: '清', start: 1644, end: 1912, climate: 'cold' },
]

// 气候事件（从气候.json提取）
const climateEvents = [
  {
    year: 1170,
    dynasty: '金',
    title: '十月罕见降雪',
    content: '金世宗大定十年九月初六（10月17日），金中都降雪纷纷。范成大诗云："苦寒不似东篱下，雪满西山把菊看。"此月份降雪实为罕见。',
    type: 'extreme'
  },
  {
    year: 1296,
    dynasty: '元',
    title: '元旦瑞雪',
    content: '元成宗元贞二年元旦大朝会时降雪，王恽吟诗："万宝陈庭未是奇，千官朝处玉为墀。"',
    type: 'snow'
  },
  {
    year: 1324,
    dynasty: '元',
    title: '元旦大雪三尺',
    content: '泰定元年元旦大雪，从初一下到初三。张翥诗云："平地深三尺，飞花大一围。"燕山雪花大如席。',
    type: 'extreme'
  },
  {
    year: 1338,
    dynasty: '元',
    title: '天雨红沙',
    content: '后至元四年四月，"京师天雨红沙，昼晦"，为沙尘暴天气。',
    type: 'dust'
  },
  {
    year: 1367,
    dynasty: '元',
    title: '持续沙尘暴',
    content: '元顺帝至正二十七年三月起，"飞砂扬砾，昏尘蔽天，风势八面俱至，终夜不止"，持续至五月。',
    type: 'dust'
  },
  {
    year: 1890,
    dynasty: '清',
    title: '百年大暴雨',
    content: '光绪十六年五月二十九日后，"大雨滂沱，连宵达旦"，共16天大暴雨，最大日雨量330.5mm，为1841年以来最大值。',
    type: 'flood'
  },
  {
    year: 1801,
    dynasty: '清',
    title: '连续强降雨',
    content: '五月至七月间发生三次强降雨过程，永定河水势狂涨，"上下数百里间一片汪洋，实为数十年来所未见"。',
    type: 'flood'
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
  content: ''
})

let svg = null
let resizeObserver = null

// ==================== 颜色配置 ====================
const colors = {
  warm: '#D4A574',      // 暖期 - 棕橙色
  cold: '#8B9AA3',      // 冷期 - 蓝灰色
  warmLight: '#E8D4BC', // 暖期浅色
  coldLight: '#B8C4CC', // 冷期浅色
  event: '#5D4E37',     // 事件点 - 深棕色
  eventHover: '#8B4513',// 事件点悬停
  text: '#4A4A4A',      // 文字颜色
  axis: '#999999'       // 轴线颜色
}

// ==================== 绑定绑定 ====================
const bindEvents = (eventDots) => {
  eventDots
    .on('mouseenter', (event, d) => {
      const rect = chartContainer.value.getBoundingClientRect()
      tooltip.value = {
        show: true,
        x: event.clientX - rect.left + 10,
        y: event.clientY - rect.top - 10,
        title: d.title,
        year: `${d.dynasty} · ${d.year}年`,
        content: d.content
      }
      d3.select(event.currentTarget)
        .transition()
        .duration(200)
        .attr('r', 8)
        .attr('fill', colors.eventHover)
    })
    .on('mouseleave', (event) => {
      tooltip.value.show = false
      d3.select(event.currentTarget)
        .transition()
        .duration(200)
        .attr('r', 5)
        .attr('fill', colors.event)
    })
}

// ==================== 绑定绑定 ====================
const drawChart = () => {
  if (!chartContainer.value) return
  
  // 清除旧图表
  d3.select(chartContainer.value).selectAll('*').remove()
  
  const containerRect = chartContainer.value.getBoundingClientRect()
  const margin = { top: 30, right: 30, bottom: 50, left: 30 }
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
  
  // Y轴高度（用于条带）
  const bandHeight = height * 0.6
  const bandY = (height - bandHeight) / 2
  
  // 绘制朝代条带
  const bands = svg.selectAll('.dynasty-band')
    .data(dynastyData)
    .enter()
    .append('g')
    .attr('class', 'dynasty-band')
  
  // 条带背景
  bands.append('rect')
    .attr('x', d => xScale(d.start))
    .attr('y', bandY)
    .attr('width', d => xScale(d.end) - xScale(d.start))
    .attr('height', bandHeight)
    .attr('fill', d => d.climate === 'warm' ? colors.warm : colors.cold)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .attr('rx', 3)
    .attr('ry', 3)
    .style('opacity', 0.85)
  
  // 朝代标签
  bands.append('text')
    .attr('x', d => (xScale(d.start) + xScale(d.end)) / 2)
    .attr('y', bandY + bandHeight + 20)
    .attr('text-anchor', 'middle')
    .attr('fill', colors.text)
    .attr('font-size', '11px')
    .attr('font-weight', '500')
    .text(d => d.label)
  
  // 冷暖标注（在条带内）
  bands.append('text')
    .attr('x', d => (xScale(d.start) + xScale(d.end)) / 2)
    .attr('y', bandY + bandHeight / 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#fff')
    .attr('font-size', '12px')
    .attr('font-weight', '600')
    .attr('opacity', 0.9)
    .text(d => d.climate === 'warm' ? '暖' : '冷')
  
  // 绘制事件点
  const eventY = bandY + bandHeight * 0.25  // 事件点在条带上部
  
  const eventDots = svg.selectAll('.event-dot')
    .data(climateEvents)
    .enter()
    .append('circle')
    .attr('class', 'event-dot')
    .attr('cx', d => xScale(d.year))
    .attr('cy', eventY)
    .attr('r', 5)
    .attr('fill', colors.event)
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .style('filter', 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))')
  
  // 绑定事件
  bindEvents(eventDots)
  
  // 添加时间轴刻度
  const timePoints = [-500, 0, 500, 1000, 1500, 1900]
  svg.selectAll('.time-tick')
    .data(timePoints)
    .enter()
    .append('text')
    .attr('x', d => xScale(d))
    .attr('y', bandY + bandHeight + 38)
    .attr('text-anchor', 'middle')
    .attr('fill', colors.axis)
    .attr('font-size', '9px')
    .text(d => d < 0 ? `前${Math.abs(d)}` : d)
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 延迟绑定确保容器已渲染
  setTimeout(() => {
    drawChart()
  }, 100)
  
  // 监听容器大小变化
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
.climate-card {
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

.legend-color.warm {
  background: #D4A574;
}

.legend-color.cold {
  background: #8B9AA3;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5D4E37;
  border: 1.5px solid #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
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
  max-width: 280px;
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
}
</style>