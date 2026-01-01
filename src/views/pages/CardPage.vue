<template>
  <v-app class="bg-transparent font-sans">
    
    <div class="fixed-map-container" ref="mapContainer">
      <v-img 
        src="https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=1920&auto=format&fit=crop" 
        cover 
        class="w-100 h-100 opacity-90 transition-all duration-700"
        gradient="to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.6) 100%"
      ></v-img>
      
      <div class="absolute top-10 left-10 z-20 text-white/90 mix-blend-overlay">
        <div class="text-h1 font-weight-black tracking-tighter" style="font-size: 8rem !important; opacity: 0.1">
          {{ currentMapState.id }}
        </div>
        <div class="text-h3 font-weight-bold mt-n10 ml-2">{{ currentMapState.title }}</div>
        <div class="d-flex align-center mt-4 ml-2">
          <div class="w-2 h-2 bg-[#FFFA00] mr-2 animate-pulse"></div>
          <div class="text-caption font-mono tracking-widest border border-white/30 px-2 py-1">
            LAYER: {{ currentMapState.layer }}
          </div>
        </div>
      </div>
    </div>

    <v-main class="scroll-content">
      
      <section class="h-screen d-flex flex-column justify-center align-center relative text-white">
        <div class="text-center backdrop-blur-md bg-black/40 pa-16 border border-white/10 shadow-2xl">
          <h1 class="text-[6rem] leading-none font-weight-black mb-0 tracking-tighter">BEIJING</h1>
          <h2 class="text-h4 font-weight-light mb-8 tracking-[1em] ml-4">CHRONICLES</h2>
          <div class="text-caption font-mono text-[#FFFA00]">SCROLL TO INITIALIZE DATA STREAM</div>
        </div>
      </section>

      <section class="stack-track" ref="track">
        
        <div class="sticky-viewport d-flex align-center justify-end">
          
          <div class="card-stack-wrapper relative">
            
            <div 
              v-for="(task, index) in tasks" 
              :key="index"
              class="task-group-container absolute inset-0 d-flex flex-column px-8 py-10"
              :class="`group-${index}`"
            >
              
              <div class="flex-grow-0 d-flex align-end mb-4 text-white">
                <span class="text-[5rem] leading-none font-weight-black text-[#FFFA00] opacity-90 mr-4 shadow-text">0{{ index + 1 }}</span>
                <div class="pb-3 border-b border-white/30 flex-grow-1 d-flex justify-space-between align-end">
                   <div>
                     <h3 class="text-h4 font-weight-bold uppercase">{{ task.title }}</h3>
                     <div class="text-caption font-mono opacity-80">{{ task.sub }}</div>
                   </div>
                   <div class="d-flex gap-2">
                     <v-chip v-for="t in task.tables" :key="t" size="small" variant="outlined" color="white" class="font-mono">{{ t }}</v-chip>
                   </div>
                </div>
              </div>

              <v-row dense class="flex-grow-1">
                
                <v-col cols="12" md="8" class="d-flex flex-column h-100">
                  <v-card 
                    class="flex-grow-1 rounded-0 border-0 d-flex flex-column" 
                    elevation="10"
                    color="grey-lighten-5"
                    v-ripple
                  >
                     <div class="d-flex justify-space-between pa-3 border-b bg-white">
                       <span class="text-caption font-weight-bold text-grey-darken-2">MAIN_VISUALIZATION_VIEW</span>
                       <v-icon size="small">mdi-fullscreen</v-icon>
                     </div>
                     <div class="flex-grow-1 relative d-flex align-center justify-center overflow-hidden">
                       <v-icon size="100" color="grey-lighten-2">{{ task.icon }}</v-icon>
                       <div class="absolute inset-0 grid-bg opacity-10 pointer-events-none"></div>
                       
                       <div class="absolute bottom-4 left-4 bg-black text-white px-2 py-1 text-caption font-mono">
                         Interactive Chart Component
                       </div>
                     </div>
                  </v-card>
                </v-col>

                <v-col cols="12" md="4" class="d-flex flex-column h-100">
                  
                  <v-card 
                    class="flex-grow-0 mb-2 rounded-0 bg-[#1A1A1A] text-white" 
                    elevation="10"
                    height="30%"
                    v-ripple
                  >
                    <div class="pa-5 h-100 d-flex flex-column justify-center relative overflow-hidden">
                      <v-icon class="absolute top-n4 right-n4 opacity-10" size="100" color="white">{{ task.icon }}</v-icon>
                      <div class="text-caption text-[#FFFA00] mb-1 font-mono">KEY_METRIC</div>
                      <div class="text-h3 font-weight-black">{{ task.stat }}</div>
                      <v-progress-linear model-value="70" color="#FFFA00" height="4" class="mt-4 opacity-50"></v-progress-linear>
                    </div>
                  </v-card>

                  <v-card 
                    class="flex-grow-1 rounded-0" 
                    elevation="10"
                    v-ripple
                  >
                    <div class="pa-5 h-100 d-flex flex-column bg-white">
                      <div class="d-flex align-center mb-3">
                         <div class="w-1 h-4 bg-[#FFFA00] mr-2"></div>
                         <span class="text-overline font-weight-bold text-grey-darken-3">DATA INSIGHTS</span>
                      </div>
                      <p class="text-body-2 leading-loose text-justify text-grey-darken-3 flex-grow-1 overflow-y-auto pr-2">
                        {{ task.desc }}
                      </p>
                      
                      <div class="mt-3 pt-3 border-t d-flex justify-space-between align-center">
                        <span class="text-caption text-grey">SOURCE: HISTORICAL RECORDS</span>
                        <v-btn size="small" variant="text" color="black">DETAILS <v-icon end>mdi-arrow-right</v-icon></v-btn>
                      </div>
                    </div>
                  </v-card>

                </v-col>

                <v-col cols="12" class="flex-grow-0 mt-2">
                   <v-card 
                      class="rounded-0 bg-[#FFFA00]" 
                      elevation="10"
                      height="64"
                      v-ripple
                    >
                      <div class="d-flex align-center justify-space-between px-6 h-100 text-black">
                         <div class="d-flex align-center">
                           <v-icon class="mr-3">mdi-link-variant</v-icon>
                           <span class="font-weight-bold mr-2">LINKAGE ANALYSIS:</span>
                           <span class="font-mono text-body-2">{{ task.linkTarget }}</span>
                         </div>
                         <v-btn icon variant="text" density="comfortable"><v-icon>mdi-chevron-down</v-icon></v-btn>
                      </div>
                   </v-card>
                </v-col>

              </v-row>
              
            </div>

          </div>
        </div>

      </section>

      <section class="h-[50vh] bg-black d-flex align-center justify-center text-white relative z-20">
        <h2>END OF NARRATIVE</h2>
      </section>

    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const tasks = [
  { 
    title: 'Ecological Evolution', sub: '生态环境长期演化 (T1)', 
    desc: '永定河被称为“无定河”，其频繁改道直接决定了古代北京城的选址与废弃。通过分析水系变迁数据，我们发现金中都的建立与莲花池水系密切相关，而元大都的兴起则依赖于积水潭水域的供水能力。同时，气候波动导致的干旱周期也与城市人口的几次大规模缩减呈现高度正相关。',
    icon: 'mdi-waves', stat: '5 Major Shifts', tables: ['02水系', '03气候'], linkTarget: '→ T3 交通网络 & 漕运体系'
  },
  { 
    title: 'Shock Events', sub: '冲击事件时空分布 (T2)', 
    desc: '北京历史上经历了多次严重的自然灾害与战争冲击。热力图显示，明代的洪涝灾害呈现出显著的“东南多、西北少”的空间特征，直接影响了城南的排水系统建设。靖难之役等战争事件则直接重塑了城墙防御体系，促成了内城与外城的双重结构形成。',
    icon: 'mdi-flash', stat: '142 Recorded Events', tables: ['05灾害', '18战争'], linkTarget: '→ T4 建制沿革 & 城市边界'
  },
  { 
    title: 'Internal Mechanism', sub: '内部机制驱动 (T3)', 
    desc: '人口、交通与物产三者构成了城市发展的内在引擎。桑基图清晰地展示了从元代到清代，人口重心如何随着大运河终点的变迁而发生移动。积水潭作为漕运终点，在元代催生了繁荣的鼓楼商圈，而明代运河截弯取直后，东部商圈逐渐兴起。',
    icon: 'mdi-account-group', stat: '21.8M Peak Pop', tables: ['11人口', '16交通'], linkTarget: '→ T1 植被物产 & 资源供给'
  },
  { 
    title: 'Institutional Logic', sub: '制度经济重构 (T4)', 
    desc: '制度变迁是塑造北京城市形态的隐形之手。可视分析揭示了从唐代的封闭里坊制，到宋元的街巷制，再到明清的官营手工业区划分，政治制度如何一步步解构物理空间。特别是官营手工业区的分布，严格遵循了“前朝后市”的制度逻辑。',
    icon: 'mdi-bank', stat: '3 Economic Zones', tables: ['07建制', '14商业'], linkTarget: '→ T5 综合叙事 & 关键节点'
  }
];

const currentMapState = ref({ id: '00', title: 'OVERVIEW', layer: 'BASE' });
let ctx: gsap.Context;

onMounted(() => {
  ctx = gsap.context(() => {
    
    // 1. 地图动作：全屏 -> 左侧做背景
    // 这里我们不缩得太小，因为我们要的是“沾满右边”，左边留一点氛围即可
    // 实际上我们可以让地图稍微暗一点，作为全局背景，只把右侧主要区域让出来
    gsap.fromTo(".fixed-map-container", 
      { filter: "brightness(1) blur(0px)" }, 
      { 
        filter: "brightness(0.4) blur(4px)", // 变暗模糊，突出右侧内容
        ease: "none",
        scrollTrigger: {
          trigger: ".stack-track", 
          start: "top bottom",     
          end: "top top",          
          scrub: true
        }
      }
    );

    // 2. 卡片组切换 (Staggered Stack)
    const groups = gsap.utils.toArray(".task-group-container");
    const totalGroups = groups.length;
    
    // 初始化：隐藏
    gsap.set(groups, { opacity: 0, scale: 0.95, pointerEvents: "none" });
    
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".stack-track",
        start: "top top",      
        end: "bottom bottom",  
        scrub: 0.5,            
      }
    });

    groups.forEach((group, i) => {
      // 进场：从右侧稍微滑入，或者原地放大
      tl.to(group, {
        opacity: 1,
        scale: 1,
        pointerEvents: "auto",
        duration: 1,
        ease: "power2.out",
        onStart: () => updateMap(i), 
        onReverseComplete: () => updateMap(i-1)
      });

      // 停留 (Stay)
      tl.to(group, { duration: 1.5 });

      // 离场 (非最后一张)
      if (i < totalGroups - 1) {
        tl.to(group, {
          opacity: 0,
          scale: 1.05, // 放大淡出，更有镜头感
          filter: "blur(10px)",
          pointerEvents: "none",
          duration: 1
        });
      }
    });

  });
});

const updateMap = (i: number) => {
  if (i < 0) {
    currentMapState.value = { id: '00', title: 'OVERVIEW', layer: 'BASE' };
    return;
  }
  const t = tasks[i];
  if(t) currentMapState.value = { id: `0${i+1}`, title: t.title.toUpperCase(), layer: t.sub };
};

onUnmounted(() => ctx?.revert());
</script>

<style scoped>
.fixed-map-container {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  z-index: 0;
  background: #000;
}

.scroll-content {
  position: relative;
  z-index: 10;
  pointer-events: none; 
}

/* 恢复右侧卡片交互 */
.task-group-container {
  pointer-events: auto;
}

/* 轨道 */
.stack-track {
  height: 500vh; 
  position: relative;
}

.sticky-viewport {
  position: sticky;
  top: 0;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

/* 右侧卡片堆叠容器 */
.card-stack-wrapper {
  width: 60vw;  /* 占据右侧 60% */
  height: 100vh; /* 撑满全屏高度 */
  position: relative;
  /* background: rgba(255, 0, 0, 0.1); 调试用 */
}

/* 单个任务组容器 */
.task-group-container {
  width: 100%;
  height: 100vh; /* 强制撑满 */
  box-sizing: border-box;
  /* 背景虚化，增加层次感 */
  /* backdrop-filter: blur(10px); */
}

/* 辅助：网格背景 */
.grid-bg {
  background-image: linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px);
  background-size: 20px 20px;
}

.shadow-text {
  text-shadow: 0 4px 10px rgba(0,0,0,0.5);
}

/* 字体微调 */
.text-justify {
  text-align: justify;
}
</style>