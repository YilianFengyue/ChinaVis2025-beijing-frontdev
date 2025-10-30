<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import * as d3 from 'd3';
import { useTheme } from 'vuetify';

// 类型定义
interface SunburstNode {
  name: string;
  children?: SunburstNode[];
  value?: number;
}

// 示例数据（映射朝代-类别层级）
// --- MODIFIED: 更改了 value 值，使其具备不同占比 ---
const dynastyData = { 
  name: "root", 
  children: [ 
    { 
      name: '清', 
      children: [
        { name: '自然资源类', value: 5 },
        { name: '农作物类', value: 3 },
      ]
    },
    { 
      name: '秦汉', 
      children: [
        { name: '水文类', value: 2 },
        { name: '畜牧类', value: 4 },
      ]
    },
    { 
      name: '魏晋南北朝', 
      children: [
        { name: '工艺与纺织品类', value: 6 },
        { name: '食品加工类', value: 3 },
      ]
    },
    { 
      name: '隋唐五代', 
      children: [
        { name: '自然资源类', value: 7 },
        { name: '农作物类', value: 5 },
      ]
    },
    { 
      name: '北宋', 
      children: [
        { name: '水文类', value: 3 },
        { name: '畜牧类', value: 2 },
      ]
    },
    { 
      name: '南宋', 
      children: [
        { name: '工艺与纺织品类', value: 4 },
        { name: '食品加工类', value: 4 },
      ]
    },
    { 
      name: '元', 
      children: [
        { name: '自然资源类', value: 5 },
        { name: '农作物类', value: 1 },
      ]
    },
    { 
      name: '明', 
      children: [
        { name: '水文类', value: 8 },
        { name: '畜牧类', value: 6 },
      ]
    },
  ]
};

// Refs
const svgRef = ref<SVGSVGElement | null>(null);
const tooltipRef = ref<HTMLDivElement | null>(null); // --- NEW: 增加了 Tooltip 的 ref ---
const vuetifyTheme = useTheme();

// 尺寸配置
const width = 500;
const height = 500;
const radius = Math.min(width, height) / 2;

// 颜色配置（与参考保持风格一致）
const colors = computed(() => {
  const base = [
    '#d8b98b', '#c7a37a', '#b08c6b', '#957159', 
    '#7a5a48', '#624538', '#4d332a','#a1a36e'
  ];
  const categoryBase = [
    '#87a79a', '#a5c0b0', '#c2d8c7', 
    '#e0f0de', '#6b8a7f', '#4e6d62'
  ];
  return {
    dynasty: base,
    category: categoryBase
  };
});

// 初始化旭日图
const initSunburst = () => {
  if (!svgRef.value || !tooltipRef.value) return;

  // --- NEW: 选择 tooltip ---
  const tooltip = d3.select(tooltipRef.value);

  // 清空已有内容
  d3.select(svgRef.value).html('');

  // 创建分区布局
  const partition = d3.partition()
    .size([2 * Math.PI, radius]);

  // 层次化数据
  const root = d3.hierarchy(dynastyData as SunburstNode)
    .sum(d => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  // 计算分区
  partition(root);

  // 创建弧生成器
  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => Math.max(0, d.y0))
    .outerRadius(d => Math.max(0, d.y1));

  // 创建用于鼠标交互的弧（更大的可点击区域）
  const mouseArc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => Math.max(0, d.y0 - 10))
    .outerRadius(d => Math.max(0, d.y1 + 10));

  // 创建SVG容器
  const svg = d3.select(svgRef.value)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("font", "12px sans-serif");

  // 中心分组
  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // 绘制扇形
  const path = g.selectAll("path")
    .data(root.descendants().filter(d => d.depth > 0 && d.x1 - d.x0 > 0.001))
    .join("path")
    .attr("fill", d => {
      if (d.depth === 1) {
        return colors.value.dynasty[d.data.name === '清' ? 0 : 
                                 d.data.name === '秦汉' ? 1 : 
                                 d.data.name === '魏晋南北朝' ? 2 : 
                                 d.data.name === '隋唐五代' ? 3 : 
                                 d.data.name === '北宋' ? 4 : 
                                 d.data.name === '南宋' ? 5 : 
                                 d.data.name === '元' ? 6 : 7];
      } else {
        return colors.value.category[d.data.name === '自然资源类' ? 0 : 
                                    d.data.name === '农作物类' ? 1 : 
                                    d.data.name === '水文类' ? 2 : 
                                    d.data.name === '畜牧类' ? 3 : 
                                    d.data.name === '工艺与纺织品类' ? 4 : 5];
      }
    })
    .attr("d", arc)
    .attr("stroke", vuetifyTheme.global.current.value.dark ? "#111b27" : "#f2f5f8")
    .attr("stroke-width", 2);

  // 交互层（鼠标悬停）
  // --- MODIFIED: 增加了 mouseenter, mousemove, mouseleave 的 Tooltip 逻辑 ---
  const interaction = g.append("g")
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .selectAll("path")
    .data(root.descendants().filter(d => d.depth > 0 && d.x1 - d.x0 > 0.001))
    .join("path")
    .attr("d", mouseArc)
    .on("mouseenter", (event, d) => {
      // 高亮祖先节点
      const sequence = d.ancestors().reverse().slice(1);
      path.attr("fill-opacity", node => 
        sequence.indexOf(node) >= 0 ? 1.0 : 0.3
      );
      
      // --- NEW: 显示 Tooltip ---
      tooltip.style("opacity", 1)
             .style("display", "block")
             .html(`<strong>${d.data.name}</strong><br>占比: ${d.value}`);
    })
    .on("mousemove", (event) => {
      // --- NEW: Tooltip 跟随鼠标 ---
      // d3.pointer(event, svgRef.value) 获取相对于 SVG 容器的坐标
      const [x, y] = d3.pointer(event, svgRef.value);
      tooltip.style("left", (x + 15) + "px")
             .style("top", (y + 10) + "px");
    })
    .on("mouseleave", () => {
      // --- NEW: 隐藏 Tooltip 和取消高亮 ---
      path.attr("fill-opacity", 1);
      tooltip.style("opacity", 0)
             .style("display", "none");
    });

  // 适配主题
  svg.style("background-color", vuetifyTheme.global.current.value.dark ? "#222" : "#fff");
};

// 生命周期
onMounted(() => {
  initSunburst();
});

// 监听主题变化
watch(() => vuetifyTheme.global.current.value.dark, () => {
  initSunburst();
});
</script>

<template>
  <v-card>
    <v-card-title>序列旭日图</v-card-title>
    <v-card-text class="chart-container">
      <svg ref="svgRef" :width="500" :height="500"></svg>
      <div ref="tooltipRef" class="sunburst-tooltip"></div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
/* MODIFIED: 调整了 v-card-text 并增加了 tooltip 样式 */
.chart-container {
  position: relative; /* 为 tooltip 提供绝对定位的锚点 */
  padding: 0 !important;
}
svg {
  display: block;
  margin: 0 auto;
}

.sunburst-tooltip {
  position: absolute; /* 相对于 .chart-container 定位 */
  opacity: 0;
  display: none; /* 初始隐藏 */
  background-color: rgba(30, 30, 30, 0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none; /* 关键：让鼠标事件穿透到下面的 D3 交互层 */
  transition: opacity 0.2s ease-in-out;
  z-index: 10;
  white-space: nowrap; /* 防止 Tooltip 内容换行 */
}
</style>