<template>
  <v-card flat class="arch-panel">
    <div class="panel-header">
      <v-row align="center" dense no-gutters>
        <v-col cols="auto" class="d-flex align-center">
          <div class="header-block"></div>
          <div class="header-text-group">
            <h2 class="panel-title">北京历代气候演变</h2>
            <span class="panel-subtitle">CLIMATE EVOLUTION OF BEIJING</span>
          </div>
        </v-col>
        
        <v-spacer></v-spacer>

        <div class="legend-bar">
          <div class="legend-group">
            <span class="legend-head">CLIMATE</span>
            <div class="legend-items">
              <span class="l-item">
                <span class="legend-color warm"></span>
                暖期
              </span>
              <span class="l-item">
                <span class="legend-color cold"></span>
                冷期
              </span>
            </div>
          </div>

          <div class="legend-sep">/</div>

          <div class="legend-group">
            <span class="legend-head">EVENT</span>
            <div class="legend-items">
              <span class="l-item">
                <span class="legend-dot"></span>
                气候事件
              </span>
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

          <div class="tt-content">
            <div v-if="tooltip.type === 'dynasty'" class="tt-dynasty-info">
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">温度倾向</span>
                  <span class="value" :class="tooltip.data.climate === 'warm' ? 't-warm' : 't-cold'">
                    {{ tooltip.data.tempSummary }}
                  </span>
                </div>
                <div class="info-item">
                  <span class="label">干湿倾向</span>
                  <span class="value">{{ tooltip.data.wetDrySummary }}</span>
                </div>
              </div>
              <div class="tt-divider"></div>
              <p class="tt-description">
                <span class="desc-label">叙事要点：</span>
                {{ tooltip.data.description }}
              </p>
            </div>

            <div v-else class="tt-event-info">
               <div class="event-meta">
                 <span class="event-tag">{{ tooltip.typeText }}</span>
                 <span class="event-dynasty">所属时期：{{ tooltip.dynasty }}</span>
               </div>
               <p class="tt-description">{{ tooltip.content }}</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'

// ==================== 1. 完整详实的数据源 ====================

const dynastyData = [
  { 
    id: 'preqin', label: '先秦', start: -800, end: -221, climate: 'warm', // 注：虽然总体转凉，但归类为相对暖期背景
    tempSummary: '总体较凉 (暖湿→凉干)',
    wetDrySummary: '由暖湿向凉干过渡',
    description: '处在由暖湿走向凉干的大背景里。北京本地呈现“中期偏暖湿→晚期转凉干”的特征，是后世气候波动的背景板。'
  },
  { 
    id: 'qinhan', label: '秦汉', start: -221, end: 220, climate: 'warm',
    tempSummary: '偏暖 (相对温暖时段)',
    wetDrySummary: '干湿波动 / 极端频发',
    description: '中国在公元1–200年属于相对温暖时段。虽然总体偏暖，但华北在100–150年间出现过重大的极端旱涝多发时段。'
  },
  { 
    id: 'weijin', label: '魏晋', start: 220, end: 581, climate: 'cold',
    tempSummary: '总体偏冷 (起伏较大)',
    wetDrySummary: '干湿波动 (区域差异大)',
    description: '271–840年冷暖相间但总体偏冷，覆盖魏晋南北朝大部。史料记录区域差异较大，是一段漫长的冷暖起伏期。'
  },
  { 
    id: 'suitang', label: '隋唐', start: 581, end: 907, climate: 'warm',
    tempSummary: '偏暖 (盛世暖期)',
    wetDrySummary: '波动复杂 / 旱涝共存',
    description: '盛世气候底盘偏暖（551–760为温暖时段）。但华北在550–650年间有重大极端旱涝多发窗口，与盛世并行。'
  },
  { 
    id: 'liao', label: '辽', start: 907, end: 1125, climate: 'warm',
    tempSummary: '偏暖',
    wetDrySummary: '总体偏干',
    description: '处在温暖阶段内，但东中部地区（1000–1240）总体偏干。呈现出“温度高、湿度低”的独特组合特征。'
  },
  { 
    id: 'jin', label: '金', start: 1125, end: 1234, climate: 'cold', // 这里的冷暖划分依据主要趋势
    tempSummary: '偏暖转冷',
    wetDrySummary: '偏干',
    description: '总体偏干覆盖了金代大部。华北在1050–1100年有一次重大极端旱涝多发窗口，叠加在辽金交界附近。'
  },
  { 
    id: 'yuan', label: '元', start: 1234, end: 1368, climate: 'cold',
    tempSummary: '转折期 (暖→冷)',
    wetDrySummary: '总体偏湿',
    description: '气候关键转折期。1291–1910进入寒冷阶段，元代横跨此临界点。东中部在1240–1420总体偏湿。'
  },
  { 
    id: 'ming', label: '明', start: 1368, end: 1644, climate: 'cold',
    tempSummary: '偏冷 (小冰期)',
    wetDrySummary: '干湿强波动 / 晚明大旱',
    description: '处在寒冷阶段内。1420–1540偏干，1540–1690总体偏湿；晚明出现多次毁灭性的持续大旱（如1637–1643崇祯大旱）。'
  },
  { 
    id: 'qing', label: '清', start: 1644, end: 1912, climate: 'cold',
    tempSummary: '偏冷',
    wetDrySummary: '相对偏湿 / 晚清大旱',
    description: '冷背景下，19世纪极端旱涝密集。华北1850–1900年灾害多发，晚清亦有“丁戊奇荒”等持续大旱事件。'
  },
]

const climateEvents = [
  { year: 1170, dynasty: '金', title: '重阳节罕见降雪', content: '大定十年九月初六（10月17日），中都降雪纷纷。范成大诗云："苦寒不似东篱下，雪满西山把菊看。"', type: 'snow' },
  { year: 1296, dynasty: '元', title: '元旦朝会瑞雪', content: '元贞二年元旦大朝会适逢降雪，王恽诗曰："万宝陈庭未是奇，千官朝处玉为墀。"', type: 'snow' },
  { year: 1324, dynasty: '元', title: '元旦大雪深三尺', content: '泰定元年元旦大雪，从初一下到初三。张翥诗云："几岁无此雪，南国见应稀。平地深三尺，飞花大一围。"', type: 'extreme' },
  { year: 1338, dynasty: '元', title: '天雨红沙·昼晦', content: '后至元四年四月，"京师天雨红沙，昼晦"。此为短时沙尘暴天气记录。', type: 'dust' },
  { year: 1367, dynasty: '元', title: '沙尘暴持续两月', content: '至正二十七年三月起，"飞砂扬砾，昏尘蔽天"，至五月乃止。', type: 'dust' },
  { year: 1890, dynasty: '清', title: '光绪大水·首雨', content: '光绪十六年五月二十日起，大雨淋漓，永定河水势渐长。', type: 'flood' },
  { year: 1890.1, dynasty: '清', title: '光绪大水·暴雨', content: '五月二十九日至六月初三，连续5昼夜暴雨。平地水深二丈余。', type: 'extreme' },
  { year: 1890.3, dynasty: '清', title: '日雨量破纪录', content: '最大一天雨量330.5毫米，为1841年有记录以来最大值。', type: 'extreme' }
]

// 预处理：为事件增加随机Y轴偏移，防止重叠过于死板
climateEvents.forEach(event => {
  // 范围控制在 -0.4 到 0.4 之间，确保在条带内部
  event.randomY = (Math.random() - 0.5) * 0.8 
})

// ==================== 2. 核心逻辑与配置 ====================
const chartContainer = ref(null)
const tooltip = ref({ show: false, x: 0, y: 0, type: 'event', title: '', subLabel: '', dynasty: '', content: '', typeText: '', data: {} })
let svg = null
let resizeObserver = null

// 颜色配置：莫兰迪高级灰 + 历史感配色
const colors = {
  // 暖色系（更丰富的层次）
  warmBase: '#F2EFE9', 
  warmBlobs: ['#E6DCCF', '#DBC8B0', '#C4B296', '#E3D5C3', '#D4C4B7'], 
  
  // 冷色系（更丰富的层次）
  coldBase: '#EDF2F4', 
  coldBlobs: ['#D1DEE6', '#B2CCD6', '#94B8C7', '#A9BCC7', '#C4D6E0'],
  
  textMain: '#5D606B',    
  textSub: '#889396',     // 灰色，用于中间的大字
  axis: '#A0AEC0',
  event: '#4A5568',
  eventHover: '#B79157',  // 交互高亮色（暗金）
}

const getTypeText = (type) => {
  const map = { 'snow': '降雪', 'extreme': '极端天气', 'dust': '沙尘暴', 'flood': '洪涝' }
  return map[type] || '气候事件'
}

// ==================== 3. 复杂的随机光斑生成逻辑 (恢复重工) ====================
/**
 * 生成“有机”光斑配置。
 * 不再是简单的圆，而是通过组合多个位置、大小、透明度不一的层，
 * 配合SVG的高斯模糊，形成云雾状的不规则渐变。
 */
const generateOrganicBlobs = (widthRatio = 1) => {
  // 基础数量增加，营造复杂感
  const count = Math.floor(Math.random() * 4) + 5 
  const blobs = []
  
  for (let i = 0; i < count; i++) {
    blobs.push({
      // 允许超出一点边界(-10%到110%)，这样边缘更自然
      cx: (Math.random() * 120 - 10) + '%', 
      cy: (Math.random() * 120 - 10) + '%',
      // 半径随机范围大
      r: (Math.random() * 60 + 30) + '%',
      // 透明度低，以此叠加出层次
      opacity: Math.random() * 0.3 + 0.15 
    })
  }
  return blobs
}

// 初始化时生成一次，避免resize时闪烁
dynastyData.forEach(d => { d.blobs = generateOrganicBlobs() })

// ==================== 4. D3 绘图逻辑 ====================
const drawChart = () => {
  if (!chartContainer.value) return
  d3.select(chartContainer.value).selectAll('*').remove()
  
  const containerRect = chartContainer.value.getBoundingClientRect()
  const margin = { top: 40, right: 30, bottom: 50, left: 30 }
  const width = containerRect.width - margin.left - margin.right
  const height = containerRect.height - margin.top - margin.bottom
  
  if (width <= 0 || height <= 0) return
  
  svg = d3.select(chartContainer.value).append('svg')
    .attr('width', containerRect.width)
    .attr('height', containerRect.height)
  
  const defs = svg.append('defs')
  
  // === 滤镜逻辑：强力高斯模糊，制造“弥散感” ===
  const blurFilter = defs.append('filter')
    .attr('id', 'heavy-blur')
    .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
  
  blurFilter.append('feGaussianBlur')
    .attr('in', 'SourceGraphic')
    .attr('stdDeviation', '25') // 很大的模糊半径，让圆形融化成云
    .attr('result', 'blur')

  const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)
  
  // 比例尺
  const xScale = d3.scaleLinear().domain([-800, 1912]).range([0, width])
  
  // === 矩形高度调整：加高 ===
  // 之前是 0.6 或 0.7，现在加到 0.85，视觉冲击力更强
  const bandHeight = height * 0.85
  const bandY = (height - bandHeight) / 2
  
  // --- 1. 绘制朝代背景层 (Groups) ---
  const dynastyGroups = g.selectAll('.dynasty-group')
    .data(dynastyData)
    .enter()
    .append('g')
    .attr('class', 'dynasty-group')
    .style('cursor', 'default')

  // --- 2. 剪切路径逻辑 (确保模糊的光斑不溢出该朝代的时间段) ---
  dynastyGroups.each(function(d, i) {
    const group = d3.select(this)
    const w = Math.max(2, xScale(d.end) - xScale(d.start)) // 最小宽度2防止消失
    const x = xScale(d.start)
    const clipId = `clip-${d.id}-${i}`
    
    // 定义ClipPath
    defs.append('clipPath').attr('id', clipId)
      .append('rect')
      .attr('x', x).attr('y', bandY)
      .attr('width', w).attr('height', bandHeight)
      // .attr('rx', 4) // 直角还是圆角？历史题材直角更庄重
    
    // 创建应用了Clip的子Group
    const clippedGroup = group.append('g')
      .attr('clip-path', `url(#${clipId})`)
      // 增加交互层
      .attr('class', 'interactive-area')
    
    // A. 基础底色 rect
    const bgRect = clippedGroup.append('rect')
      .attr('class', 'bg-base')
      .attr('x', x).attr('y', bandY)
      .attr('width', w).attr('height', bandHeight)
      .attr('fill', d.climate === 'warm' ? colors.warmBase : colors.coldBase)
      .style('transition', 'filter 0.3s ease') // CSS过渡用于Hover
    
    // B. 复杂的随机光斑渲染
    d.blobs.forEach((blob, idx) => {
      const palette = d.climate === 'warm' ? colors.warmBlobs : colors.coldBlobs
      // 将百分比转换为当前块内的绝对坐标
      const cxAbs = x + (parseFloat(blob.cx) / 100) * w
      const cyAbs = bandY + (parseFloat(blob.cy) / 100) * bandHeight
      // 半径相对于较短边计算，防止过扁
      const rAbs = Math.min(w, bandHeight) * (parseFloat(blob.r) / 100)
      
      clippedGroup.append('circle')
        .attr('cx', cxAbs)
        .attr('cy', cyAbs)
        .attr('r', rAbs)
        .attr('fill', palette[idx % palette.length])
        .style('filter', 'url(#heavy-blur)') // 应用强模糊
        .style('opacity', blob.opacity)
        .style('mix-blend-mode', 'multiply') // 混合模式增加质感
        .style('pointer-events', 'none')
    })

    // === 交互事件绑定 ===
    // 绑定在 clippedGroup 或 bgRect 上
    clippedGroup
      .on('mouseenter', (event) => {
        // 高亮反馈
        d3.select(event.currentTarget).select('.bg-base')
          .style('filter', 'brightness(0.95) contrast(1.1)')
        
        // Tooltip定位
        let clientX = event.clientX
        let clientY = event.clientY
        if (document.body.clientWidth - clientX < 320) clientX -= 320 

        tooltip.value = {
          show: true,
          type: 'dynasty',
          x: clientX + 20,
          y: clientY - 60,
          title: d.label,
          subLabel: `${d.start < 0 ? '前'+Math.abs(d.start) : d.start} — ${d.end}`,
          data: {
            climate: d.climate,
            tempSummary: d.tempSummary,
            wetDrySummary: d.wetDrySummary,
            description: d.description
          }
        }
      })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).select('.bg-base')
          .style('filter', null)
        tooltip.value.show = false
      })
  })

  // --- 3. 辅助元素绘制 ---

  // 分割线 (虚线，贯穿)
  dynastyGroups.append('line')
    .attr('x1', d => xScale(d.end)).attr('x2', d => xScale(d.end))
    .attr('y1', bandY).attr('y2', bandY + bandHeight)
    .attr('stroke', '#FFF').attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,2')
    .attr('opacity', 0.6)

  // 朝代名称 (底部)
  dynastyGroups.append('text')
    .attr('x', d => (xScale(d.start) + xScale(d.end)) / 2)
    .attr('y', bandY + bandHeight + 24)
    .attr('text-anchor', 'middle')
    .attr('fill', colors.textMain)
    .attr('font-size', '13px')
    .attr('font-weight', '600')
    .style('font-family', '"Source Han Serif SC", serif')
    .style('pointer-events', 'none')
    .text(d => d.label)
  
  // 冷/暖 大字标识 (中间，灰色，半透明)
  dynastyGroups.append('text')
    .attr('x', d => (xScale(d.start) + xScale(d.end)) / 2)
    .attr('y', bandY + bandHeight / 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', colors.textSub) 
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .style('font-family', '"Source Han Serif SC", serif')
    .style('opacity', 0.5) // 淡淡的印在背景上
    .style('pointer-events', 'none')
    .text(d => d.climate === 'warm' ? '暖' : '冷')
  
  // --- 4. 气候事件点 (放在最上层) ---
  const eventDots = g.selectAll('.event-dot')
    .data(climateEvents)
    .enter()
    .append('circle')
    .attr('class', 'event-dot')
    .attr('cx', d => xScale(d.year))
    .attr('cy', d => bandY + bandHeight / 2 + d.randomY * bandHeight) // 利用随机Y值
    .attr('r', 5)
    .attr('fill', colors.event)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))')
  
  // 事件点的交互 (注意stopPropagation)
  eventDots
    .on('mouseenter', (event, d) => {
      event.stopPropagation() // 阻止冒泡，不触发背景的tooltip
      
      let clientX = event.clientX
      let clientY = event.clientY
      if (document.body.clientWidth - clientX < 320) clientX -= 320

      tooltip.value = {
        show: true,
        type: 'event',
        x: clientX + 15,
        y: clientY - 80,
        title: d.title,
        subLabel: d.year > 0 ? `${Math.floor(d.year)}年` : `前${Math.abs(d.year)}年`,
        dynasty: d.dynasty,
        content: d.content,
        typeText: getTypeText(d.type)
      }
      
      d3.select(event.currentTarget)
        .transition().duration(200)
        .attr('r', 8)
        .attr('fill', colors.eventHover)
        .attr('stroke', colors.eventHover)
    })
    .on('mouseleave', (event) => {
      tooltip.value.show = false
      d3.select(event.currentTarget)
        .transition().duration(200)
        .attr('r', 5)
        .attr('fill', colors.event)
        .attr('stroke', '#fff')
    })
  
  // --- 5. 时间轴刻度 ---
  const timePoints = [-500, 0, 500, 1000, 1500, 1900]
  
  // 轴线
  g.append('line')
    .attr('x1', 0).attr('x2', width)
    .attr('y1', bandY + bandHeight + 40).attr('y2', bandY + bandHeight + 40)
    .attr('stroke', colors.axis).attr('stroke-width', 0.5).attr('opacity', 0.5)

  // 刻度
  const ticks = g.selectAll('.time-tick').data(timePoints).enter()
    .append('g').attr('transform', d => `translate(${xScale(d)}, ${bandY + bandHeight + 40})`)
  
  ticks.append('line').attr('y1', -3).attr('y2', 3).attr('stroke', colors.axis)
  ticks.append('text').attr('y', 15).attr('text-anchor', 'middle')
    .attr('fill', colors.axis).attr('font-size', '10px')
    .style('font-family', 'var(--font-en)')
    .text(d => d < 0 ? `BC ${Math.abs(d)}` : d)
}

// ==================== 生命周期 ====================
onMounted(() => {
  setTimeout(drawChart, 100) // 稍作延迟确保DOM宽高已就绪
  resizeObserver = new ResizeObserver(drawChart)
  if (chartContainer.value) resizeObserver.observe(chartContainer.value)
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Product+Sans:wght@400;700&display=swap');

.arch-panel {
  --font-en: "Product Sans", sans-serif;
  --font-cn: "Source Han Serif SC", "SimSun", serif; 
  
  /* 核心颜色变量 */
  --tooltip-bg: #E8E6E2; /* 纸张灰 */
  --tooltip-border: #D1CEC7;
  --tooltip-text: #2D3748;
  --highlight: #B79157;
  
  height: 100%;
  min-height: 380px; /* 增加最小高度，保证有足够空间展示加高的矩形 */
  background: #E9E9E9;
  font-family: var(--font-cn);
  border-radius: 0;
  color: #333;
}

/* 头部样式 */
.panel-header {
  padding: 16px 24px;
  background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%);
  border-bottom: 1px solid #DCDCDC;
}
.header-block { width: 6px; height: 32px; background: #2C3E50; margin-right: 12px; }
.panel-title { font-size: 20px; font-weight: 900; color: #212121; letter-spacing: 2px; margin: 0; }
.panel-subtitle { font-family: var(--font-en); font-size: 10px; letter-spacing: 2px; color: #616161; }

/* 图例样式 */
.legend-bar { display: flex; align-items: center; gap: 16px; font-family: var(--font-en); }
.legend-head { font-size: 9px; color: #999; font-weight: 700; margin-bottom: 2px; }
.legend-items { display: flex; gap: 12px; }
.l-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #555; font-family: var(--font-cn); }
.legend-sep { color: #CCC; font-weight: 300; }
.legend-color { width: 12px; height: 12px; border-radius: 2px; }
.legend-color.warm { background: #E3D5C3; border: 1px solid #CCC; }
.legend-color.cold { background: #CBD5E0; border: 1px solid #CCC; }
.legend-dot { width: 8px; height: 8px; background: #4A5568; border-radius: 50%; }

/* 内容区域 */
.card-content { position: relative; height: calc(100% - 70px); width: 100%; padding: 0 16px; }
.chart-container { width: 100%; height: 100%; }

/* ==================== Tooltip 样式 (无磨砂/实体色) ==================== */
.arch-tooltip {
  position: fixed;
  background: var(--tooltip-bg);
  border: 1px solid var(--tooltip-border);
  padding: 0;
  border-radius: 2px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15); 
  pointer-events: none;
  z-index: 99999;
  min-width: 260px;
  max-width: 320px;
  color: var(--tooltip-text);
  /* 移除 backdrop-filter */
}

.tt-header {
  background: rgba(0,0,0,0.03); 
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.tt-title-row { display: flex; justify-content: space-between; align-items: baseline; }
.tt-name { font-family: var(--font-cn); font-size: 16px; font-weight: 800; color: #1A202C; }
.tt-id { font-family: var(--font-en); font-size: 11px; color: #718096; }

.tt-content { padding: 14px 16px; }

/* Tooltip内容排版 */
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.info-item { display: flex; flex-direction: column; }
.info-item .label { font-size: 10px; color: #718096; margin-bottom: 3px; }
.info-item .value { font-size: 13px; font-weight: 600; color: #2D3748; }

.t-warm { color: #A08153; } /* 暖色文字稍微带点褐 */
.t-cold { color: #4A6E82; } /* 冷色文字稍微带点蓝 */

.tt-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 10px 0; }

.tt-description { font-size: 13px; line-height: 1.6; color: #4A5568; margin: 0; text-align: justify; }
.desc-label { font-weight: bold; color: #2D3748; }

/* 事件Tag */
.event-meta { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
.event-tag { background: #4A5568; color: #fff; padding: 2px 6px; border-radius: 2px; font-size: 10px; }
.event-dynasty { font-size: 12px; color: #718096; font-weight: bold; }

/* 动画 */
.fade-up-enter-active, .fade-up-leave-active { transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(8px); }
</style>