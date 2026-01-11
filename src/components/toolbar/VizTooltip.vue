<template>
  <v-card
    v-if="show"
    class="viz-tooltip"
    :style="positionStyle"
    elevation="12"
    color="white"
  >
    <v-card-title class="tooltip-header py-2 px-4 text-subtitle-2">
      <slot name="title">
        <strong>{{ title }}</strong>
      </slot>
      <v-btn
        v-if="pinned"
        icon="mdi-close"
        size="x-small"
        variant="text"
        class="float-right ml-2"
        @click="$emit('close')"
      ></v-btn>
    </v-card-title>

    <v-card-text class="pa-4">
      <div class="text-body-2" style="line-height: 1.8;">
        <slot name="content"></slot>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  show: boolean;
  x: number;
  y: number;
  pinned?: boolean;
  title?: string;
}>();

defineEmits(['close']);

const positionStyle = computed(() => ({
  position: 'fixed',
  left: `${props.x}px`,
  top: `${props.y}px`,
  zIndex: 9999,
  pointerEvents: props.pinned ? 'auto' : 'none', // 未钉住时穿透鼠标，防止闪烁
  maxWidth: '400px',
  fontFamily: '"Source Han Serif SC", serif' // 强制继承字体
}));
</script>

<style scoped>
/* 核心样式抽取 */
.viz-tooltip {
  transition: opacity 0.1s ease;
}

.tooltip-header {
  background: #FFF8E1; /* 米黄色背景 */
  border-bottom: 2px solid #FFD54F; /* 底部金线 */
  color: #333;
}
</style>