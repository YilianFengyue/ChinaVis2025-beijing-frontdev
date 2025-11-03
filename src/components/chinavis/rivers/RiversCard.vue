<template>
  <v-card flat class="pa-6" style="background-color: #F8F6F0;">
    <!-- 标题和搜索 -->
    <v-row align="center" class="mb-4">
      <v-col cols="auto">
        <h2 class="text-h5">生命之河</h2>
      </v-col>
      <v-col cols="auto">
        <v-text-field
          v-model="searchText"
          density="compact"
          variant="outlined"
          placeholder="输入河流名称..."
          prepend-inner-icon="mdi-magnify"
          hide-details
          style="width: 220px;"
          bg-color="white"
          @input="handleSearch"
        ></v-text-field>
      </v-col>

      <!-- 重置按钮 -->
      <v-col cols="auto" v-if="selectedDynasty">
        <v-btn
          size="small"
          variant="outlined"
          @click="resetView"
        >
          <v-icon start>mdi-refresh</v-icon>
          重置视图
        </v-btn>
      </v-col>
    </v-row>

    <!-- 图例 -->
    <v-row dense class="mb-4">
      <!-- 行为类型 -->
      <v-col cols="auto">
        <span class="text-body-2 font-weight-medium mr-2">行为类型</span>
      </v-col>
      <v-col cols="auto">
        <v-chip size="small" class="mr-2">
          <v-icon start size="small" :color="COLORS.actions['开凿']">mdi-circle</v-icon>
          开凿
        </v-chip>
        <v-chip size="small" class="mr-2">
          <v-icon start size="small" :color="COLORS.actions['竣工']">mdi-circle</v-icon>
          竣工
        </v-chip>
        <v-chip size="small" class="mr-2">
          <v-icon start size="small" :color="COLORS.actions['重开']">mdi-circle</v-icon>
          重开
        </v-chip>
        <v-chip size="small" class="mr-2">
          <v-icon start size="small" :color="COLORS.actions['改道']">mdi-circle</v-icon>
          改道
        </v-chip>
        <v-chip size="small" class="mr-2">
          <v-icon start size="small" :color="COLORS.actions['废弃']">mdi-circle</v-icon>
          废弃
        </v-chip>
        <v-chip size="small" class="mr-2">
          <v-icon start size="small" :color="COLORS.actions['其他']">mdi-circle</v-icon>
          其他
        </v-chip>
      </v-col>

      <!-- 城市功能 -->
      <v-col cols="auto" class="ml-4">
        <span class="text-body-2 font-weight-medium mr-2">城市功能</span>
      </v-col>
      <v-col cols="auto">
        <v-chip size="small" class="mr-2">
          <span class="line-indicator" :style="{background: COLORS.functions['运输']}"></span>
          运输
        </v-chip>
        <v-chip size="small" class="mr-2">
          <span class="line-indicator" :style="{background: COLORS.functions['调控']}"></span>
          调控
        </v-chip>
        <v-chip size="small" class="mr-2">
          <span class="line-indicator" :style="{background: COLORS.functions['环境']}"></span>
          环境
        </v-chip>
        <v-chip size="small" class="mr-2">
          <span class="line-indicator" :style="{background: COLORS.functions['防灾']}"></span>
          防灾
        </v-chip>
        <v-chip size="small" class="mr-2">
          <span class="line-indicator" :style="{background: COLORS.functions['城规']}"></span>
          城规
        </v-chip>
        <v-chip size="small" class="mr-2">
          <span class="line-indicator" :style="{background: COLORS.functions['军事']}"></span>
          军事
        </v-chip>
        <v-chip size="small" class="mr-2">
          <span class="line-indicator" :style="{background: COLORS.functions['其它']}"></span>
          其它
        </v-chip>
      </v-col>

      <!-- 河道类型 -->
      <v-col cols="auto" class="ml-4">
        <span class="text-body-2 font-weight-medium mr-2">河道类型</span>
      </v-col>
      <v-col cols="auto">
        <v-chip size="small" class="mr-2">
          <span class="line-indicator" style="background: #666;"></span>
          自然河道
        </v-chip>
        <v-chip size="small" class="mr-2">
          <span class="line-indicator" style="background: transparent; border-top: 2px dashed #666;"></span>
          人工开凿
        </v-chip>
      </v-col>

      <!-- 淤积 -->
      <v-col cols="auto" class="ml-4">
        <span class="text-body-2 font-weight-medium mr-2">显示淤积</span>
      </v-col>
      <v-col cols="auto">
        <v-chip size="small">
          <span class="silt-indicator" :style="{background: COLORS.siltation}"></span>
          淤积
        </v-chip>
      </v-col>
    </v-row>

    <!-- 甘特图 -->
    <div ref="chartContainer" style="width: 100%; position: relative; margin-bottom: 16px;">
      <svg ref="svgChart" style="width: 100%;"></svg>

      <!-- Tooltip卡片 -->
      <v-card
        v-if="tooltip.show"
        :style="{
          position: 'fixed',
          left: tooltip.x + 'px',
          top: tooltip.y + 'px',
          zIndex: 9999,
          pointerEvents: tooltip.pinned ? 'auto' : 'none',
          maxWidth: '400px'
        }"
        elevation="12"
        color="white"
      >
        <v-card-title class="text-subtitle-2 py-2 px-4" style="background: #FFF8E1; border-bottom: 2px solid #FFD54F;">
          <strong>河流：{{ tooltip.data.river }}</strong>
          <v-btn
            v-if="tooltip.pinned"
            icon="mdi-close"
            size="x-small"
            variant="text"
            style="float: right;"
            @click="tooltip.show = false"
          ></v-btn>
        </v-card-title>
        <v-card-text class="pa-4">
          <div class="text-body-2" style="line-height: 1.8;">
            <div v-if="tooltip.data.alias" class="mb-2">
              <span style="color: #666;">别名：</span>
              <strong>{{ tooltip.data.alias }}</strong>
            </div>
            <div class="mb-2">
              <span style="color: #666;">时期：</span>
              <strong>{{ tooltip.data.period }}</strong>
            </div>
            <div class="mb-2">
              <span style="color: #666;">行为：</span>
              <strong>{{ tooltip.data.action }}</strong>
            </div>
            <div v-if="tooltip.data.year" class="mb-2">
              <span style="color: #666;">年份：</span>
              <strong>{{ tooltip.data.year }}年</strong>
            </div>
            <div v-if="tooltip.data.functions" class="mb-2">
              <span style="color: #666;">城市功能：</span>
              <strong>{{ tooltip.data.functions }}</strong>
            </div>
            <div v-if="tooltip.data.siltation" class="mb-2">
              <span style="color: #666;">淤积：</span>
              <strong>{{ tooltip.data.siltation }}</strong>
            </div>
            <div v-if="tooltip.data.note" style="border-top: 1px solid #E0E0E0; padding-top: 8px; margin-top: 8px;">
              <span style="color: #666;">摘要：</span>
              <div style="margin-top: 4px; max-height: 150px; overflow-y: auto;">
                {{ tooltip.data.note }}
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- 底部：年代块 + 时间轴 -->
    <div ref="timelineWrapper" style="position: relative;">
      <div ref="dynastyBar" style="height: 32px; margin-bottom: 2px;"></div>
      <div ref="timeAxis" style="height: 28px;"></div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import * as d3 from 'd3';
// 导入真实数据
import riverData from '@/data/rivers_merged.json';

// 颜色配置
const COLORS = {
  actions: {
    '开凿': '#C07240',
    '竣工': '#F2E5D2',
    '重开': '#E3C6A3',
    '改道': '#D5A874',
    '废弃': '#CB8E55',
    '其他': '#603028',
  },
  functions: {
    '运输': '#C7D4DE',
    '调控': '#7EB6CE',
    '环境': '#83ABC5',
    '防灾': '#00A6BD',
    '城规': '#007FB2',
    '军事': '#1067B0',
    '其它': '#3C6F98',
  },
  siltation: '#C2B190',
  dynasty: '#8B735D',
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

const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  data: {} as any,
  pinned: false,
});

// 计算属性：过滤后的河流列表
const filteredRivers = computed(() => {
  const allRivers = Object.keys(riverData.rivers);

  if (!searchText.value) return allRivers;

  const keyword = searchText.value.toLowerCase();
  return allRivers.filter(riverName => {
    const riverInfo = riverData.rivers[riverName];

    // 匹配河流名
    if (riverName.toLowerCase().includes(keyword)) return true;

    // 匹配别名
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

// 判断时间段是否相交
const timeIntersects = (seg: any, dynastyStart: number, dynastyEnd: number) => {
  return seg.t0 < dynastyEnd && seg.t1 > dynastyStart;
};

// 判断segment是否应该高亮（基于时间相交而非字符串匹配）
const shouldHighlight = (segment: any, selectedDynasty: string | null) => {
  if (!selectedDynasty) return true;

  const dynasty = dynasties.find(d => d.label === selectedDynasty);
  if (!dynasty) return false;

  return timeIntersects(segment, dynasty.start, dynasty.end);
};

// 🔥 新增：从segment提取主要城市功能
const extractSegmentFunctions = (segment: any) => {
  const functionSet = new Set<string>();

  segment.events.forEach((event: any) => {
    if (event.cityFunction && Array.isArray(event.cityFunction)) {
      event.cityFunction.forEach((func: string) => {
        functionSet.add(func);
      });
    }
  });

  // TODO 只取第一个功能（临时简化）
  return Array.from(functionSet).slice(0, 1);
};

// 去重事件：以河流为单位，按 year-action-functions 去重
const deduplicateEvents = (segments: any[], timeRange: any) => {
  const eventMap = new Map<string, any>();

  segments.forEach(segment => {
    // 只处理在时间范围内的segment
    if (segment.t1 < timeRange.start || segment.t0 > timeRange.end) return;

    segment.events.forEach((event: any) => {
      if (!event.year || event.year < timeRange.start || event.year > timeRange.end) return;

      // 年份归一化到整数（修复问题5）
      const normalizedYear = Math.round(event.year);

      // 构建唯一键：year-action-functions
      const functionsKey = (event.cityFunction || []).sort().join(',');
      const key = `${normalizedYear}-${event.action}-${functionsKey}`;

      // 如果已存在，保留第一个（保留evidence等信息）
      if (!eventMap.has(key)) {
        eventMap.set(key, {
          ...event,
          year: normalizedYear,
          segment: segment  // 保留segment引用用于tooltip
        });
      }
    });
  });

  return Array.from(eventMap.values());
};

// ==================== 事件处理函数 ====================

const handleSearch = () => {
  drawChart();
};

const resetView = () => {
  selectedDynasty.value = null;
  searchText.value = '';
  tooltip.value.show = false;
  drawChart();
};

const handleDynastyClick = (dynasty: any, isRightClick: boolean = false) => {
  if (isRightClick) {
    // TODO: 触发全局事件（Pinia）
    // useDynastyStore().setSelectedDynasty(dynasty.label);
    console.log('右键点击朝代，触发全局事件:', dynasty.label);
  } else {
    // 左键：切换选中状态
    selectedDynasty.value = selectedDynasty.value === dynasty.label ? null : dynasty.label;
    drawChart();
  }
};

const buildTooltipData = (event: any, riverInfo: any, segment: any) => {
  return {
    river: riverInfo.displayName,
    alias: riverInfo.aliases.length > 0 ? riverInfo.aliases.join('、') : null,
    period: `${segment.dynasty}（${segment.t0}-${segment.t1}）`,
    action: event.action,
    year: event.year,
    functions: event.cityFunction?.join('、'),
    siltation: segment.siltation ? '是' : '否',
    note: event.evidence || null,
  };
};

// ==================== D3 绘制函数 ====================

const drawChart = () => {
  if (!svgChart.value || !chartContainer.value) return;

  d3.select(svgChart.value).selectAll('*').remove();

  const margin = { top: 20, right: 80, bottom: 10, left: 120 };
  const width = chartContainer.value.clientWidth - margin.left - margin.right;
  const rowHeight = 35;
  const height = filteredRivers.value.length * rowHeight;

  const svg = d3.select(svgChart.value)
    .attr('height', height + margin.top + margin.bottom);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // 比例尺
  const xScale = d3.scaleLinear()
    .domain([timeRange.value.start, timeRange.value.end])
    .range([0, width]);

  const yScale = d3.scaleBand()
    .domain(filteredRivers.value)
    .range([0, height])
    .padding(0.15);

  // 绘制朝代背景（只在全局视图显示）
  if (!selectedDynasty.value) {
    dynasties.forEach(d => {
      g.append('rect')
        .attr('x', xScale(d.start))
        .attr('y', 0)
        .attr('width', xScale(d.end) - xScale(d.start))
        .attr('height', height)
        .attr('fill', COLORS.dynasty)
        .attr('opacity', 0.08);
    });
  }

  // 绘制每条河流
  filteredRivers.value.forEach(riverName => {
    const riverInfo = riverData.rivers[riverName];
    const y = yScale(riverName)!;
    const h = yScale.bandwidth();

    // 泳道背景（白色）
    g.append('rect')
      .attr('x', 0)
      .attr('y', y)
      .attr('width', width)
      .attr('height', h)
      .attr('fill', 'white')
      .attr('stroke', 'none')
      .attr('rx', 3);

    // 过滤当前时间范围内的segments
    const segmentsInRange = riverInfo.segments.filter(seg =>
      seg.t1 >= timeRange.value.start && seg.t0 <= timeRange.value.end
    );

    // 🔥🔥🔥 核心改动：画segment级别的功能长线 🔥🔥🔥
    segmentsInRange.forEach(segment => {
      const x0 = Math.max(xScale(segment.t0), 0);
      const x1 = Math.min(xScale(segment.t1), width);

      // 判断是否高亮
      const isHighlighted = shouldHighlight(segment, selectedDynasty.value);
      const baseOpacity = isHighlighted ? 1 : 0.2;

      // 提取该segment的主要功能
      const functions = extractSegmentFunctions(segment);

      // 🌟 为每个功能画一条从t0到t1的长线（这才是正确的！）
      if (functions.length > 0) {
        functions.forEach((func, idx) => {
          // 垂直偏移（多个功能叠加）
          const lineOffset = (idx - (functions.length - 1) / 2) * 4;
          const lineY = y + h / 2 + lineOffset;

          g.append('line')
            .attr('x1', x0)                    // ← 从segment开始
            .attr('x2', x1)                    // ← 到segment结束
            .attr('y1', lineY)
            .attr('y2', lineY)
            .attr('stroke', COLORS.functions[func] || COLORS.functions['其它'])
            .attr('stroke-width', 3)
            .attr('opacity', 0.85 * baseOpacity)
            .attr('stroke-linecap', 'round');  // 圆角端点
        });
      }

      // 淤积块（叠加在功能线上）
      if (segment.siltation) {
        g.append('rect')
          .attr('x', x0)
          .attr('y', y)
          .attr('width', x1 - x0)
          .attr('height', h)
          .attr('fill', COLORS.siltation)
          .attr('opacity', isHighlighted ? 0.35 : 0.12)
          .attr('rx', 3);
      }
    });

    // 🔥 去重事件后画圆点（在功能长线上叠加关键点位）
    const uniqueEvents = deduplicateEvents(riverInfo.segments, timeRange.value);

    // 按年份分组
    const eventsByYear = d3.group(uniqueEvents, e => e.year);

    // 绘制去重后的事件点
    eventsByYear.forEach((events, year) => {
      const randomOffset = (Math.random() - 0.5) * 6;  // ±3px范围
      const cx = xScale(year) + randomOffset;

      events.forEach((event, idx) => {
        // 垂直偏移（如果同一年有多个不同事件）
        const verticalOffset = (idx - (events.length - 1) / 2) * 8;
        const cy = y + h / 2 + verticalOffset;

        // 高亮判断
        const isHighlighted = shouldHighlight(event.segment, selectedDynasty.value);
        const opacity = isHighlighted ? 1 : 0.3;

        // 行为点（圆点）
        const circle = g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 6)
          .attr('fill', COLORS.actions[event.action] || COLORS.actions['其他'])
          .attr('stroke', 'white')
          .attr('stroke-width', 2.5)
          .attr('opacity', opacity)
          .style('cursor', 'pointer');

        // Tooltip交互
        circle
          .on('mouseenter', function() {
            tooltip.value.show = true;
          })
          .on('mousemove', function(e) {
            if (!tooltip.value.pinned) {
              tooltip.value.x = e.clientX + 15;
              tooltip.value.y = e.clientY - 80;
              tooltip.value.data = buildTooltipData(event, riverInfo, event.segment);
            }
          })
          .on('mouseleave', function() {
            if (!tooltip.value.pinned) {
              tooltip.value.show = false;
            }
          })
          .on('click', function(e) {
            e.stopPropagation();
            tooltip.value = {
              show: true,
              x: e.clientX + 15,
              y: e.clientY - 100,
              data: buildTooltipData(event, riverInfo, event.segment),
              pinned: true,
            };
          });
      });
    });
  });

  // Y轴
  g.append('g')
    .call(d3.axisLeft(yScale))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').remove())
    .selectAll('text')
    .style('font-size', '15px')
    .style('font-family', 'Source Han Serif SC, 思源宋体, serif');

  // 绘制朝代条和时间轴
  drawDynastyBar(xScale, margin, width);
  drawTimeAxis(xScale, margin, width);
};

const drawDynastyBar = (xScale: any, margin: any, chartWidth: number) => {
  if (!dynastyBar.value) return;

  d3.select(dynastyBar.value).selectAll('*').remove();

  const svg = d3.select(dynastyBar.value)
    .append('svg')
    .attr('width', chartWidth + margin.left + margin.right)
    .attr('height', 32);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},0)`);

  if (!selectedDynasty.value) {
    // 全局视图：显示所有朝代
    dynasties.forEach(d => {
      const x = xScale(d.start);
      const w = xScale(d.end) - xScale(d.start);

      g.append('rect')
        .attr('x', x)
        .attr('y', 0)
        .attr('width', w)
        .attr('height', 32)
        .attr('fill', COLORS.dynasty)
        .attr('stroke', 'rgba(255,255,255,0.4)')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('click', function(event) {
          handleDynastyClick(d, false);
        })
        .on('contextmenu', function(event) {
          event.preventDefault();
          handleDynastyClick(d, true);
        });

      g.append('text')
        .attr('x', x + w / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('pointer-events', 'none')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .text(d.label);
    });
  } else {
    // 朝代详细视图：显示单个朝代
    const selectedDyn = dynasties.find(d => d.label === selectedDynasty.value);
    if (selectedDyn) {
      g.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', chartWidth)
        .attr('height', 32)
        .attr('fill', COLORS.dynasty)
        .attr('stroke', 'rgba(255,255,255,0.4)')
        .attr('stroke-width', 1);

      g.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .text(`${selectedDyn.label}（${selectedDyn.start}-${selectedDyn.end}）`);
    }
  }
};

const drawTimeAxis = (xScale: any, margin: any, chartWidth: number) => {
  if (!timeAxis.value) return;

  d3.select(timeAxis.value).selectAll('*').remove();

  const svg = d3.select(timeAxis.value)
    .append('svg')
    .attr('width', chartWidth + margin.left + margin.right)
    .attr('height', 28);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},0)`);

  let tickValues;
  if (!selectedDynasty.value) {
    // 全局视图：稀疏刻度
    tickValues = [-800, -600, -400, -200, 0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 1949];
  } else {
    // 朝代视图：密集刻度
    const range = timeRange.value.end - timeRange.value.start;
    const step = range > 200 ? 50 : (range > 100 ? 20 : 10);
    tickValues = d3.range(timeRange.value.start, timeRange.value.end + 1, step);
  }

  const axis = d3.axisBottom(xScale)
    .tickValues(tickValues)
    .tickSize(0)
    .tickFormat((d: any) => d + '年');

  g.append('g')
    .call(axis)
    .call(g => g.select('.domain').attr('stroke', '#999'))
    .selectAll('text')
    .style('font-size', '11px')
    .style('fill', '#666')
    .attr('y', 10);
};

// ==================== 生命周期 ====================

onMounted(() => {
  nextTick(() => {
    drawChart();
  });
  window.addEventListener('resize', drawChart);

  // 点击body关闭固定的tooltip
  document.addEventListener('click', (e) => {
    if (tooltip.value.pinned) {
      tooltip.value.show = false;
      tooltip.value.pinned = false;
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', drawChart);
  document.removeEventListener('click', () => {});
});
</script>

<style scoped>
.line-indicator {
  display: inline-block;
  width: 20px;
  height: 3px;
  margin-right: 6px;
  border-radius: 1px;
}

.silt-indicator {
  display: inline-block;
  width: 20px;
  height: 10px;
  margin-right: 6px;
  opacity: 0.6;
}
</style>
