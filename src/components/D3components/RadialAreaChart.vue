<!-- 径向面积图 -->
 <template>
  <v-card class="chart-card" elevation="0" variant="outlined">
    <v-card-title class="chart-title">
      岁时纪 · 繁荣指数 (径向图)
    </v-card-title>
    <v-card-text class="chart-container">
      <div ref="svgContainer"></div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import * as d3 from 'd3';
import { useTheme } from 'vuetify';

// --- 1. 静态数据：仿照都城纪事，虚构一年12个月的“繁荣指数” ---
// 数据必须在 D3 代码硬编码的 "2000-01-01" 到 "2001-01-01" 范围之内
const annualData = [
  // 月, 平均, 常规波动 (min/max), 极端波动 (minmin/maxmax)
  [1, 50, 45, 55, 30, 60], // 一月 (正月)
  [2, 52, 48, 58, 32, 65], // 二月
  [3, 58, 55, 62, 40, 70], // 三月 (春和)
  [4, 65, 60, 70, 50, 75], // 四月
  [5, 70, 68, 75, 55, 80], // 五月
  [6, 75, 70, 80, 60, 85], // 六月 (盛夏)
  [7, 72, 68, 78, 58, 82], // 七月
  [8, 78, 75, 82, 65, 90], // 八月 (秋盛)
  [9, 70, 65, 75, 55, 80], // 九月
  [10, 62, 58, 68, 45, 75], // 十月
  [11, 55, 50, 60, 38, 68], // 十一月
  [12, 53, 48, 58, 35, 65], // 十二月 (腊月)
].map(d => ({
  date: new Date(2000, d[0] - 1, 15), // 每月15号
  avg: d[1],
  min: d[2],
  max: d[3],
  minmin: d[4],
  maxmax: d[5],
}));

// --- 2. Vue Refs 和 Vuetify 主题 ---
const svgContainer = ref<HTMLElement | null>(null);
const vuetifyTheme = useTheme();

// --- 3. 仿古风格配色 ---
const themeColors = computed(() => {
  const isDark = vuetifyTheme.global.current.value.dark;
  
  // 仿古浅色（米白背景）
  const antiqueLight = {
    bg: "#fcfaf6", // 纸莎草纸米白
    text: "#5a4b40", // 深棕文字
    textLight: "#6d5f53", // 中棕文字
    stroke: "#dcd3c5", // 边框
    areaLight: "rgba(161, 136, 127, 0.2)", // 浅褐色 (来自 getTagColor)
    areaDark: "rgba(161, 136, 127, 0.5)", // 褐色
    line: "#BF360C", // 暗红 (来自 getTagColor)
  };

  // 仿古深色（暂定，可调整）
  const antiqueDark = {
    bg: "#263238", // 深灰蓝
    text: "#D7CCC8", // 浅棕
    textLight: "#A1887F", // 中棕
    stroke: "#4E342E", // 深棕
    areaLight: "rgba(161, 136, 127, 0.2)",
    areaDark: "rgba(161, 136, 127, 0.5)",
    line: "#FF8A65", // 亮橙
  };
  
  return isDark ? antiqueDark : antiqueLight;
});


// --- 4. D3 绘图函数 ---
const createChart = () => {
  if (!svgContainer.value) return;

  const data = annualData;
  const colors = themeColors.value;
  
  // 清空之前的 SVG
  d3.select(svgContainer.value).html('');

  const width = 928;
  const height = width;
  const margin = 10;
  const innerRadius = width / 5;
  const outerRadius = width / 2 - margin;

  const x = d3.scaleUtc()
      .domain([new Date("2000-01-01"), new Date("2001-01-01") - 1])
      .range([0, 2 * Math.PI]);

  const y = d3.scaleRadial()
      .domain([d3.min(data, d => d.minmin), d3.max(data, d => d.maxmax)])
      .range([innerRadius, outerRadius]);

  const line = d3.lineRadial()
      .curve(d3.curveLinearClosed)
      .angle(d => x(d.date));

  const area = d3.areaRadial()
      .curve(d3.curveLinearClosed)
      .angle(d => x(d.date));

  const svg = d3.select(svgContainer.value).append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", "width: 100%; height: auto; font: 10px sans-serif;")
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

  // 替换颜色：最外层区域 (极端波动)
  svg.append("path")
      .attr("fill", colors.areaLight)
      .attr("fill-opacity", 0.5) // 调淡一点
      .attr("d", area
          .innerRadius(d => y(d.minmin))
          .outerRadius(d => y(d.maxmax))
        (data));

  // 替换颜色：内层区域 (常规波动)
  svg.append("path")
      .attr("fill", colors.areaDark)
      .attr("fill-opacity", 0.7)
      .attr("d", area
          .innerRadius(d => y(d.min))
          .outerRadius(d => y(d.max))
        (data));

  // 替换颜色：平均线
  svg.append("path")
      .attr("fill", "none")
      .attr("stroke", colors.line)
      .attr("stroke-width", 1.5)
      .attr("d", line
          .radius(d => y(d.avg))
        (data));

  // X 轴 (月份)
  svg.append("g")
    .selectAll()
    .data(x.ticks())
    .join("g")
      // 适配：替换 DOM.uid
      .each((d, i) => (d.id = `month-arc-${i}`))
      .call(g => g.append("path")
          .attr("stroke", colors.text) // 替换颜色
          .attr("stroke-opacity", 0.2)
          .attr("d", d => `
            M${d3.pointRadial(x(d), innerRadius)}
            L${d3.pointRadial(x(d), outerRadius)}
          `))
      .call(g => g.append("path")
          .attr("id", d => d.id) // 适配
          .datum(d => [d, d3.utcMonth.offset(d, 1)])
          .attr("fill", "none")
          .attr("d", ([a, b]) => `
            M${d3.pointRadial(x(a), innerRadius)}
            A${innerRadius},${innerRadius} 0,0,1 ${d3.pointRadial(x(b), innerRadius)}
          `))
      .call(g => g.append("text")
        .append("textPath")
          .attr("startOffset", 6)
          .attr("xlink:href", d => `#${d.id}`) // 适配
          .text(d3.utcFormat("%B")) // %B 是英文月份 (January...)
          .attr("fill", colors.textLight) // 替换颜色
          .attr("font-size", "10px")
          .attr("font-weight", "500")
      );

  // Y 轴 (指数)
  svg.append("g")
      .attr("text-anchor", "middle")
    .selectAll()
    .data(y.ticks().reverse())
    .join("g")
      .call(g => g.append("circle")
          .attr("fill", "none")
          .attr("stroke", colors.text) // 替换颜色
          .attr("stroke-opacity", 0.2)
          .attr("r", y))
      .call(g => g.append("text")
          .attr("y", d => -y(d))
          .attr("dy", "0.35em")
          .attr("stroke", colors.bg) // 替换颜色 (仿古背景色)
          .attr("stroke-width", 5)
          .attr("fill", colors.textLight) // 替换颜色 (仿古文字)
          .attr("paint-order", "stroke")
           // 适配：替换 "°F" 为 "指数"
          .text((x, i) => `${x.toFixed(0)}${i ? "" : " 指数"}`)
        .clone(true)
          .attr("y", d => y(d)));
};

// --- 5. Vue 生命周期 ---
onMounted(() => {
  createChart();
});

watch(themeColors, () => {
  createChart();
});
</script>

<style scoped lang="scss">
// 引入仿古风格
$bg-color: #fcfaf6;
$card-bg-color: #faf6f0;
$border-color: #dcd3c5;
$text-dark-brown: #5a4b40;
$text-mid-brown: #6d5f53;

.chart-card {
  background-color: $card-bg-color;
  border: 1px solid $border-color;
  
  // 适配 Vuetify 3 暗黑模式
  &.v-theme--dark {
    background-color: #263238;
    border-color: #4E342E;
  }
}

.chart-title {
  font-weight: 600;
  color: $text-dark-brown;
  
  // 适配 Vuetify 3 暗黑模式
  .v-theme--dark & {
    color: #D7CCC8;
  }
}

.chart-container {
  padding: 0;
  margin: 0;

  // D3 创建的 SVG 是动态的，使用 :deep() 来穿透样式
  :deep(svg) {
    background-color: v-bind('themeColors.bg');
  }
}
</style>