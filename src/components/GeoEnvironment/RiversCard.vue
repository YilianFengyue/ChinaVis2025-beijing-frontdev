<template>
  <v-card flat class="arch-panel">
    <div class="panel-header">
      <v-row align="center" dense no-gutters>
        <v-col cols="auto" class="d-flex align-center mr-10">
          <div class="header-block"></div>
          <div class="header-text-group">
            <h2 class="panel-title">生命之河</h2>
            <span class="panel-subtitle">RIVER CHRONICLE</span>
          </div>
        </v-col>

        <v-col cols="auto">
          <div class="arch-input-wrapper">
            <span class="input-label">REF.</span>
            <input 
              v-model="searchText"
              type="text" 
              placeholder="SEARCH..." 
              class="arch-input"
              @input="handleSearch"
            >
            <v-icon size="small" color="#666" class="search-icon">mdi-magnify</v-icon>
          </div>
        </v-col>

        <v-spacer></v-spacer>

        <v-col cols="auto" v-if="selectedDynasty">
          <button class="arch-btn" @click="resetView">
            [ RESET VIEW ]
          </button>
        </v-col>
      </v-row>

      <div class="legend-bar">
        <div class="legend-group">
          <span class="legend-head">ACTION</span>
          <div class="legend-items">
            <span class="l-item" v-for="(color, name) in COLORS.actions" :key="name">
              <span class="dot-circle" :style="{background: color}"></span>
              {{ name }}
            </span>
          </div>
        </div>
        
        <div class="legend-sep">/</div>

        <div class="legend-group">
          <span class="legend-head">FUNC</span>
          <div class="legend-items">
            <span class="l-item" v-for="(color, name) in COLORS.functions" :key="name">
              <span class="line-mark" :style="{background: color}"></span>
              {{ name }}
            </span>
          </div>
        </div>

        <div class="legend-sep">/</div>

        <div class="legend-group">
          <span class="legend-head">STATE</span>
          <div class="legend-items">
            <span class="l-item">
              <span class="line-solid-mark"></span>
              自然
            </span>
            <span class="l-item">
              <span class="line-dashed-mark"></span>
              人工
            </span>
            <span class="l-item">
              <span class="block-mark"></span>
              淤积
            </span>
          </div>
        </div>
      </div>
    </div>

    <div ref="chartContainer" class="chart-container">
      <svg ref="svgChart"></svg>
    </div>

    <div ref="timelineWrapper" class="timeline-wrapper">
      <div ref="dynastyBar" class="dynasty-bar"></div>
      <div ref="timeAxis" class="time-axis"></div>
    </div>

    <Teleport to="body">
      <Transition name="fade-up">
        <div
          v-if="tooltip.show"
          class="arch-tooltip"
          :style="{
            left: tooltip.x + 20 + 'px', 
            top: tooltip.y + 'px'
          }"
        >
          <div class="tt-header">
            <div class="tt-title-row">
              <span class="tt-name">{{ tooltip.data.river }}</span>
              <span class="tt-id">No.{{ tooltip.data.year || '----' }}</span>
            </div>
            <div class="tt-sub-row">
              <span class="tt-alias" v-if="tooltip.data.alias">{{ tooltip.data.alias }}</span>
            </div>
          </div>

          <div class="tt-grid">
            <div class="tt-item">
              <span class="tt-label">PERIOD</span>
              <span class="tt-value">{{ tooltip.data.period.split('（')[0] }}</span>
            </div>
            <div class="tt-item">
              <span class="tt-label">ACTION</span>
              <span class="tt-value highlight-gold">{{ tooltip.data.action }}</span>
            </div>
            <div class="tt-item full">
              <span class="tt-label">FUNCTION</span>
              <span class="tt-value">{{ tooltip.data.functions || 'N/A' }}</span>
            </div>
          </div>

          <div v-if="tooltip.data.note" class="tt-note">
            <div class="tt-note-label">ARCHIVE RECORD:</div>
            <p class="tt-note-text">{{ tooltip.data.note }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import * as d3 from 'd3';
// 导入真实数据
import riverData from '@/data/rivers_merged.json';
// 导入线索收集器
import { useClueCollector } from '@/composables/useClueCollector';

const { collectClue } = useClueCollector();

// 🎨 终末地·武陵图纸配色方案
// 🎨 建筑图纸配色方案 (Architectural Blueprint)
const COLORS = {
  actions: {
    '开凿': '#2C3E50', // 深蓝灰 - 强调 (墨)
    '竣工': '#EFD160', // 古金 - 关键节点 (金)
    '重开': '#5D7A8C', // 蓝黛 - 重启
    '改道': '#D98E5F', // 赭石 - 变迁
    '废弃': '#7F8C8D', // 混凝土灰
    '其他': '#95A5A6', 
  },
  functions: {
    '运输': '#546E7A', // 蓝灰
    '调控': '#BDBD3F', // 青黛 - 活力 (青)
    '环境': '#81C784', // 植被绿 (低饱和)
    '防灾': '#D4A373', // 陶土色
    '城规': '#5D4037', // 熟褐
    '军事': '#455A64', // 战术灰
    '其它': '#B0BEC5',
  },
  siltation: '#BCAAA4',  // 淤积 - 浅褐
  
  // 核心交互与背景
  dynasty: '#424242',    // 朝代条 - 深灰
  dynastyHover: '#EFD160', // ⚠ 修正：Hover 改为古金
  
  background: '#E9E9E9', // 全局背景 - 建筑灰
  laneBackground: '#FFFFFF', // 泳道 - 纯白 (为了在灰底上更清晰)
  laneBorder: '#D1D1D1', // 泳道框 - 铅笔线
  text: '#212121',       // 主字 - 碳黑
  textMuted: '#616161',  // 辅字 - 铅笔灰
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

  const margin = { top: 8, right: 60, bottom: 8, left: 130 }; // 增加左边距防止长名称溢出
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

  // 🔥 非线性比例尺：1000年为分界点
  // 1000年前（-800~1000）占 30% 宽度，1000年后（1000~1949）占 70% 宽度
  const BREAK_YEAR = 1000;
  const EARLY_RATIO = 0.30; // 前期占 30%
  
  // 创建分段线性比例尺函数
  const createPiecewiseScale = (domainStart: number, domainEnd: number, rangeWidth: number) => {
    // 如果是选中单个朝代（时间跨度小），使用普通线性
    if (domainEnd - domainStart < 300) {
      return d3.scaleLinear().domain([domainStart, domainEnd]).range([0, rangeWidth]);
    }
    
    // 计算分界点在当前域中的位置
    const breakInDomain = Math.max(domainStart, Math.min(domainEnd, BREAK_YEAR));
    
    // 如果分界点在域外，使用普通线性
    if (breakInDomain <= domainStart || breakInDomain >= domainEnd) {
      return d3.scaleLinear().domain([domainStart, domainEnd]).range([0, rangeWidth]);
    }
    
    // 分段比例尺
    const earlyWidth = rangeWidth * EARLY_RATIO;
    const lateWidth = rangeWidth * (1 - EARLY_RATIO);
    
    return (year: number) => {
      if (year <= breakInDomain) {
        // 前期：-800 到 1000 映射到 0 到 earlyWidth
        return ((year - domainStart) / (breakInDomain - domainStart)) * earlyWidth;
      } else {
        // 后期：1000 到 1949 映射到 earlyWidth 到 rangeWidth
        return earlyWidth + ((year - breakInDomain) / (domainEnd - breakInDomain)) * lateWidth;
      }
    };
  };
  
  const xScale = createPiecewiseScale(timeRange.value.start, timeRange.value.end, width) as any;

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
        .attr('stroke-width', 0.5);

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
          .attr('opacity', 0.4);
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
              line.attr('stroke-dasharray', '10,6'); // 更大的虚线间隔
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
            .attr('stroke-linecap', 'square');

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
          })
          .on('dblclick', function() {
            // 双击收集线索
            const data = buildTooltipData(event, riverInfo, event.segment);
            collectClue(data, 'clue_river', '生命之河');
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

  // 根据视图选择刻度值
  let tickValues: number[];
  if (!selectedDynasty.value) {
    // 全局视图：前期稀疏，后期正常
    tickValues = [-800, -400, 0, 400, 800, 1000, 1200, 1400, 1600, 1800, 1949];
  } else {
    const range = timeRange.value.end - timeRange.value.start;
    const step = range > 200 ? 50 : (range > 100 ? 25 : 10);
    tickValues = d3.range(timeRange.value.start, timeRange.value.end + 1, step);
  }

  // 绘制刻度线
  const tickLine = g.append('line')
    .attr('x1', 0)
    .attr('x2', chartWidth)
    .attr('y1', 0)
    .attr('y2', 0)
    .attr('stroke', COLORS.laneBorder);

  // 手动绘制每个刻度
  tickValues.forEach(year => {
    const x = xScale(year);
    if (x >= 0 && x <= chartWidth) {
      // 刻度线
      g.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 0)
        .attr('y2', 4)
        .attr('stroke', COLORS.laneBorder);

      // 刻度文字
      g.append('text')
        .attr('x', x)
        .attr('y', 14)
        .attr('text-anchor', 'middle')
        .style('font-size', '9px')
        .style('fill', COLORS.textMuted)
        .style('font-family', '"Source Han Serif SC", serif')
        .text(year + '年');
    }
  });

  if (duration > 0) {
    g.style('opacity', 0)
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
/* ==================== 核心字体定义 ==================== */
@import url('https://fonts.googleapis.com/css2?family=Product+Sans:wght@400;700&display=swap');
/* 引入思源宋体 (假设本地或CDN已加载，这里定义font-family栈) */

.arch-panel {
  /* 英文用 Product Sans，中文强制用思源宋体 */
  --font-en: "Product Sans", "Helvetica Neue", "Roboto", sans-serif;
  --font-cn: "Source Han Serif SC", "Noto Serif SC", "SimSun", serif; 
  
  --bg-color: #E9E9E9; /* 建筑灰背景 */
  --tooltip-bg: rgba(40, 40, 40, 0.98); /* ⚠ 修正：几乎不透明的深色 */
  --highlight-gold: #EFD160; /* 古金 */
  --highlight-cyan: #BDBD3F; /* 青黛 */
}

/* ==================== 面板容器 ==================== */
.arch-panel {
  background: var(--bg-color);
  font-family: var(--font-cn); /* 全局中文宋体 */
  border: none;
  border-radius: 0;
  position: relative;
  color: #333;
}

/* ==================== 头部设计 ==================== */
.panel-header {
  padding: 20px 30px;
  background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%);
  border-bottom: 1px solid #CCC;
}

.header-block {
  width: 6px;
  height: 32px;
  background: #2C3E50; 
  margin-right: 12px;
}

.header-text-group {
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-family: var(--font-cn);
  font-size: 24px;
  font-weight: 900;
  color: #222;
  letter-spacing: 2px;
  line-height: 1;
}

.panel-subtitle {
  font-family: var(--font-en);
  font-size: 10px;
  font-weight: 700;
  color: #666;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-top: 4px;
}

/* ==================== 搜索框 ==================== */
.arch-input-wrapper {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #666;
  padding-bottom: 2px;
  margin-left: 20px;
  width: 200px;
}

.input-label {
  font-family: var(--font-en);
  font-size: 9px;
  color: #888;
  margin-right: 8px;
  font-weight: 700;
}

.arch-input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: #333;
  font-family: var(--font-cn);
  flex: 1;
}

.arch-btn {
  font-family: var(--font-en);
  font-size: 10px;
  font-weight: 700;
  color: #555;
  background: transparent;
  border: 1px solid #BBB;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.arch-btn:hover {
  background: #333;
  color: #FFF;
  border-color: #333;
}

/* ==================== 图例栏 (修正版) ==================== */
.legend-bar {
  display: flex;
  align-items: center;
  margin-top: 16px;
  gap: 16px;
}

.legend-group {
  display: flex;
  align-items: center;
}

.legend-head {
  font-family: var(--font-en);
  font-size: 9px;
  color: #888;
  font-weight: 700;
  margin-right: 10px;
  letter-spacing: 0.5px;
}

.legend-sep {
  color: #CCC;
  font-size: 10px;
}

.legend-items {
  display: flex;
  gap: 12px;
}

.l-item {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #444;
  font-family: var(--font-cn);
}

.dot-circle {
  width: 8px;
  height: 8px;
  border-radius: 50%; /* 圆点 */
  margin-right: 5px;
}

.line-mark {
  width: 14px;
  height: 2px;
  margin-right: 5px;
}

/* 补全：河道状态图例样式 */
.line-solid-mark {
  width: 14px;
  height: 2px;
  background: #555;
  margin-right: 5px;
}

.line-dashed-mark {
  width: 14px;
  height: 0;
  border-top: 2px dashed #555;
  margin-right: 5px;
}

.block-mark {
  width: 14px;
  height: 6px;
  background: #BCAAA4; /* 淤积色 */
  margin-right: 5px;
}

/* ==================== 图表与时间轴 ==================== */
.chart-container {
  width: 100%;
  background: var(--bg-color); 
}

.timeline-wrapper {
  background: linear-gradient(0deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%);
  border-top: 1px solid #CCC;
  padding: 10px 0;
}

/* ⚠ 修正 Hover 颜色 (CSS辅助D3交互) */
:deep(.dynasty-group rect:hover) {
  fill: var(--highlight-gold) !important; /* 强制覆盖 */
  transition: fill 0.2s ease;
}

/* ==================== Tooltip (修复可见性) ==================== */
.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.2s ease-out;
}
.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.arch-tooltip {
  position: fixed;
  z-index: 99999;
  width: 280px;
  /* ⚠ 背景修正：浅灰色不透明 */
  background: #E8E6E2; /* 浅灰色背景 */
  color: #333; /* 深色文字 */
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  border-left: 3px solid var(--highlight-gold); /* 金色左边框 */
  pointer-events: none;
  font-family: var(--font-en);
}

.tt-header {
  border-bottom: 1px solid #CCC;
  padding-bottom: 8px;
  margin-bottom: 12px;
}

.tt-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.tt-name {
  font-family: var(--font-cn);
  font-size: 18px;
  font-weight: 600;
  color: #333; /* 深色文字 */
}

.tt-id {
  font-size: 10px;
  color: #666;
  font-family: var(--font-en);
}

.tt-alias {
  font-size: 11px;
  color: #666;
  font-family: var(--font-cn);
}

.tt-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.tt-item {
  display: flex;
  flex-direction: column;
}

.tt-item.full {
  grid-column: span 2;
}

.tt-label {
  font-size: 9px;
  color: #888;
  letter-spacing: 1px;
  margin-bottom: 2px;
  font-weight: 600;
  font-family: 'Product Sans', sans-serif;
}

.tt-value {
  font-size: 13px;
  color: #333; /* 深色文字 */
  font-family: var(--font-cn);
}

.highlight-gold {
  color: var(--highlight-gold);
  font-weight: 600;
}

.tt-note {
  background: rgba(0,0,0,0.05); /* 稍微暗一点的背景 */
  padding: 8px;
  border-radius: 2px;
}

.tt-note-label {
  font-size: 9px;
  color: #666;
  margin-bottom: 4px;
  font-family: 'Product Sans', sans-serif;
}

.tt-note-text {
  font-size: 11px;
  line-height: 1.5;
  color: #444; /* 深色文字，更清晰 */
  font-family: var(--font-cn);
  text-align: justify;
}
</style>