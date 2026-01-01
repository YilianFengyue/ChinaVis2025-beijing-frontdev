<template>
  <v-card flat class="rivers-card pa-4">
    <!-- 标题和搜索 -->
    <v-row align="center" class="mb-2" dense>
      <v-col cols="auto">
        <h2 class="card-title">生命之河</h2>
      </v-col>
      <v-col cols="auto">
        <v-text-field
          v-model="searchText"
          density="compact"
          variant="outlined"
          placeholder="输入河流名称..."
          prepend-inner-icon="mdi-magnify"
          hide-details
          class="search-field"
          @input="handleSearch"
        ></v-text-field>
      </v-col>

      <!-- 重置按钮 -->
      <v-col cols="auto" v-if="selectedDynasty">
        <v-btn
          size="large"
          variant="text"
          class="reset-btn"
          @click="resetView"
        >
          <v-icon start size="large">mdi-refresh</v-icon>
          重置视图
        </v-btn>
      </v-col>
    </v-row>

    <!-- 图例 - 更紧凑 -->
    <v-row dense class="mb-2 legend-row">
      <!-- 行为类型 -->
      <v-col cols="auto" class="legend-group">
        <span class="legend-label">行为类型</span>
        <span class="legend-item" v-for="(color, name) in COLORS.actions" :key="name">
          <span class="dot" :style="{background: color}"></span>
          {{ name }}
        </span>
      </v-col>

      <!-- 城市功能 -->
      <v-col cols="auto" class="legend-group">
        <span class="legend-label">城市功能</span>
        <span class="legend-item" v-for="(color, name) in COLORS.functions" :key="name">
          <span class="line-dot" :style="{background: color}"></span>
          {{ name }}
        </span>
      </v-col>

      <!-- 河道类型 -->
      <v-col cols="auto" class="legend-group">
        <span class="legend-label">河道类型</span>
        <span class="legend-item">
          <span class="line-solid"></span>
          自然河道
        </span>
        <span class="legend-item">
          <span class="line-dashed"></span>
          人工开凿
        </span>
      </v-col>

      <!-- 淤积 -->
      <v-col cols="auto" class="legend-group">
        <span class="legend-label">淤积</span>
        <span class="legend-item">
          <span class="silt-block"></span>
          淤积段
        </span>
      </v-col>
    </v-row>

    <!-- 甘特图 -->
    <div ref="chartContainer" class="chart-container">
      <svg ref="svgChart"></svg>
    </div>

    <!-- 底部：年代块 + 时间轴 -->
    <div ref="timelineWrapper" class="timeline-wrapper">
      <div ref="dynastyBar" class="dynasty-bar"></div>
      <div ref="timeAxis" class="time-axis"></div>
    </div>

    <!-- 自定义 Tooltip 卡片（高层级） -->
    <Teleport to="body">
      <v-card
        v-if="tooltip.show"
        :style="{
          position: 'fixed',
          left: tooltip.x + 'px',
          top: tooltip.y + 'px',
          zIndex: 99999,
          maxWidth: '360px',
        }"
        elevation="8"
        class="river-tooltip-card"
      >
        <v-card-title class="tooltip-header">
          <strong>{{ tooltip.data.river }}</strong>
        </v-card-title>
        <v-card-text class="tooltip-body">
          <div class="tooltip-content">
            <div v-if="tooltip.data.alias" class="tooltip-row">
              <span class="tooltip-label">别名</span>
              <span class="tooltip-value">{{ tooltip.data.alias }}</span>
            </div>
            <div class="tooltip-row">
              <span class="tooltip-label">时期</span>
              <span class="tooltip-value">{{ tooltip.data.period }}</span>
            </div>
            <div class="tooltip-row">
              <span class="tooltip-label">行为</span>
              <span class="tooltip-value">{{ tooltip.data.action }}</span>
            </div>
            <div v-if="tooltip.data.year" class="tooltip-row">
              <span class="tooltip-label">年份</span>
              <span class="tooltip-value">{{ tooltip.data.year }}年</span>
            </div>
            <div v-if="tooltip.data.functions" class="tooltip-row">
              <span class="tooltip-label">功能</span>
              <span class="tooltip-value">{{ tooltip.data.functions }}</span>
            </div>
            <div v-if="tooltip.data.note" class="tooltip-note">
              <span class="tooltip-label">摘要</span>
              <p class="tooltip-evidence">{{ tooltip.data.note }}</p>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </Teleport>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import * as d3 from 'd3';
// 导入真实数据
import riverData from '@/data/rivers_merged.json';

// 🎨 高级灰古风配色
const COLORS = {
  actions: {
    '开凿': '#8B5A2B',
    '竣工': '#D4C4B0',
    '重开': '#BFA88A',
    '改道': '#A67B5B',
    '废弃': '#6B4423',
    '其他': '#4A3728',
  },
  functions: {
    '运输': '#9DB4C0',
    '调控': '#5C8A97',
    '环境': '#7BA3B0',
    '防灾': '#3D7A8C',
    '城规': '#2E6171',
    '军事': '#1D4E5E',
    '其它': '#4A6670',
  },
  siltation: '#C9B99A',
  dynasty: '#6B5B4F',
  dynastyHover: '#8B7B6F',
  background: '#FAFAF8',
  laneBackground: '#FFFFFF',
  laneBorder: '#E8E4DE',
  text: '#3A3632',
  textMuted: '#7A756E',
};

// 朝代配置
const dynasties = [
  { label: '先秦', start: -800, end: -221 },
  { label: '秦汉', start: -221, end: 220 },
  { label: '魏晋南北朝', start: 220, end: 581 },
  { label: '隋唐五代', start: 581, end: 960 },
  { label: '辽', start: 907, end: 1125 },
  { label: '金', start: 1115, end: 1234 },
  { label: '元', start: 1234, end: 1368 },
  { label: '明', start: 1368, end: 1644 },
  { label: '清', start: 1644, end: 1912 },
  { label: '民国', start: 1912, end: 1949 },
];

// 响应式状态
const searchText = ref('');
const selectedDynasty = ref<string | null>(null);
const chartContainer = ref<HTMLElement | null>(null);
const svgChart = ref<SVGSVGElement | null>(null);
const dynastyBar = ref<HTMLElement | null>(null);
const timeAxis = ref<HTMLElement | null>(null);
const isTransitioning = ref(false);

const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  data: {} as any,
});

// 计算属性：过滤后的河流列表
const filteredRivers = computed(() => {
  const allRivers = Object.keys(riverData.rivers);

  if (!searchText.value) return allRivers;

  const keyword = searchText.value.toLowerCase();
  return allRivers.filter(riverName => {
    const riverInfo = riverData.rivers[riverName];
    if (riverName.toLowerCase().includes(keyword)) return true;
    return riverInfo.aliases.some(alias => alias.toLowerCase().includes(keyword));
  });
});

// 计算属性：当前时间范围
const timeRange = computed(() => {
  if (!selectedDynasty.value) {
    return { start: -800, end: 1949 };
  }
  const dynasty = dynasties.find(d => d.label === selectedDynasty.value);
  return dynasty ? { start: dynasty.start, end: dynasty.end } : { start: -800, end: 1949 };
});

// ==================== 工具函数 ====================

const timeIntersects = (seg: any, dynastyStart: number, dynastyEnd: number) => {
  return seg.t0 < dynastyEnd && seg.t1 > dynastyStart;
};

const shouldHighlight = (segment: any, selectedDynasty: string | null) => {
  if (!selectedDynasty) return true;
  const dynasty = dynasties.find(d => d.label === selectedDynasty);
  if (!dynasty) return false;
  return timeIntersects(segment, dynasty.start, dynasty.end);
};

const extractSegmentFunctions = (segment: any) => {
  const functionSet = new Set<string>();
  segment.events.forEach((event: any) => {
    if (event.cityFunction && Array.isArray(event.cityFunction)) {
      event.cityFunction.forEach((func: string) => functionSet.add(func));
    }
  });
  return Array.from(functionSet).slice(0, 1);
};

const formatAliases = (aliases: string[]) => {
  if (!aliases || aliases.length === 0) return null;
  const maxShow = 4;
  if (aliases.length <= maxShow) return aliases.join('、');
  const shown = aliases.slice(0, maxShow).join('、');
  return `${shown}等${aliases.length}个`;
};

const aggregateEvents = (segments: any[], timeRange: any, binSize: number = 10) => {
  const eventMap = new Map<string, any>();

  segments.forEach(segment => {
    if (segment.t1 < timeRange.start || segment.t0 > timeRange.end) return;

    segment.events.forEach((event: any) => {
      if (!event.year || event.year < timeRange.start || event.year > timeRange.end) return;
      const binYear = Math.floor(event.year / binSize) * binSize;
      const key = `${binYear}-${event.action}`;

      if (!eventMap.has(key)) {
        eventMap.set(key, {
          ...event,
          year: binYear,
          count: 1,
          segment: segment,
          originalYears: [event.year]
        });
      } else {
        const existing = eventMap.get(key);
        existing.count += 1;
        existing.originalYears.push(event.year);
      }
    });
  });

  return Array.from(eventMap.values());
};

// ==================== 事件处理函数 ====================

const handleSearch = () => {
  drawChart(false);
};

const resetView = () => {
  selectedDynasty.value = null;
  searchText.value = '';
  tooltip.value.show = false;
  drawChart(true); // 带动画
};

const handleDynastyClick = (dynasty: any) => {
  if (isTransitioning.value) return;
  selectedDynasty.value = selectedDynasty.value === dynasty.label ? null : dynasty.label;
  drawChart(true); // 带动画
};

const buildTooltipData = (event: any, riverInfo: any, segment: any) => {
  return {
    river: riverInfo.displayName,
    alias: formatAliases(riverInfo.aliases),
    period: `${segment.dynasty}（${segment.t0}—${segment.t1}）`,
    action: event.action,
    year: event.year,
    functions: event.cityFunction?.join('、'),
    siltation: segment.siltation ? '是' : '否',
    note: event.evidence || null,
  };
};

// ==================== D3 绘制函数（带动画） ====================

const drawChart = (animate: boolean = false) => {
  if (!svgChart.value || !chartContainer.value) return;

  const duration = animate ? 600 : 0;
  isTransitioning.value = animate;

  const margin = { top: 8, right: 60, bottom: 8, left: 100 };
  const width = chartContainer.value.clientWidth - margin.left - margin.right;
  const rowHeight = 24; // 更紧凑的泳道高度
  const height = filteredRivers.value.length * rowHeight;

  const svg = d3.select(svgChart.value)
    .attr('width', chartContainer.value.clientWidth)
    .attr('height', height + margin.top + margin.bottom);

  // 创建或获取主容器
  let g = svg.select<SVGGElement>('.main-group');
  if (g.empty()) {
    g = svg.append('g').attr('class', 'main-group');
  }
  g.attr('transform', `translate(${margin.left},${margin.top})`);

  // 比例尺
  const xScale = d3.scaleLinear()
    .domain([timeRange.value.start, timeRange.value.end])
    .range([0, width]);

  const yScale = d3.scaleBand()
    .domain(filteredRivers.value)
    .range([0, height])
    .padding(0.2);

  // 清除旧内容（带过渡）
  if (animate) {
    g.selectAll('.lane-group')
      .transition()
      .duration(duration / 2)
      .style('opacity', 0)
      .remove();
  } else {
    g.selectAll('.lane-group').remove();
  }

  // 延迟绘制新内容
  const delay = animate ? duration / 2 : 0;

  setTimeout(() => {
    // 绘制每条河流
    filteredRivers.value.forEach((riverName, i) => {
      const riverInfo = riverData.rivers[riverName];
      const y = yScale(riverName)!;
      const h = yScale.bandwidth();

      const laneGroup = g.append('g')
        .attr('class', 'lane-group')
        .style('opacity', animate ? 0 : 1);

      // 泳道背景
      laneGroup.append('rect')
        .attr('x', 0)
        .attr('y', y)
        .attr('width', width)
        .attr('height', h)
        .attr('fill', COLORS.laneBackground)
        .attr('stroke', COLORS.laneBorder)
        .attr('stroke-width', 0.5)
        .attr('rx', 2);

      // 过滤当前时间范围内的segments
      const segmentsInRange = riverInfo.segments.filter(seg =>
        seg.t1 >= timeRange.value.start && seg.t0 <= timeRange.value.end
      );

      // 合并淤积段
      const siltationRanges: { start: number; end: number }[] = [];
      segmentsInRange.forEach(segment => {
        if (segment.siltation) {
          const start = Math.max(segment.t0, timeRange.value.start);
          const end = Math.min(segment.t1, timeRange.value.end);
          const lastRange = siltationRanges[siltationRanges.length - 1];
          if (lastRange && start <= lastRange.end + 50) {
            lastRange.end = Math.max(lastRange.end, end);
          } else {
            siltationRanges.push({ start, end });
          }
        }
      });

      // 绘制淤积块
      siltationRanges.forEach(range => {
        laneGroup.append('rect')
          .attr('x', xScale(range.start))
          .attr('y', y + 2)
          .attr('width', xScale(range.end) - xScale(range.start))
          .attr('height', h - 4)
          .attr('fill', COLORS.siltation)
          .attr('opacity', 0.4)
          .attr('rx', 2);
      });

      // 画功能线
      segmentsInRange.forEach(segment => {
        const x0 = Math.max(xScale(segment.t0), 0);
        const x1 = Math.min(xScale(segment.t1), width);
        const isHighlighted = shouldHighlight(segment, selectedDynasty.value);
        const baseOpacity = isHighlighted ? 1 : 0.25;
        const functions = extractSegmentFunctions(segment);
        const isArtificial = riverInfo.type === '人工开凿';

        if (functions.length > 0) {
          functions.forEach((func) => {
            const lineY = y + h / 2;
            const line = laneGroup.append('line')
              .attr('x1', x0)
              .attr('x2', x1)
              .attr('y1', lineY)
              .attr('y2', lineY)
              .attr('stroke', COLORS.functions[func] || COLORS.functions['其它'])
              .attr('stroke-width', 2.5)
              .attr('opacity', 0.8 * baseOpacity)
              .attr('stroke-linecap', 'round');

            if (isArtificial) {
              line.attr('stroke-dasharray', '6,3');
            }
          });
        } else {
          const lineY = y + h / 2;
          const line = laneGroup.append('line')
            .attr('x1', x0)
            .attr('x2', x1)
            .attr('y1', lineY)
            .attr('y2', lineY)
            .attr('stroke', COLORS.textMuted)
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.4 * baseOpacity)
            .attr('stroke-linecap', 'round');

          if (isArtificial) {
            line.attr('stroke-dasharray', '6,3');
          }
        }
      });

      // 聚合事件点
      const binSize = selectedDynasty.value ? 5 : 20;
      const aggregatedEvents = aggregateEvents(riverInfo.segments, timeRange.value, binSize);

      aggregatedEvents.forEach(event => {
        const cx = xScale(event.year);
        const cy = y + h / 2;
        const isHighlighted = shouldHighlight(event.segment, selectedDynasty.value);
        const opacity = isHighlighted ? 1 : 0.35;
        const radius = Math.min(4 + Math.log(event.count) * 1.5, 8);

        const circle = laneGroup.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', radius)
          .attr('fill', COLORS.actions[event.action] || COLORS.actions['其他'])
          .attr('stroke', COLORS.laneBackground)
          .attr('stroke-width', 1.5)
          .attr('opacity', opacity)
          .style('cursor', 'pointer');

        circle
          .on('mouseenter', function(e) {
            d3.select(this).transition().duration(150).attr('r', radius * 1.3);
            tooltip.value.data = buildTooltipData(event, riverInfo, event.segment);
            tooltip.value.x = e.clientX + 12;
            tooltip.value.y = e.clientY - 80;
            tooltip.value.show = true;
          })
          .on('mousemove', function(e) {
            tooltip.value.x = e.clientX + 12;
            tooltip.value.y = e.clientY - 80;
          })
          .on('mouseleave', function() {
            d3.select(this).transition().duration(150).attr('r', radius);
            tooltip.value.show = false;
          });
      });

      // 淡入动画
      if (animate) {
        laneGroup.transition()
          .duration(duration / 2)
          .delay(i * 30)
          .style('opacity', 1);
      }
    });

    // Y轴
    g.selectAll('.y-axis').remove();
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').remove())
      .selectAll('text')
      .style('font-size', '12px')
      .style('font-family', '"Source Han Serif SC", "Noto Serif SC", serif')
      .style('fill', COLORS.text);

    isTransitioning.value = false;
  }, delay);

  // 绘制朝代条和时间轴（带动画）
  drawDynastyBar(xScale, margin, width, animate ? duration : 0);
  drawTimeAxis(xScale, margin, width, animate ? duration : 0);
};

const drawDynastyBar = (xScale: any, margin: any, chartWidth: number, duration: number) => {
  if (!dynastyBar.value) return;

  const container = d3.select(dynastyBar.value);
  let svg = container.select<SVGSVGElement>('svg');
  
  if (svg.empty()) {
    svg = container.append('svg');
  }
  
  svg.attr('width', chartWidth + margin.left + margin.right)
    .attr('height', 26);

  let g = svg.select<SVGGElement>('.dynasty-group');
  if (g.empty()) {
    g = svg.append('g').attr('class', 'dynasty-group');
  }
  g.attr('transform', `translate(${margin.left},0)`);

  // 清除旧内容
  g.selectAll('*').remove();

  if (!selectedDynasty.value) {
    // 全局视图：显示所有朝代
    dynasties.forEach(d => {
      const x = xScale(d.start);
      const w = xScale(d.end) - xScale(d.start);

      const rect = g.append('rect')
        .attr('x', x)
        .attr('y', 2)
        .attr('width', w)
        .attr('height', 22)
        .attr('fill', COLORS.dynasty)
        .attr('rx', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', function() {
          d3.select(this).transition().duration(150).attr('fill', COLORS.dynastyHover);
        })
        .on('mouseleave', function() {
          d3.select(this).transition().duration(150).attr('fill', COLORS.dynasty);
        })
        .on('click', () => handleDynastyClick(d));

      if (duration > 0) {
        rect.style('opacity', 0).transition().duration(duration).style('opacity', 1);
      }

      const text = g.append('text')
        .attr('x', x + w / 2)
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .attr('fill', '#FAFAF8')
        .attr('pointer-events', 'none')
        .style('font-size', '10px')
        .style('font-weight', '500')
        .style('font-family', '"Source Han Serif SC", serif')
        .text(w > 35 ? d.label : '');

      if (duration > 0) {
        text.style('opacity', 0).transition().duration(duration).style('opacity', 1);
      }
    });
  } else {
    // 朝代详细视图
    const selectedDyn = dynasties.find(d => d.label === selectedDynasty.value);
    if (selectedDyn) {
      const rect = g.append('rect')
        .attr('x', 0)
        .attr('y', 2)
        .attr('width', chartWidth)
        .attr('height', 22)
        .attr('fill', COLORS.dynasty)
        .attr('rx', 2);

      if (duration > 0) {
        rect.attr('width', 0)
          .transition()
          .duration(duration)
          .ease(d3.easeCubicOut)
          .attr('width', chartWidth);
      }

      g.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .attr('fill', '#FAFAF8')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('font-family', '"Source Han Serif SC", serif')
        .text(`${selectedDyn.label}（${selectedDyn.start}—${selectedDyn.end}）`)
        .style('opacity', 0)
        .transition()
        .delay(duration / 2)
        .duration(duration / 2)
        .style('opacity', 1);
    }
  }
};

const drawTimeAxis = (xScale: any, margin: any, chartWidth: number, duration: number) => {
  if (!timeAxis.value) return;

  const container = d3.select(timeAxis.value);
  let svg = container.select<SVGSVGElement>('svg');
  
  if (svg.empty()) {
    svg = container.append('svg');
  }
  
  svg.attr('width', chartWidth + margin.left + margin.right)
    .attr('height', 22);

  let g = svg.select<SVGGElement>('.axis-group');
  if (g.empty()) {
    g = svg.append('g').attr('class', 'axis-group');
  }
  g.attr('transform', `translate(${margin.left},0)`);

  // 清除旧内容
  g.selectAll('*').remove();

  let tickValues;
  if (!selectedDynasty.value) {
    tickValues = [-800, -400, 0, 400, 800, 1200, 1600, 1949];
  } else {
    const range = timeRange.value.end - timeRange.value.start;
    const step = range > 200 ? 50 : (range > 100 ? 25 : 10);
    tickValues = d3.range(timeRange.value.start, timeRange.value.end + 1, step);
  }

  const axis = d3.axisBottom(xScale)
    .tickValues(tickValues)
    .tickSize(4)
    .tickFormat((d: any) => d + '年');

  const axisGroup = g.append('g')
    .attr('class', 'time-axis-ticks')
    .call(axis)
    .call(g => g.select('.domain').attr('stroke', COLORS.laneBorder))
    .call(g => g.selectAll('.tick line').attr('stroke', COLORS.laneBorder));

  axisGroup.selectAll('text')
    .style('font-size', '9px')
    .style('fill', COLORS.textMuted)
    .style('font-family', '"Source Han Serif SC", serif')
    .attr('y', 8);

  if (duration > 0) {
    axisGroup.style('opacity', 0)
      .transition()
      .duration(duration)
      .style('opacity', 1);
  }
};

// ==================== 生命周期 ====================

onMounted(() => {
  nextTick(() => {
    drawChart(false);
  });
  window.addEventListener('resize', () => drawChart(false));
});

onUnmounted(() => {
  window.removeEventListener('resize', () => drawChart(false));
});
</script>

<style scoped>
.rivers-card {
  background: linear-gradient(180deg, #FAFAF8 0%, #F5F3EF 100%);
  border: 1px solid #E8E4DE;
  font-family: "Source Han Serif SC", "Noto Serif SC", serif;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #3A3632;
  letter-spacing: 2px;
}

.search-field {
  width: 180px;
  font-size: 12px;
}

.search-field :deep(.v-field) {
  background: #FFFFFF;
  border-color: #E8E4DE;
}

.reset-btn {
  color: #6B5B4F;
  font-size: 11px;
}

/* 图例样式 */
.legend-row {
  border-bottom: 1px solid #E8E4DE;
  padding-bottom: 8px;
}

.legend-group {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 16px;
}

.legend-label {
  font-size: 11px;
  color: #7A756E;
  margin-right: 6px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  color: #5A5650;
  margin-right: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 3px;
}

.line-dot {
  width: 14px;
  height: 3px;
  border-radius: 1px;
  margin-right: 3px;
}

.line-solid {
  width: 14px;
  height: 2px;
  background: #6B5B4F;
  margin-right: 3px;
}

.line-dashed {
  width: 14px;
  height: 0;
  border-top: 2px dashed #6B5B4F;
  margin-right: 3px;
}

.silt-block {
  width: 14px;
  height: 8px;
  background: #C9B99A;
  opacity: 0.6;
  border-radius: 2px;
  margin-right: 3px;
}

/* 图表容器 */
.chart-container {
  width: 100%;
  margin: 8px 0;
  overflow: hidden;
}

.chart-container svg {
  display: block;
}

/* 时间轴 */
.timeline-wrapper {
  margin-top: 4px;
}

.dynasty-bar {
  height: 26px;
}

.time-axis {
  height: 22px;
}

/* Tooltip 样式 */
.river-tooltip-card {
  background: #FAFAF8 !important;
  border: 1px solid #E8E4DE;
  border-radius: 6px !important;
  box-shadow: 0 4px 20px rgba(58, 54, 50, 0.15) !important;
}

.tooltip-header {
  background: linear-gradient(90deg, #6B5B4F 0%, #8B7B6F 100%);
  color: #FAFAF8 !important;
  font-size: 13px;
  padding: 8px 12px !important;
  border-radius: 5px 5px 0 0;
}

.tooltip-body {
  padding: 10px 12px !important;
}

.tooltip-content {
  font-size: 11px;
  line-height: 1.6;
}

.tooltip-row {
  display: flex;
  margin-bottom: 4px;
}

.tooltip-label {
  color: #7A756E;
  width: 40px;
  flex-shrink: 0;
}

.tooltip-value {
  color: #3A3632;
  font-weight: 500;
}

.tooltip-note {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #E8E4DE;
}

.tooltip-evidence {
  color: #5A5650;
  margin: 4px 0 0 0;
  font-size: 10px;
  line-height: 1.5;
  max-height: 80px;
  overflow-y: auto;
}
</style>
