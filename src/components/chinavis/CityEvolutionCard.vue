<template>
  <v-card class="city-flow-chart" elevation="2">
    <!-- 工具栏 -->
    <v-toolbar color="#F8F6F0" density="compact">
      <v-toolbar-title class="text-h6">城势流变</v-toolbar-title>

      <v-spacer></v-spacer>

      <!-- 图例 -->
      <v-chip
        v-for="legend in legends"
        :key="legend.key"
        :color="legend.color"
        :variant="visibleLayers[legend.key] ? 'elevated' : 'outlined'"
        class="mx-1"
        size="small"
        @click="toggleLayer(legend.key)"
      >
        {{ legend.label }}
      </v-chip>

      <!-- 重置按钮 -->
      <v-btn
        icon="mdi-refresh"
        size="small"
        class="ml-2"
        @click="resetView"
      ></v-btn>
    </v-toolbar>

    <!-- 图表容器 -->
    <v-card-text class="pa-0">
      <div ref="chartContainer" class="chart-wrapper"></div>
    </v-card-text>
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
  background: '#F8F6F0'
}

// 图例
const legends = [
  { key: 'populationIncrease', label: '人口增长', color: colors.populationIncrease },
  { key: 'populationDecrease', label: '人口减少', color: colors.populationDecrease },
  { key: 'areaIncrease', label: '面积增加', color: colors.areaIncrease },
  { key: 'areaDecrease', label: '面积减少', color: colors.areaDecrease }
]

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
let tooltip: any
let populationArcs: any[] = []
let areaArcs: any[] = []
let dynasties: any[] = []

// 图表尺寸
const margin = { top: 80, right: 80, bottom: 80, left: 80 }
const width = 1400 - margin.left - margin.right
const height = 600 - margin.top - margin.bottom

// 加载数据
async function loadData() {
  try {
    const response = await fetch(new URL('@/data/population_processed.json', import.meta.url))
    const data = await response.json()

    populationArcs = data.arcs
    dynasties = data.dynasties

    // 生成假面积数据（后续替换为真实数据）
    areaArcs = populationArcs.map(arc => ({
      ...arc,
      areaChange: (Math.random() - 0.5) * 30,
      direction: Math.random() > 0.5 ? 'increase' : 'decrease'
    }))

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

  // 创建SVG
  svg = d3.select(chartContainer.value)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height + margin.top + margin.bottom)
    .style('background-color', colors.background)

  // 创建Tooltip（使用原生div）
  tooltip = d3.select('body')
    .append('div')
    .attr('class', 'chart-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background-color', 'white')
    .style('border', '1px solid #ddd')
    .style('border-radius', '8px')
    .style('padding', '12px')
    .style('box-shadow', '0 4px 6px rgba(0,0,0,0.1)')
    .style('pointer-events', 'none')
    .style('z-index', '10000')
    .style('font-size', '13px')
    .style('max-width', '280px')

  // 创建主绘图区
  gMain = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)

  // 创建比例尺
  const yearExtent = d3.extent(populationArcs, (d: any) => d.startYear)
  xScale = d3.scaleLinear()
    .domain(yearExtent)
    .range([0, width])

  // 人口比例尺（双向，中心为0）
  const maxPopRate = d3.max(populationArcs, (d: any) => Math.abs(d.compressedRate)) || 1
  yPopScale = d3.scaleLinear()
    .domain([-maxPopRate * 1.3, maxPopRate * 1.3])
    .range([height * 0.35, -height * 0.35])

  // 面积比例尺（下半部分）
  const maxAreaChange = d3.max(areaArcs, (d: any) => Math.abs(d.areaChange)) || 20
  yAreaScale = d3.scaleLinear()
    .domain([-maxAreaChange * 1.2, maxAreaChange * 1.2])
    .range([height * 0.85, height * 0.45])

  // 绘制中心线
  gMain.append('line')
    .attr('class', 'center-line')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', height / 2)
    .attr('y2', height / 2)
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
    const y = height / 2 - yPopScale(tick * 0.1)
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
    line.on('mouseover', function(event: any) {
      d3.select(this).attr('stroke', '#666').attr('stroke-width', 2.5)

      tooltip.html(`
        <div style="font-weight: 600; margin-bottom: 4px; color: #333;">${dynasty.name}</div>
        <div style="color: #666;">${dynasty.startYear} - ${dynasty.endYear}</div>
      `)
      .style('visibility', 'visible')
      .style('left', `${event.pageX + 15}px`)
      .style('top', `${event.pageY - 10}px`)
    })
    .on('mousemove', function(event: any) {
      tooltip
        .style('left', `${event.pageX + 15}px`)
        .style('top', `${event.pageY - 10}px`)
    })
    .on('mouseout', function() {
      d3.select(this).attr('stroke', '#d0d0d0').attr('stroke-width', 1.5)
      tooltip.style('visibility', 'hidden')
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
      .y0(height / 2)
      .y1((d: any) => {
        const t = (d.year - arc.startYear) / (arc.endYear - arc.startYear)
        const value = arc.compressedRate * Math.sin(t * Math.PI) * 0.8
        return height / 2 - yPopScale(value)
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
    path.on('mouseover', function(event: any) {
      d3.select(this).attr('opacity', 1).attr('stroke-width', 1)

      const popChange = arc.populationChange
      const sign = popChange >= 0 ? '+' : ''
      const formatted = Math.abs(popChange) >= 10000
        ? `${sign}${(popChange / 10000).toFixed(2)}万人`
        : `${sign}${popChange}人`

      tooltip.html(`
        <div style="font-weight: 600; margin-bottom: 6px; color: #333;">人口变化</div>
        <div style="color: #666; line-height: 1.6;">
          <div>时间：${arc.startYear} - ${arc.endYear}年</div>
          <div>人口变化：${formatted}</div>
          <div>年变化率：${(arc.yearChangeRate * 100).toFixed(3)}%</div>
          <div>跨度：${arc.yearSpan}年</div>
        </div>
      `)
      .style('visibility', 'visible')
      .style('left', `${event.pageX + 15}px`)
      .style('top', `${event.pageY - 10}px`)
    })
    .on('mousemove', function(event: any) {
      tooltip
        .style('left', `${event.pageX + 15}px`)
        .style('top', `${event.pageY - 10}px`)
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.75).attr('stroke-width', 0.5)
      tooltip.style('visibility', 'hidden')
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
      .y0(height / 2)
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

    path.on('mouseover', function(event: any) {
      d3.select(this).attr('opacity', 0.95).attr('stroke-width', 1)

      const sign = arc.areaChange >= 0 ? '+' : ''

      tooltip.html(`
        <div style="font-weight: 600; margin-bottom: 6px; color: #333;">面积变化</div>
        <div style="color: #666; line-height: 1.6;">
          <div>时间：${arc.startYear} - ${arc.endYear}年</div>
          <div>面积变化：${sign}${arc.areaChange.toFixed(2)}平方公里</div>
          <div>跨度：${arc.yearSpan}年</div>
        </div>
      `)
      .style('visibility', 'visible')
      .style('left', `${event.pageX + 15}px`)
      .style('top', `${event.pageY - 10}px`)
    })
    .on('mousemove', function(event: any) {
      tooltip
        .style('left', `${event.pageX + 15}px`)
        .style('top', `${event.pageY - 10}px`)
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.7).attr('stroke-width', 0.5)
      tooltip.style('visibility', 'hidden')
    })
  })
}

// 绘制坐标轴
function drawAxes() {
  // X轴
  const xAxis = d3.axisBottom(xScale)
    .ticks(12)
    .tickFormat((d: any) => {
      if (d === 0) return '0年'
      return d > 0 ? `${d}年` : `公元前${Math.abs(d)}年`
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
    .attr('transform', `translate(0, ${height / 2})`)
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
    .tickFormat((d: any) => `${d.toFixed(0)}`)

  gMain.append('g')
    .attr('class', 'y-area-axis')
    .attr('transform', `translate(${width}, 0)`)
    .call(yAreaAxis)
    .selectAll('text')
    .attr('font-size', '11px')
    .attr('fill', '#666')

  gMain.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height * 0.65)
    .attr('y', width + 55)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', '#555')
    .attr('font-weight', '500')
    .text('面积变化(平方公里)')
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
  // 清理tooltip
  d3.select('.chart-tooltip').remove()
})
</script>

<style scoped>
.city-flow-chart {
  width: 100%;
  background-color: #F8F6F0;
}

.chart-wrapper {
  width: 100%;
  overflow: hidden;
}

:deep(.v-toolbar) {
  border-bottom: 1px solid #e0e0e0;
}

:deep(.v-chip) {
  font-size: 12px;
  font-weight: 500;
}
</style>
