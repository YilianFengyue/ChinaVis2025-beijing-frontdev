<script setup lang="ts">
import BeijingMapCard from "@/components/chinavis/BeijingMapCard.vue";
</script>

<template>
  <div class="map-page">
    <!-- 北京地图 (全宽) -->
    <v-card class="map-card" elevation="2">
      <beijing-map-card></beijing-map-card>
    </v-card>
  </div>
</template>

<style lang="scss" scoped>
.map-page {
  width: 100%;
  padding: 16px 16px 0 16px; // 顶部和两侧间距
}

.map-card {
  width: 100%;
  height: 550px;
  border-radius: 4px;
}
</style>
