<script setup lang="ts">
import TransportMapCard from "@/components/UrbanMorphology/TransportMapCard.vue";
import PropertyDonut from "@/components/UrbanMorphology/PropertyDonut.vue";
import MinguoMarketDonut from "~/src/components/UrbanMorphology/MinguoMarketDonut.vue";
</script>

<template>
  <div class="pa-5">
    <!-- ---------------------------------------------- -->
    <!---First Row 交通舆图 -->
    <!-- ---------------------------------------------- -->
    <v-row class="flex-0" dense>
      <!-- 左侧：交通舆图 (高 700) -->
      <v-col cols="6" xl="6">
        <v-card class="card-shadow" height="700">
          <TransportMapCard />
        </v-card>
      </v-col>

      <!-- 右侧：物产 & 民国 (垂直排列) -->
      <v-col cols="6" xl="6">
        <v-row dense>
          <!-- 上：物产结构 (高 320) -->
          <v-col cols="12">
            <v-card class="card-shadow" height="320">
              <PropertyDonut />
            </v-card>
          </v-col>
          
          <!-- 下：民国商业 (高 380) -->
          <v-col cols="6">
            <v-card class="card-shadow" height="380">
              <MinguoMarketDonut />
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <!-- ---------------------------------------------- -->
    <!---Third Row -->
    <!-- ---------------------------------------------- -->
    <v-row class="card-shadow flex-grow-0" dense>
      <v-col cols="12" xl="6">
        <!-- Target Card-->
        <v-card class="card-shadow" height="420"
          ><todo-card></todo-card
        ></v-card>
      </v-col>
      <v-col cols="12" xl="6">
        <v-card class="card-shadow" height="420"
          ><tickets-card></tickets-card>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
<style lang="scss" scoped></style>
