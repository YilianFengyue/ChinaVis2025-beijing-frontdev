<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import * as d3 from 'd3';
import { useTheme } from 'vuetify';
// 导入线索收集器
import { useClueCollector } from '@/composables/useClueCollector';

const { collectClue } = useClueCollector();

// 类型定义
interface SunburstNode {
  name: string;
  children?: SunburstNode[];
  value?: number;
}

// 示例数据
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
const tooltipRef = ref<HTMLDivElement | null>(null);
const vuetifyTheme = useTheme();

// 尺寸配置
const width = 500;
const height = 500;
const radius = Math.min(width, height) / 2;

// --- MODIFIED: 仿古风格配色 ---
const themeColors = computed(() => {
  const isDark = vuetifyTheme.global.current.value.dark;
  
  const antiqueLight = {
    bg: "#faf6f0", // 卡片米色 (用于 SVG 描边和容器背景)
    dynasty: ['#d8b98b', '#c7a37a', '#b08c6b', '#957159', '#7a5a48', '#624538', '#4d322a', '#a1a36e'],
    category: ['#87a79a', '#a5c0b0', '#c2d8c7', '#e0f0de', '#6b8a7f', '#4e6d62']
  };

  const antiqueDark = {
    bg: "#263238", // 深灰蓝 (用于 SVG 描边和容器背景)
    dynasty: ['#d8b98b', '#c7a37a', '#b08c6b', '#957159', '#7a5a48', '#624538', '#4d322a', '#a1a36e'],
    category: ['#87a79a', '#a5c0b0', '#c2d8c7', '#e0f0de', '#6b8a7f', '#4e6d62']
  };
  
  return isDark ? antiqueDark : antiqueLight;
});

// 颜色配置（与参考保持风格一致）
// MODIFIED: 重命名为 d3Colors 以避免与 themeColors 冲突
const d3Colors = computed(() => {
  return {
    dynasty: themeColors.value.dynasty,
    category: themeColors.value.category
  };
});

// 初始化旭日图
const initSunburst = () => {
  if (!svgRef.value || !tooltipRef.value) return;

  const tooltip = d3.select(tooltipRef.value);
  const currentColors = themeColors.value; // 获取当前主题颜色

  d3.select(svgRef.value).html('');

  const partition = d3.partition()
    .size([2 * Math.PI, radius]);

  const root = d3.hierarchy(dynastyData as SunburstNode)
    .sum(d => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  partition(root);

  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => Math.max(0, d.y0))
    .outerRadius(d => Math.max(0, d.y1));

  const mouseArc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => Math.max(0, d.y0 - 10))
    .outerRadius(d => Math.max(0, d.y1 + 10));

  const svg = d3.select(svgRef.value)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("font", "12px sans-serif");
    // --- MODIFIED: 移除了 svg.style("background-color", ...) ---

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const path = g.selectAll("path")
    .data(root.descendants().filter(d => d.depth > 0 && d.x1 - d.x0 > 0.001))
    .join("path")
    .attr("fill", d => {
      if (d.depth === 1) {
        return d3Colors.value.dynasty[d.data.name === '清' ? 0 : 
                                 d.data.name === '秦汉' ? 1 : 
                                 d.data.name === '魏晋南北朝' ? 2 : 
                                 d.data.name === '隋唐五代' ? 3 : 
                                 d.data.name === '北宋' ? 4 : 
                                 d.data.name === '南宋' ? 5 : 
                                 d.data.name === '元' ? 6 : 7];
      } else {
        return d3Colors.value.category[d.data.name === '自然资源类' ? 0 : 
                                    d.data.name === '农作物类' ? 1 : 
                                    d.data.name === '水文类' ? 2 : 
                                    d.data.name === '畜牧类' ? 3 : 
                                    d.data.name === '工艺与纺织品类' ? 4 : 5];
      }
    })
    .attr("d", arc)
    // --- MODIFIED: 描边使用卡片背景色 ---
    .attr("stroke", currentColors.bg) 
    .attr("stroke-width", 2);

  // 交互层（鼠标悬停）
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
      
      // 显示 Tooltip
      tooltip.style("opacity", 1)
             .style("display", "block")
             .html(`<strong>${d.data.name}</strong><br>占比: ${d.value}`);
    })
    .on("mousemove", (event) => {
      // Tooltip 跟随鼠标
      const [x, y] = d3.pointer(event, svgRef.value);
      tooltip.style("left", (x + 15) + "px")
             .style("top", (y + 10) + "px");
    })
    .on("mouseleave", () => {
      // 隐藏 Tooltip 和取消高亮
      path.attr("fill-opacity", 1);
      tooltip.style("opacity", 0)
             .style("display", "none");
    })
    .on("dblclick", (event, d) => {
      // 双击收集旭日图扇形
      const ancestors = d.ancestors().reverse().slice(1);
      const pathStr = ancestors.map((a: any) => a.data.name).join(' > ');
      collectClue({
        title: d.data.name,
        content: `占比: ${d.value}, 路径: ${pathStr}`,
        subLabel: d.depth === 1 ? d.data.name : ancestors[0]?.data.name || ''
      }, 'clue_event', '物产旭日图');
    });
};

// 生命周期
onMounted(() => {
  // 延迟执行确保容器尺寸
  setTimeout(initSunburst, 300);
});

// 监听主题变化
watch(() => vuetifyTheme.global.current.value.dark, () => {
  // 主题变化时重绘
  nextTick(initSunburst);
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

<style scoped lang="scss">
// --- 仿古风格 (卡片, 标题, 容器) ---
$bg-color: #fcfaf6;
$card-bg-color: #faf6f0;
$border-color: #dcd3c5;
$text-dark-brown: #5a4b40;

.v-card {
  background-color: $card-bg-color !important;
  border: 1px solid $border-color !important;
  overflow: hidden; 

  &.v-theme--dark {
    background-color: #263238 !important;
    border-color: #4E342E !important;
  }
}

.v-card-title {
  color: $text-dark-brown !important;
  font-weight: 600;

  .v-theme--dark & {
    color: #D7CCC8 !important;
  }
}

.v-card-text {
  padding: 0 !important;
  height: 500px; /* 匹配 SVG 尺寸 */
  width: 100%;
  position: relative; 
  
  // --- MODIFIED: 添加背景色以填充 SVG 中心 ---
  background-color: $card-bg-color;
  .v-theme--dark & {
    background-color: #263238;
  }
}

/* .chart-container 样式已合并到 .v-card-text */
/* .chart-container {
  position: relative; 
  padding: 0 !important;
} */

svg {
  display: block;
  margin: 0 auto;
  // SVG 默认为透明，将显示 .v-card-text 的背景色
}

/* Tooltip 样式 */
.sunburst-tooltip {
  position: absolute; 
  opacity: 0;
  display: none; 
  background-color: rgba(30, 30, 30, 0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none; 
  transition: opacity 0.2s ease-in-out;
  z-index: 10;
  white-space: nowrap; 
}
</style>