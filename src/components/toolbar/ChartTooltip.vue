<template>
  <Teleport to="body">
    <v-card
      v-if="show"
      class="chart-tooltip"
      :style="{
        position: 'fixed',
        left: x + 'px',
        top: y + 'px',
        zIndex: 9999,
        pointerEvents: pinned ? 'auto' : 'none',
        maxWidth: maxWidth + 'px',
        minWidth: minWidth ? minWidth + 'px' : undefined
      }"
      elevation="12"
      color="white"
    >
      <v-card-title
        class="text-subtitle-2 py-2 px-4"
        :style="{ background: headerBgColor, borderBottom: `2px solid ${headerBorderColor}` }"
      >
        <strong>{{ titleLabel }}{{ title }}</strong>
        <v-btn
          v-if="pinned"
          icon="mdi-close"
          size="x-small"
          variant="text"
          style="float: right;"
          @click="$emit('close')"
        ></v-btn>
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="text-body-2" style="line-height: 1.8;">
          <div v-if="subtitle" class="mb-2">
            <span style="color: #666;">{{ subtitleLabel }}：</span>
            <strong>{{ subtitle }}</strong>
          </div>
          <template v-for="(field, index) in fields" :key="index">
            <div v-if="field.value" class="mb-2">
              <span style="color: #666;">{{ field.label }}：</span>
              <strong>{{ field.value }}</strong>
            </div>
          </template>
          <div v-if="note" style="border-top: 1px solid #E0E0E0; padding-top: 8px; margin-top: 8px;">
            <span style="color: #666;">{{ noteLabel }}：</span>
            <div style="margin-top: 4px; max-height: 150px; overflow-y: auto;">
              {{ note }}
            </div>
          </div>
          <slot></slot>
        </div>
      </v-card-text>
    </v-card>
  </Teleport>
</template>

<script setup lang="ts">
interface TooltipField {
  label: string;
  value: string | number | null | undefined;
}

interface Props {
  show: boolean;
  x: number;
  y: number;
  pinned?: boolean;
  title: string;
  titleLabel?: string;
  subtitle?: string | null;
  subtitleLabel?: string;
  fields?: TooltipField[];
  note?: string | null;
  noteLabel?: string;
  maxWidth?: number;
  minWidth?: number;
  headerBgColor?: string;
  headerBorderColor?: string;
}

withDefaults(defineProps<Props>(), {
  pinned: false,
  titleLabel: '',
  subtitle: null,
  subtitleLabel: '别名',
  fields: () => [],
  note: null,
  noteLabel: '摘要',
  maxWidth: 400,
  minWidth: 0,
  headerBgColor: '#FFF8E1',
  headerBorderColor: '#FFD54F',
});

defineEmits<{
  (e: 'close'): void;
}>();
</script>
