<template>
  <v-card flat :ripple="false" class="property-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <v-row align="center" dense no-gutters>
        <v-col cols="auto" class="d-flex align-center">
          <div class="header-block"></div>
          <div class="header-text-group">
            <h2 class="panel-title">物产结构</h2>
            <span class="panel-subtitle">RESOURCE STRUCTURE</span>
          </div>
        </v-col>

        <v-spacer></v-spacer>

        <v-col cols="auto">
          <div class="dynasty-selector">
            <span class="selector-label">PERIOD</span>
            <select v-model="selectedDynasty" class="arch-select">
              <option v-for="d in dynastyList" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
        </v-col>
      </v-row>
    </div>

    <!-- 主体：左环图 + 右条形图 -->
    <div class="chart-body">
      <!-- 左侧：环形图 -->
      <div ref="donutContainer" class="donut-section">
        <svg ref="donutSvg"></svg>
        <!-- 中心信息 -->
        <div class="center-info">
          <span class="center-dynasty">{{ selectedDynasty }}</span>
          <span class="center-count">{{ currentData?.record_count || 0 }} 条</span>
          <span v-if="selectedClass" class="center-class">{{ selectedClass }}</span>
        </div>
      </div>

      <!-- 右侧：条形图 -->
      <div ref="barContainer" class="bar-section">
        <div v-if="!selectedClass" class="bar-placeholder">
          <span class="placeholder-icon">←</span>
          <span class="placeholder-text">点击左侧扇区<br>查看子类分布</span>
        </div>
        <svg v-show="selectedClass" ref="barSvg"></svg>
      </div>
    </div>

    <!-- 底部图例 -->
    <div class="legend-footer">
      <div class="legend-items">
        <span 
          v-for="cls in CLASS_ORDER" 
          :key="cls"
          class="legend-item"
          :class="{ active: selectedClass === cls, dimmed: selectedClass && selectedClass !== cls }"
          @click="handleClassClick(cls)"
        >
          <span class="legend-dot" :style="{ background: CLASS_COLORS[cls] }"></span>
          <span class="legend-name">{{ cls }}</span>
          <span class="legend-ratio">{{ formatRatio(cls) }}</span>
        </span>
      </div>
      <button v-if="selectedClass" class="reset-btn" @click="resetClass">
        收起
      </button>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="tooltip.show"
          class="arch-tooltip"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >
          <div class="tt-name">{{ tooltip.data.name }}</div>
          <div class="tt-row">
            <span class="tt-label">数量</span>
            <span class="tt-value">{{ tooltip.data.count }}</span>
          </div>
          <div class="tt-row" v-if="tooltip.data.ratio">
            <span class="tt-label">占比</span>
            <span class="tt-value">{{ tooltip.data.ratio }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as d3 from 'd3';
import propertyData from '@/data/property/property_v3.json';

// 🎨 低饱和高级灰色系
const CLASS_COLORS: Record<string, string> = {
  '粮食作物': '#A69F8F',      // 暖灰
  '畜牧与肉乳': '#8B7E74',    // 褐灰
  '果蔬园艺': '#889B8D',      // 青灰
  '矿盐与金属': '#7A8B8F',    // 蓝灰
  '手工业原料与特产': '#9B8F9A', // 藕灰
};

const CLASS_ORDER = ['粮食作物', '畜牧与肉乳', '果蔬园艺', '矿盐与金属', '手工业原料与特产'];
const DYNASTY_ORDER = ['先秦', '秦汉', '魏晋南北朝', '隋唐五代', '辽', '金', '元', '明', '清', '民国'];

// 响应式状态
const selectedDynasty = ref('元');
const selectedClass = ref<string | null>(null);
const donutContainer = ref<HTMLElement | null>(null);
const donutSvg = ref<SVGSVGElement | null>(null);
const barContainer = ref<HTMLElement | null>(null);
const barSvg = ref<SVGSVGElement | null>(null);

const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  data: {} as any,
});

// 计算属性
const dynastyList = computed(() => DYNASTY_ORDER);

const currentData = computed(() => {
  return propertyData.find((d: any) => d.dynasty === selectedDynasty.value);
});

const normalizedClassRatio = computed(() => {
  const result: Record<string, number> = {};
  CLASS_ORDER.forEach(cls => {
    result[cls] = currentData.value?.class_ratio[cls] || 0;
  });
  return result;
});

const formatRatio = (cls: string) => {
  const ratio = normalizedClassRatio.value[cls];
  if (ratio === 0) return '—';
  return (ratio * 100).toFixed(0) + '%';
};

// 事件处理
const handleClassClick = (className: string) => {
  const ratio = normalizedClassRatio.value[className];
  if (ratio <= 0) return;
  selectedClass.value = selectedClass.value === className ? null : className;
};

const resetClass = () => {
  selectedClass.value = null;
};

// ==================== 绘制环形图 ====================
const drawDonut = () => {
  if (!donutSvg.value || !donutContainer.value || !currentData.value) return;

  const container = donutContainer.value;
  const { width, height } = container.getBoundingClientRect();
  const size = Math.min(width, height);
  const radius = size / 2 - 20;

  const svg = d3.select(donutSvg.value)
    .attr('width', size)
    .attr('height', size);

  svg.selectAll('*').remove();

  const g = svg.append('g')
    .attr('transform', `translate(${size / 2}, ${size / 2})`);

  const data = currentData.value;
  const isEmptyDynasty = Object.values(data.class_ratio).every((v: any) => v === 0);

  // 数据准备
  const pieData = CLASS_ORDER.map(cls => ({
    name: cls,
    value: normalizedClassRatio.value[cls] || (isEmptyDynasty ? 0.2 : 0.001),
    realValue: normalizedClassRatio.value[cls],
    subitems: data.subitems[cls] || [],
  }));

  const pie = d3.pie<any>()
    .value(d => d.value)
    .sort(null)
    .padAngle(0.012);

  const arc = d3.arc<any>()
    .innerRadius(radius * 0.5)
    .outerRadius(radius)
    .cornerRadius(0);

  const arcs = pie(pieData);

  // 绘制扇区
  g.selectAll('.arc')
    .data(arcs)
    .enter()
    .append('path')
    .attr('class', 'arc')
    .attr('d', arc)
    .attr('fill', d => CLASS_COLORS[d.data.name])
    .attr('opacity', d => {
      if (isEmptyDynasty) return 0.12;
      if (selectedClass.value && selectedClass.value !== d.data.name) return 0.2;
      return d.data.realValue > 0 ? 0.72 : 0.06;
    })
    .attr('stroke', 'rgba(255,255,255,0.5)')
    .attr('stroke-width', 1.5)
    .style('cursor', d => d.data.realValue > 0 ? 'pointer' : 'default')
    .on('mouseenter', function(event, d) {
      if (d.data.realValue <= 0 || isEmptyDynasty) return;
      d3.select(this)
        .transition().duration(150)
        .attr('opacity', 0.95);

      tooltip.value = {
        show: true,
        x: event.clientX + 12,
        y: event.clientY - 40,
        data: {
          name: d.data.name,
          count: d.data.subitems.reduce((s: number, i: any) => s + i.count, 0),
          ratio: (d.data.realValue * 100).toFixed(1) + '%',
        },
      };
    })
    .on('mousemove', (event) => {
      tooltip.value.x = event.clientX + 12;
      tooltip.value.y = event.clientY - 40;
    })
    .on('mouseleave', function(event, d) {
      const baseOpacity = selectedClass.value && selectedClass.value !== d.data.name ? 0.2 : 0.72;
      d3.select(this)
        .transition().duration(150)
        .attr('opacity', d.data.realValue > 0 ? baseOpacity : 0.06);
      tooltip.value.show = false;
    })
    .on('click', (event, d) => {
      if (d.data.realValue <= 0) return;
      handleClassClick(d.data.name);
    });

  // 扇区标签（比例>12%才显示）
  g.selectAll('.arc-label')
    .data(arcs.filter(d => d.data.realValue > 0.12))
    .enter()
    .append('text')
    .attr('class', 'arc-label')
    .attr('transform', d => `translate(${arc.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('font-size', '10px')
    .style('fill', '#fff')
    .style('font-weight', '500')
    .style('pointer-events', 'none')
    .style('text-shadow', '0 1px 2px rgba(0,0,0,0.25)')
    .text(d => (d.data.realValue * 100).toFixed(0) + '%');
};

// ==================== 绘制条形图 ====================
const drawBar = () => {
  if (!barSvg.value || !barContainer.value || !selectedClass.value || !currentData.value) return;

  const container = barContainer.value;
  const width = container.clientWidth - 16;
  const items = currentData.value.subitems[selectedClass.value] || [];
  
  if (items.length === 0) return;

  const barHeight = 20;
  const gap = 5;
  const height = items.length * (barHeight + gap) + 24;

  const svg = d3.select(barSvg.value)
    .attr('width', width)
    .attr('height', height);

  svg.selectAll('*').remove();

  const margin = { top: 16, right: 35, bottom: 8, left: 8 };
  const innerWidth = width - margin.left - margin.right;

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // 排序
  const sortedItems = [...items].sort((a: any, b: any) => b.count - a.count);
  const maxCount = d3.max(sortedItems, (d: any) => d.count) || 1;

  const xScale = d3.scaleLinear()
    .domain([0, maxCount])
    .range([0, innerWidth]);

  const baseColor = CLASS_COLORS[selectedClass.value];

  // 绘制条形
  sortedItems.forEach((item: any, i: number) => {
    const y = i * (barHeight + gap);
    const barWidth = xScale(item.count);

    // 条形背景
    g.append('rect')
      .attr('x', 0)
      .attr('y', y)
      .attr('width', innerWidth)
      .attr('height', barHeight)
      .attr('fill', 'rgba(0,0,0,0.025)');

    // 条形（带动画）
    g.append('rect')
      .attr('x', 0)
      .attr('y', y)
      .attr('width', 0)
      .attr('height', barHeight)
      .attr('fill', baseColor)
      .attr('opacity', 0.65)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event) {
        d3.select(this).transition().duration(100).attr('opacity', 0.88);
        tooltip.value = {
          show: true,
          x: event.clientX + 12,
          y: event.clientY - 30,
          data: { name: item.name, count: item.count, ratio: null },
        };
      })
      .on('mousemove', (event) => {
        tooltip.value.x = event.clientX + 12;
        tooltip.value.y = event.clientY - 30;
      })
      .on('mouseleave', function() {
        d3.select(this).transition().duration(100).attr('opacity', 0.65);
        tooltip.value.show = false;
      })
      .transition()
      .duration(380)
      .delay(i * 40)
      .ease(d3.easeCubicOut)
      .attr('width', barWidth);

    // 名称标签
    g.append('text')
      .attr('x', 6)
      .attr('y', y + barHeight / 2)
      .attr('dy', '0.35em')
      .style('font-size', '11px')
      .style('fill', '#444')
      .style('font-family', '"Source Han Serif SC", serif')
      .text(item.name);

    // 数量标签
    g.append('text')
      .attr('x', innerWidth + 4)
      .attr('y', y + barHeight / 2)
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .style('fill', '#888')
      .style('font-family', '"Product Sans", sans-serif')
      .style('opacity', 0)
      .text(item.count)
      .transition()
      .duration(280)
      .delay(i * 40 + 180)
      .style('opacity', 1);
  });
};

// 监听变化
watch(selectedDynasty, () => {
  selectedClass.value = null;
  nextTick(() => drawDonut());
});

watch(selectedClass, () => {
  nextTick(() => {
    drawDonut();
    if (selectedClass.value) {
      drawBar();
    }
  });
});

onMounted(() => {
  nextTick(() => drawDonut());
  window.addEventListener('resize', () => {
    drawDonut();
    if (selectedClass.value) drawBar();
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', () => {});
});
</script>

<style scoped>
.property-panel {
  --font-en: "Product Sans", "Helvetica Neue", sans-serif;
  --font-cn: "Source Han Serif SC", "Noto Serif SC", serif;
  background: rgba(255, 255, 255, 0.3) !important;
  backdrop-filter: none;
  overflow: hidden;
  height: 100%; /* Force fill parent div */
  display: flex;
  flex-direction: column;
}

/* ... existing code ... */

/* 主体布局 */
.chart-body {
  display: flex;
  flex: 1; /* Take remaining height */
  height: 0; /* Important for scroll/overflow calculation */
  min-height: 0; /* Override default min-height */
  overflow: hidden;
}

.donut-section {
  flex: 0 0 44%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  height: 100%; /* Fill chart-body */
}


.center-info {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.center-dynasty {
  display: block;
  font-family: var(--font-cn);
  font-size: 16px;
  font-weight: 700;
  color: #444;
}

.center-count {
  display: block;
  font-family: var(--font-en);
  font-size: 9px;
  color: #999;
  margin-top: 2px;
}

.center-class {
  display: block;
  font-family: var(--font-cn);
  font-size: 10px;
  color: #666;
  margin-top: 4px;
  padding: 2px 6px;
  background: rgba(0,0,0,0.04);
}

.bar-section {
  flex: 1;
  padding: 8px 8px 8px 0;
  overflow-y: auto;
  max-height: 220px;
}

.bar-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ccc;
}

.placeholder-icon {
  font-size: 20px;
  margin-bottom: 6px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.35; transform: translateX(0); }
  50% { opacity: 0.7; transform: translateX(-4px); }
}

.placeholder-text {
  font-size: 10px;
  text-align: center;
  line-height: 1.4;
}

/* 底部图例 */
.legend-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-top: 1px solid rgba(0,0,0,0.05);
}

.legend-items {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.legend-item:hover {
  color: #333;
}

.legend-item.active {
  color: #333;
  font-weight: 600;
}

.legend-item.dimmed {
  opacity: 0.3;
}

.legend-dot {
  width: 7px;
  height: 7px;
}

.legend-name {
  font-family: var(--font-cn);
}

.legend-ratio {
  font-family: var(--font-en);
  color: #aaa;
  font-size: 8px;
}

.reset-btn {
  font-size: 9px;
  color: #888;
  background: none;
  border: 1px solid #ccc;
  padding: 2px 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: #666;
  color: #fff;
  border-color: #666;
}

/* Tooltip */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.12s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.arch-tooltip {
  position: fixed;
  z-index: 99999;
  background: rgba(45, 45, 45, 0.94);
  color: #fff;
  padding: 8px 12px;
  font-size: 10px;
  pointer-events: none;
  box-shadow: 0 3px 10px rgba(0,0,0,0.12);
}

.tt-name {
  font-family: var(--font-cn);
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 5px;
  border-bottom: 1px solid rgba(255,255,255,0.12);
  padding-bottom: 5px;
}

.tt-row {
  display: flex;
  justify-content: space-between;
  margin-top: 3px;
}

.tt-label {
  color: rgba(255,255,255,0.55);
}

.tt-value {
  font-weight: 500;
}
</style>
