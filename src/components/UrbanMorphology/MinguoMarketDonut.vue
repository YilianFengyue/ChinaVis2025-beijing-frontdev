<template>
  <v-card flat class="minguo-panel transparent">
    <!-- 头部 -->
    <div class="panel-header">
      <v-row align="center" dense no-gutters>
        <v-col cols="auto" class="d-flex align-center">
          <div class="header-block"></div>
          <div class="header-text-group">
            <h2 class="panel-title">市场镜像</h2>
            <span class="panel-subtitle">MARKET SPECTRUM · 民国</span>
          </div>
        </v-col>

        <v-spacer></v-spacer>

        <v-col cols="auto">
          <div class="source-tag">

            <span class="source-text">《老北京实用指南》</span>
          </div>
        </v-col>
      </v-row>

      <div class="desc-line">
        商铺名录中的业态/地名关键词分布（{{ totalCount }} 条记录）
      </div>
    </div>

    <!-- 主体：Treemap -->
    <div ref="treemapContainer" class="treemap-section">
      <svg ref="treemapSvg"></svg>
    </div>

    <!-- 底部图例 -->
    <div class="legend-footer">
      <div class="legend-items">
        <span 
          v-for="cls in CLASS_ORDER" 
          :key="cls"
          class="legend-item"
          :class="{ dimmed: categoryStats[cls]?.count === 0 }"
        >
          <span class="legend-dot" :style="{ background: CLASS_COLORS[cls] }"></span>
          <span class="legend-name">{{ cls }}</span>
          <span class="legend-count">{{ categoryStats[cls]?.count || 0 }}</span>
        </span>
      </div>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="tooltip.show"
          class="arch-tooltip"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >
          <div class="tt-header">
            <span class="tt-name">{{ tooltip.data.name }}</span>
            <span class="tt-category">{{ tooltip.data.category }}</span>
          </div>
          <div class="tt-row">
            <span class="tt-label">出现次数</span>
            <span class="tt-value">{{ tooltip.data.count }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import * as d3 from 'd3';
import minguoData from '@/data/property/minguo_shops.json';

// 🎨 低饱和高级灰色系（民国用更暖的灰调）
const CLASS_COLORS: Record<string, string> = {
  '粮食作物': '#B5A995',      // 米灰
  '畜牧与肉乳': '#9C8B7A',    // 驼灰
  '果蔬园艺': '#8A9B8A',      // 苔灰
  '矿盐与金属': '#7E8C91',    // 铁灰
  '手工业原料与特产': '#A0909A', // 藕灰
};

const CLASS_ORDER = ['矿盐与金属', '手工业原料与特产', '果蔬园艺', '畜牧与肉乳', '粮食作物'];

// 响应式状态
const treemapContainer = ref<HTMLElement | null>(null);
const treemapSvg = ref<SVGSVGElement | null>(null);

const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  data: {} as any,
});

// 计算每个类别的统计
const categoryStats = computed(() => {
  const stats: Record<string, { count: number; items: any[] }> = {};
  CLASS_ORDER.forEach(cls => {
    const items = minguoData.subitems[cls] || [];
    const count = items.reduce((sum: number, item: any) => sum + item.count, 0);
    stats[cls] = { count, items };
  });
  return stats;
});

const totalCount = computed(() => {
  return Object.values(categoryStats.value).reduce((sum, cat) => sum + cat.count, 0);
});

// ==================== 绘制 Treemap ====================
// ==================== 绘制 Treemap ====================
const drawTreemap = () => {
  if (!treemapSvg.value || !treemapContainer.value) return;

  const container = treemapContainer.value;
  const { width, height } = container.getBoundingClientRect();
  
  // 安全检查：如果宽度异常小，可能是尚未渲染，稍后重试
  if (width < 50) {
    setTimeout(drawTreemap, 100);
    return;
  }

  const svg = d3.select(treemapSvg.value)
    .attr('width', width)
    .attr('height', height || 240);

  svg.selectAll('*').remove();

  // 构建层次数据
  const hierarchyData = {
    name: 'root',
    children: CLASS_ORDER.filter(cls => categoryStats.value[cls]?.count > 0).map(cls => ({
      name: cls,
      children: categoryStats.value[cls].items.map(item => ({
        name: item.name,
        value: item.count,
        category: cls,
      })),
    })),
  };

  const root = d3.hierarchy(hierarchyData)
    .sum((d: any) => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  // 更紧凑的布局
  const treemap = d3.treemap<any>()
    .size([width, height || 240])
    .paddingInner(1)
    .paddingOuter(0)
    .paddingTop(0)
    .round(true);

  treemap(root);

  // 绘制叶节点
  const leaves = svg.selectAll('.leaf')
    .data(root.leaves())
    .enter()
    .append('g')
    .attr('class', 'leaf')
    .attr('transform', d => `translate(${d.x0},${d.y0})`);

  // 矩形
  leaves.append('rect')
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('fill', d => {
      const category = d.data.category;
      const baseColor = d3.color(CLASS_COLORS[category])!;
      const hsl = d3.hsl(baseColor);
      const maxValue = d3.max(root.leaves(), leaf => leaf.value) || 1;
      const ratio = (d.value || 0) / maxValue;
      // 调整亮度范围，使其看起来更有质感
      hsl.l = Math.max(0.45, Math.min(0.7, hsl.l + (1 - ratio) * 0.1));
      return hsl.toString();
    })
    .attr('opacity', 0)
    .attr('stroke', 'rgba(255,255,255,0.3)')
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .on('mouseenter', function(event, d) {
      d3.select(this)
        .interrupt()
        .attr('opacity', 1)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      tooltip.value = {
        show: true,
        x: event.clientX + 12,
        y: event.clientY - 35,
        data: {
          name: d.data.name,
          category: d.data.category,
          count: d.value,
        },
      };
    })
    .on('mousemove', (event) => {
      tooltip.value.x = event.clientX + 12;
      tooltip.value.y = event.clientY - 35;
    })
    .on('mouseleave', function() {
      d3.select(this)
        .transition().duration(200)
        .attr('opacity', 0.85)
        .attr('stroke', 'rgba(255,255,255,0.3)')
        .attr('stroke-width', 0.5);
      tooltip.value.show = false;
    })
    .transition()
    .duration(600)
    .delay((d, i) => i * 5) // Faster staggered animation
    .attr('opacity', 0.85);

  // 文字标签优化
  leaves.each(function(d) {
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    
    // 只在空间足够时显示
    if (w > 24 && h > 14) {
      const g = d3.select(this);
      
      const fontSize = Math.min(11, Math.max(9, w / 5));
      
      // 名称
      g.append('text')
        .attr('x', 3)
        .attr('y', 11)
        .style('font-size', fontSize + 'px')
        .style('fill', '#fff')
        .style('font-family', '"Source Han Serif SC", serif')
        .style('font-weight', '500')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .text(d.data.name)
        .transition()
        .delay(400)
        .duration(300)
        .style('opacity', 0.95);

      // 数量 (更大的空间)
      if (w > 40 && h > 28) {
        g.append('text')
          .attr('x', 3)
          .attr('y', h - 4)
          .style('font-size', '8px')
          .style('fill', 'rgba(255,255,255,0.8)')
          .style('font-family', '"Product Sans", sans-serif')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .text(d.value)
          .transition()
          .delay(500)
          .duration(300)
          .style('opacity', 1);
      }
    }
  });
};

onMounted(() => {
  // Use ResizeObserver for robust sizing
  const ro = new ResizeObserver(() => {
    requestAnimationFrame(drawTreemap);
  });
  if (treemapContainer.value) {
    ro.observe(treemapContainer.value);
  }
  
  // Cleanup on unmount (scoped variable workaround)
  (window as any)._treemapRO = ro; 
  
  nextTick(() => drawTreemap());
});

onUnmounted(() => {
  if ((window as any)._treemapRO) {
    (window as any)._treemapRO.disconnect();
  }
});
</script>

<style scoped>
.minguo-panel {
  --font-en: "Product Sans", "Helvetica Neue", sans-serif;
  --font-cn: "Source Han Serif SC", "Noto Serif SC", serif;
  background: rgba(255, 255, 255, 0.3) !important;
  backdrop-filter: none;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 头部 */
.panel-header {
  padding: 12px 16px 8px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.header-block {
  width: 4px;
  height: 22px;
  background: #8B7355;
  margin-right: 10px;
}

.header-text-group {
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-family: var(--font-cn);
  font-size: 15px;
  font-weight: 700;
  color: #4A4035;
  letter-spacing: 1px;
}

.panel-subtitle {
  font-family: var(--font-en);
  font-size: 8px;
  color: #9A8B7A;
  letter-spacing: 1px;
}

.source-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.06);
}

.source-icon {
  font-size: 10px;
}

.source-text {
  font-family: var(--font-cn);
  font-size: 9px;
  color: #7A6B5A;
}

.desc-line {
  font-size: 10px;
  color: #888;
  margin-top: 8px;
}

/* Treemap */
.treemap-section {
  width: 100%;
  height: 220px;
  padding: 8px;
}

/* 底部图例 */
.legend-footer {
  padding: 8px 14px;
  border-top: 1px solid rgba(0,0,0,0.05);
}

.legend-items {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  color: #666;
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

.legend-count {
  font-family: var(--font-en);
  color: #aaa;
  font-size: 8px;
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
  background: rgba(55, 48, 42, 0.94);
  color: #fff;
  padding: 8px 12px;
  font-size: 10px;
  pointer-events: none;
  box-shadow: 0 3px 10px rgba(0,0,0,0.12);
}

.tt-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 5px;
  border-bottom: 1px solid rgba(255,255,255,0.12);
  padding-bottom: 5px;
}

.tt-name {
  font-family: var(--font-cn);
  font-size: 12px;
  font-weight: 500;
}

.tt-category {
  font-size: 9px;
  color: rgba(255,255,255,0.5);
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
