<template>
  <v-card flat class="arch-panel city-evolution-panel">
    <div class="panel-header">
      <v-row align="center" dense no-gutters>
        <v-col cols="auto" class="d-flex align-center">
          <div class="header-block"></div>
          <div class="header-text-group">
            <h2 class="panel-title">北京历代城势流变</h2>
            <span class="panel-subtitle">CITY EVOLUTION OF BEIJING</span>
          </div>
        </v-col>

        <v-spacer></v-spacer>

        <div class="legend-bar">
          <div class="legend-group">
            <span class="legend-head">POPULATION</span>
            <div class="legend-items">
              <v-chip
                label
                size="small"
                class="legend-chip"
                :class="{ 'is-off': !visibleLayers.populationIncrease }"
                :color="colors.populationIncrease"
                :variant="visibleLayers.populationIncrease ? 'elevated' : 'outlined'"
                @click="toggleLayer('populationIncrease')"
              >
                人口增长
              </v-chip>
              <v-chip
                label
                size="small"
                class="legend-chip"
                :class="{ 'is-off': !visibleLayers.populationDecrease }"
                :color="colors.populationDecrease"
                :variant="visibleLayers.populationDecrease ? 'elevated' : 'outlined'"
                @click="toggleLayer('populationDecrease')"
              >
                人口减少
              </v-chip>
            </div>
          </div>

          <div class="legend-sep">/</div>

          <div class="legend-group">
            <span class="legend-head">AREA</span>
            <div class="legend-items">
              <v-chip
                label
                size="small"
                class="legend-chip"
                :class="{ 'is-off': !visibleLayers.areaIncrease }"
                :color="colors.areaIncrease"
                :variant="visibleLayers.areaIncrease ? 'elevated' : 'outlined'"
                @click="toggleLayer('areaIncrease')"
              >
                面积扩张
              </v-chip>
              <v-chip
                label
                size="small"
                class="legend-chip"
                :class="{ 'is-off': !visibleLayers.areaDecrease }"
                :color="colors.areaDecrease"
                :variant="visibleLayers.areaDecrease ? 'elevated' : 'outlined'"
                @click="toggleLayer('areaDecrease')"
              >
                面积收缩
              </v-chip>
            </div>
          </div>
        </div>

        <v-btn
          icon="mdi-refresh"
          size="small"
          variant="text"
          class="ml-2"
          @click="resetView"
        ></v-btn>
      </v-row>
    </div>

    <div class="card-content">
      <div ref="chartContainer" class="chart-container"></div>
    </div>

    <Teleport to="body">
      <Transition name="fade-up">
        <div
          v-if="tooltipState.show"
          class="arch-tooltip"
          :style="{ left: tooltipState.x + 'px', top: tooltipState.y + 'px' }"
        >
          <div class="tt-header">
            <div class="tt-title-row">
              <span class="tt-name">{{ tooltipState.title }}</span>
              <span class="tt-id">{{ tooltipState.subLabel }}</span>
            </div>
          </div>

          <div class="tt-content">
            <div class="info-grid">
              <div v-for="item in tooltipState.items" :key="item.label" class="info-item">
                <span class="label">{{ item.label }}</span>
                <span class="value">{{ item.value }}</span>
              </div>
            </div>

            <div v-if="tooltipState.description" class="tt-divider"></div>
            <p v-if="tooltipState.description" class="tt-description">
              <span class="desc-label">说明：</span>
              {{ tooltipState.description }}
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </v-card>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import * as d3 from 'd3'

// 配色
const colors = {
  populationIncrease: '#DB9E7E',
  populationDecrease: '#9FAAAB',
  areaIncrease: '#E3CFA3',
  areaDecrease: '#C2D1BF',
  background: 'transparent'
}

type TooltipItem = { label: string; value: string }
const tooltipState = reactive({
  show: false,
  x: 0,
  y: 0,
  title: '',
  subLabel: '',
  description: '',
  items: [] as TooltipItem[]
})

function formatYear(year: number) {
  if (year === 0) return '0年'
  return year > 0 ? `${year}年` : `公元前${Math.abs(year)}年`
}

function moveTooltip(event: MouseEvent) {
  tooltipState.x = event.clientX + 14
  tooltipState.y = event.clientY - 10
}

function openTooltip(event: MouseEvent, payload: { title: string; subLabel?: string; items: TooltipItem[]; description?: string }) {
  tooltipState.title = payload.title
  tooltipState.subLabel = payload.subLabel ?? ''
  tooltipState.items = payload.items
  tooltipState.description = payload.description ?? ''
  tooltipState.show = true
  moveTooltip(event)
}

function closeTooltip() {
  tooltipState.show = false
}

type AreaKeyframe = { year: number; areaKm2: number; label: string }

// ✅ 北京城市面积关键节点（城墙/城郭范围口径，单位：km²）
// 说明：早期秦汉-辽缺乏统一公开“面积定值”，用隋唐幽州城复原面积≈12km²做朝代级基准（保证不瞎编）
// ——金/元/明清有更明确的公开表述或权威科普口径
const beijingAreaKeyframes: AreaKeyframe[] = [
  { year: -1050, areaKm2: 0.7, label: '先秦：西周燕都·琉璃河城址（≈0.7 km²）' },
  { year: -221, areaKm2: 12.0, label: '秦汉：蓟城/幽州城体系（按隋唐幽州城复原≈12 km²）' },
  { year: 907, areaKm2: 12.0, label: '魏晋-隋唐-辽：幽州城基准延续（≈12 km²）' },
  { year: 1153, areaKm2: 25.0, label: '金：金中都（≈25 km²）' },
  { year: 1267, areaKm2: 50.0, label: '元：元大都（≈50 km²）' },
  { year: 1421, areaKm2: 35.58, label: '明：明北京内城（≈35.58 km²）' },
  { year: 1553, areaKm2: 60.07, label: '明：修外城后（内城+外城≈60.07 km²）' },
  { year: 1911, areaKm2: 60.07, label: '清末：仍沿用明清城廓（≈60.07 km²）' }
]

function areaAtYear(year: number) {
  const frames = beijingAreaKeyframes
  if (year <= frames[0].year) return frames[0].areaKm2
  if (year >= frames[frames.length - 1].year) return frames[frames.length - 1].areaKm2

  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i], b = frames[i + 1]
    if (year >= a.year && year <= b.year) {
      const t = (year - a.year) / (b.year - a.year)
      return a.areaKm2 + t * (b.areaKm2 - a.areaKm2)
    }
  }
  return frames[frames.length - 1].areaKm2
}

function areaNarrativeAtYear(year: number) {
  if (year < -221) {
    return '先秦早期“都城形态”还很小，是北京地区都城雏形之一，可作为时间轴早期锚点。'
  }
  if (year < 1153) {
    return '秦汉—魏晋—隋唐—辽在“北京核心城址”上多有承继；采用隋唐幽州城复原尺度≈12 km²作统一基准（保证连续性与可核验性）。'
  }
  if (year < 1267) return '金中都：城垣考古/研究中常给出范围约 ≈25 km²，北京城规模第一次明显跃迁。'
  if (year < 1421) return '元大都：权威科普口径常给出“占地约 ≈50 km²”。'
  if (year < 1553) return '明北京城：1421后以内城≈35.58 km²为基准；1553修外城后合计≈60.07 km²。'
  return '清代城廓格局大体承袭明制，采用同一面积锚点≈60.07 km²。'
}

// 图层显示状态
const visibleLayers = reactive({
  populationIncrease: true,
  populationDecrease: true,
  areaIncrease: true,
  areaDecrease: true
})

// 图表容器
const chartContainer = ref<HTMLDivElement | null>(null)

// D3变量
let svg: any, gMain: any, xScale: any, yPopScale: any, yAreaScale: any, zoom: any
let populationArcs: any[] = []
let areaArcs: any[] = []
let dynasties: any[] = []

// 图表尺寸（宽度固定，高度动态获取）
const margin = { top: 40, right: 60, bottom: 50, left: 60 }
const width = 1400 - margin.left - margin.right
let height = 280 // 默认值，会在 initChart 中重新计算
let baselineY = height / 2
let areaBand = height * 0.22

// 加载数据
async function loadData() {
  try {
    const response = await fetch(new URL('@/data/population_processed.json', import.meta.url))
    const data = await response.json()

    populationArcs = data.arcs
    dynasties = data.dynasties

    // ✅ 用真实面积替换模拟（单位：km²）
    areaArcs = populationArcs.map((arc: any) => {
      const startA = areaAtYear(arc.startYear)
      const endA = areaAtYear(arc.endYear)
      const delta = endA - startA

      return {
        ...arc,
        areaStart: startA,
        areaEnd: endA,
        areaChange: delta,
        direction: delta >= 0 ? 'increase' : 'decrease',
        areaNarrative: areaNarrativeAtYear((arc.startYear + arc.endYear) / 2)
      }
    })

    console.log('数据加载成功:', { populationArcs: populationArcs.length, dynasties: dynasties.length })
  } catch (error) {
    console.error('数据加载失败:', error)
  }
}

// 初始化图表
function initChart() {
  if (!chartContainer.value) return

  // 清空容器
  d3.select(chartContainer.value).selectAll('*').remove()

  // 动态获取容器高度
  const containerHeight = chartContainer.value.clientHeight || 300
  height = containerHeight - margin.top - margin.bottom
  baselineY = height / 2
  areaBand = height * 0.22

  // 创建SVG：宽度固定（可横向滚动），高度占满容器
  svg = d3.select(chartContainer.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', containerHeight)
    .style('background-color', colors.background)

  // 创建主绘图区
  gMain = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)

  // 创建分段比例尺（辽代以前压缩，辽代以后拉伸）
  const yearExtent = d3.extent(populationArcs.flatMap((d: any) => [d.startYear, d.endYear])) as [number, number]
  const breakPoint = 1000 // 辽代开始约907年，用1000作为分界点
  const earlyRatio = 0.25 // 早期（辽代以前）占屏幕25%
  const breakX = width * earlyRatio
  
  // 自定义分段比例尺函数
  const scaleFunc = (year: number) => {
    if (year <= breakPoint) {
      const t = (year - yearExtent[0]) / (breakPoint - yearExtent[0])
      return t * breakX
    } else {
      const t = (year - breakPoint) / (yearExtent[1] - breakPoint)
      return breakX + t * (width - breakX)
    }
  }
  
  xScale = scaleFunc as any
  
  // 添加 invert 方法
  xScale.invert = (x: number) => {
    if (x <= breakX) {
      const t = x / breakX
      return yearExtent[0] + t * (breakPoint - yearExtent[0])
    } else {
      const t = (x - breakX) / (width - breakX)
      return breakPoint + t * (yearExtent[1] - breakPoint)
    }
  }
  
  // 添加 domain 和 range 方法
  xScale.domain = () => yearExtent
  xScale.range = () => [0, width]
  
  // 添加 ticks 方法（D3轴需要）
  xScale.ticks = (count: number = 10) => {
    const ticks: number[] = []
    // 早期部分的刻度（较少）
    const earlyTicks = Math.max(2, Math.floor(count * earlyRatio))
    for (let i = 0; i <= earlyTicks; i++) {
      ticks.push(yearExtent[0] + (breakPoint - yearExtent[0]) * i / earlyTicks)
    }
    // 后期部分的刻度（较多）
    const lateTicks = count - earlyTicks
    for (let i = 1; i <= lateTicks; i++) {
      ticks.push(breakPoint + (yearExtent[1] - breakPoint) * i / lateTicks)
    }
    return ticks
  }
  
  // 添加 copy 方法（缩放需要）
  xScale.copy = () => xScale

  // 人口比例尺（双向，中心为0）
  const maxPopRate = d3.max(populationArcs, (d: any) => Math.abs(d.compressedRate)) || 1
  yPopScale = d3.scaleLinear()
    .domain([-maxPopRate * 1.3, maxPopRate * 1.3])
    .range([height * 0.35, -height * 0.35])

  // 面积比例尺（下半部分）
  const maxAreaChange = d3.max(areaArcs, (d: any) => Math.abs(d.areaChange)) || 20
  yAreaScale = d3.scaleLinear()
    .domain([-maxAreaChange * 1.2, maxAreaChange * 1.2])
    .range([baselineY + areaBand, baselineY - areaBand])

  // 绘制中心线
  gMain.append('line')
    .attr('class', 'center-line')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', baselineY)
    .attr('y2', baselineY)
    .attr('stroke', '#ccc')
    .attr('stroke-dasharray', '2,2')
    .attr('stroke-width', 1)

  // 绘制网格
  drawGrid()

  // 绘制朝代分割线
  drawDynastyLines()

  // 绘制面积弧
  drawAreaArcs()

  // 绘制人口弧
  drawPopulationArcs()

  // 绘制坐标轴
  drawAxes()

  // 设置缩放
  setupZoom()
}

// 绘制网格
function drawGrid() {
  const gridGroup = gMain.append('g').attr('class', 'grid').style('opacity', 0.2)

  // 横向网格线
  const yTicks = [-2, -1, 0, 1, 2, 3, 4]
  yTicks.forEach(tick => {
    const y = baselineY + yPopScale(tick * 0.1)
    gridGroup.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke', '#999')
      .attr('stroke-dasharray', '2,2')
  })
}

// 绘制朝代分割线
function drawDynastyLines() {
  const group = gMain.append('g').attr('class', 'dynasty-lines')

  dynasties.forEach((dynasty: any) => {
    const x = xScale(dynasty.startYear)

    // 垂直虚线
    const line = group.append('line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', -20)
      .attr('y2', height + 10)
      .attr('stroke', '#d0d0d0')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')

    // 朝代名称
    group.append('text')
      .attr('x', x)
      .attr('y', -25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#555')
      .attr('font-weight', '500')
      .text(dynasty.name)

    // 交互事件
    line.on('mouseover', function(event: MouseEvent) {
      d3.select(this).attr('stroke', '#666').attr('stroke-width', 2.5)

      openTooltip(event, {
        title: dynasty.name,
        subLabel: 'DYNASTY',
        items: [{ label: '时间', value: `${formatYear(dynasty.startYear)} - ${formatYear(dynasty.endYear)}` }]
      })
    })
    .on('mousemove', function(event: MouseEvent) {
      moveTooltip(event)
    })
    .on('mouseout', function() {
      d3.select(this).attr('stroke', '#d0d0d0').attr('stroke-width', 1.5)
      closeTooltip()
    })
  })
}

// 绘制人口弧
function drawPopulationArcs() {
  const group = gMain.append('g').attr('class', 'population-arcs')

  populationArcs.forEach((arc: any) => {
    const color = arc.direction === 'increase'
      ? colors.populationIncrease
      : colors.populationDecrease

    const layerKey = arc.direction === 'increase'
      ? 'populationIncrease'
      : 'populationDecrease'

    // 使用d3.area生成弧形
    const areaGenerator = d3.area()
      .x((d: any) => xScale(d.year))
      .y0(baselineY)
      .y1((d: any) => {
        const t = (d.year - arc.startYear) / (arc.endYear - arc.startYear)
        const value = arc.compressedRate * Math.sin(t * Math.PI) * 0.8
        return baselineY + yPopScale(value)
      })
      .curve(d3.curveCatmullRom.alpha(0.5))

    // 生成插值点
    const points = d3.range(0, 1.001, 0.02).map(t => ({
      year: arc.startYear + t * (arc.endYear - arc.startYear)
    }))

    const path = group.append('path')
      .datum(points)
      .attr('d', areaGenerator)
      .attr('fill', color)
      .attr('opacity', 0.75)
      .attr('stroke', color)
      .attr('stroke-width', 0.5)
      .attr('data-layer', layerKey)
      .style('cursor', 'pointer')

    // 交互
    path.on('mouseover', function(event: MouseEvent) {
      d3.select(this).attr('opacity', 1).attr('stroke-width', 1)

      const popChange = arc.populationChange
      const sign = popChange >= 0 ? '+' : ''
      const formatted = Math.abs(popChange) >= 10000
        ? `${sign}${(popChange / 10000).toFixed(2)}万人`
        : `${sign}${popChange}人`

      openTooltip(event, {
        title: '人口变化',
        subLabel: arc.dynasty ?? '',
        items: [
          { label: '时间', value: `${formatYear(arc.startYear)} - ${formatYear(arc.endYear)}` },
          { label: '人口变化', value: formatted },
          { label: '年变化率', value: `${(arc.yearChangeRate * 100).toFixed(3)}%` },
          { label: '跨度', value: `${arc.yearSpan}年` }
        ]
      })
    })
    .on('mousemove', function(event: MouseEvent) {
      moveTooltip(event)
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.75).attr('stroke-width', 0.5)
      closeTooltip()
    })
  })
}

// 绘制面积弧
function drawAreaArcs() {
  const group = gMain.append('g').attr('class', 'area-arcs')

  areaArcs.forEach((arc: any) => {
    const color = arc.direction === 'increase'
      ? colors.areaIncrease
      : colors.areaDecrease

    const layerKey = arc.direction === 'increase'
      ? 'areaIncrease'
      : 'areaDecrease'

    const areaGenerator = d3.area()
      .x((d: any) => xScale(d.year))
      .y0(yAreaScale(0))
      .y1((d: any) => {
        const t = (d.year - arc.startYear) / (arc.endYear - arc.startYear)
        const baseValue = arc.areaChange * Math.sin(t * Math.PI) * 0.8
        return yAreaScale(baseValue)
      })
      .curve(d3.curveCatmullRom.alpha(0.5))

    const points = d3.range(0, 1.001, 0.02).map(t => ({
      year: arc.startYear + t * (arc.endYear - arc.startYear)
    }))

    const path = group.append('path')
      .datum(points)
      .attr('d', areaGenerator)
      .attr('fill', color)
      .attr('opacity', 0.7)
      .attr('stroke', color)
      .attr('stroke-width', 0.5)
      .attr('data-layer', layerKey)
      .style('cursor', 'pointer')

    path.on('mouseover', function(event: MouseEvent) {
      d3.select(this).attr('opacity', 0.95).attr('stroke-width', 1)

      const sign = arc.areaChange >= 0 ? '+' : ''
      const startText = `≈${Number(arc.areaStart ?? 0).toFixed(2)} km²`
      const endText = `≈${Number(arc.areaEnd ?? 0).toFixed(2)} km²`

      openTooltip(event, {
        title: '面积变化',
        subLabel: arc.dynasty ?? '',
        items: [
          { label: '时间', value: `${formatYear(arc.startYear)} - ${formatYear(arc.endYear)}` },
          { label: '面积变化', value: `${sign}${Number(arc.areaChange ?? 0).toFixed(2)} km²` },
          { label: '起点面积', value: startText },
          { label: '终点面积', value: endText },
          { label: '跨度', value: `${arc.yearSpan}年` }
        ],
        description: arc.areaNarrative
      })
    })
    .on('mousemove', function(event: MouseEvent) {
      moveTooltip(event)
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.7).attr('stroke-width', 0.5)
      closeTooltip()
    })
  })
}

// 绘制坐标轴
function drawAxes() {
  // X轴
  const xAxis = d3.axisBottom(xScale)
    .ticks(12)
    .tickFormat((d: any) => {
      const year = Math.round(Number(d))
      if (year === 0) return '0年'
      return year > 0 ? `${year}年` : `公元前${Math.abs(year)}年`
    })

  gMain.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height})`)
    .call(xAxis)
    .selectAll('text')
    .attr('font-size', '11px')
    .attr('fill', '#666')

  // 左Y轴（人口）
  const yPopAxis = d3.axisLeft(yPopScale)
    .ticks(6)
    .tickFormat((d: any) => `${(d * 100).toFixed(0)}%`)

  gMain.append('g')
    .attr('class', 'y-pop-axis')
    .attr('transform', `translate(0, ${baselineY})`)
    .call(yPopAxis)
    .selectAll('text')
    .attr('font-size', '11px')
    .attr('fill', '#666')

  gMain.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 4)
    .attr('y', -50)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', '#555')
    .attr('font-weight', '500')
    .text('人口年变化率')

  // 右Y轴（面积）
  const yAreaAxis = d3.axisRight(yAreaScale)
    .ticks(6)
    .tickFormat((d: any) => (d === 0 ? '0' : (d > 0 ? `+${d.toFixed(0)}` : `${d.toFixed(0)}`)))

  gMain.append('g')
    .attr('class', 'y-area-axis')
    .attr('transform', `translate(${width}, 0)`)
    .call(yAreaAxis)
    .selectAll('text')
    .attr('font-size', '11px')
    .attr('fill', '#666')

  gMain.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -baselineY)
    .attr('y', width + 55)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', '#555')
    .attr('font-weight', '500')
    .text('面积变化（km²）')
}

// 设置缩放
function setupZoom() {
  zoom = d3.zoom()
    .scaleExtent([0.5, 20])
    .translateExtent([[-width * 0.5, -height * 0.5], [width * 1.5, height * 1.5]])
    .on('zoom', (event: any) => {
      gMain.attr('transform', `translate(${margin.left}, ${margin.top}) ${event.transform}`)
    })

  svg.call(zoom)
}

// 切换图层显示
function toggleLayer(key: string) {
  visibleLayers[key] = !visibleLayers[key]
  updateLayerVisibility()
}

// 更新图层可见性
function updateLayerVisibility() {
  Object.keys(visibleLayers).forEach(key => {
    const display = visibleLayers[key] ? 'inline' : 'none'
    svg.selectAll(`[data-layer="${key}"]`).style('display', display)
  })
}

// 重置视图
function resetView() {
  if (svg && zoom) {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity)
  }
}

// 监听图层变化
watch(visibleLayers, () => {
  updateLayerVisibility()
}, { deep: true })

// 生命周期
onMounted(async () => {
  await loadData()
  initChart()

  window.addEventListener('resize', initChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', initChart)
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
.legend-sep { color: #CCC; font-weight: 300; }

/* Vuetify 自带 Chip（方形 label） */
:deep(.legend-chip.v-chip) {
  font-family: var(--font-cn);
  font-size: 11px;
  font-weight: 600;
  border-radius: 2px;
  height: 22px;
}

:deep(.legend-chip.is-off) {
  opacity: 0.35;
  filter: grayscale(0.4);
}

.card-content { position: relative; height: calc(100% - 70px); width: 100%; padding: 0 16px; }
.chart-container { width: 100%; height: 100%; }

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
  max-width: 340px;
  color: var(--tooltip-text);
}

.tt-header {
  background: #F0EFEB;
  padding: 12px 16px;
  border-bottom: 1px solid #DAD7D0;
}

.tt-title-row { display: flex; justify-content: space-between; align-items: baseline; }
.tt-name { font-family: var(--font-cn); font-size: 16px; font-weight: 800; color: #1A202C; }
.tt-id { font-family: var(--font-en); font-size: 11px; color: #718096; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tt-content { padding: 14px 16px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.info-item { display: flex; flex-direction: column; }
.info-item .label { font-size: 10px; color: #718096; margin-bottom: 3px; }
.info-item .value { font-size: 13px; font-weight: 600; color: #2D3748; }

.tt-divider { height: 1px; background: #DAD7D0; margin: 10px 0; }
.tt-description { font-size: 13px; line-height: 1.6; color: #4A5568; margin: 0; text-align: justify; }
.desc-label { font-weight: bold; color: #2D3748; }

.fade-up-enter-active, .fade-up-leave-active { transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(8px); }
</style>
