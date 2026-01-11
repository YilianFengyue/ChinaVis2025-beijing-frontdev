<script setup lang="ts">
import SalesCard from "@/components/dashboard/SalesCard.vue";
import TicketsCard from "@/components/dashboard/TicketsCard.vue";

import AdminEvoSankeyCard from "~/src/components/chinavis/rivers/AdministrativeEvolution/AdminEvoSankeyCard.vue";
import CommerceDistribution from "@/components/chinavis/InstitutionalEconomy/CommerceDistribution.vue";
import CityEvolutionCard from "~/src/components/chinavis/CityEvolutionCard.vue";
import CityCloudCard from "~/src/components/chinavis/CityCloudCard.vue";
import BeijingMapCard from "~/src/components/BeijingMapCard.vue";

//T1河流
import RiversCard from "@/components/GeoEnvironment/RiversCard.vue";
import ClimateCard from "@/components/GeoEnvironment/ClimateCard.vue";
import EcolndexCard from "@/components/GeoEnvironment/EcoIndexCard.vue"

//T2大事件
import EventCard from "@/views/pages/EventsView.vue";

//T3交通舆图
import TransportMapCard from "@/components/UrbanMorphology/TransportMapCard.vue";
import PropertyDonut from "@/components/UrbanMorphology/PropertyDonut.vue";
import MinguoMarketDonut from "~/src/components/UrbanMorphology/MinguoMarketDonut.vue";

</script>
<template>
  <div class="pa-5">

    
    <div class="map-page">
      <!-- 北京地图 (全宽) -->
      <v-card class="map-card mb-5" elevation="2" style="height: 800px;">
        <beijing-map-card></beijing-map-card>
      </v-card>
    </div>

    <!-- ---------------------------------------------- -->
    <!---First Row: T1河流叙事 -->
    <!-- ---------------------------------------------- -->
     <v-row class="flex-0" dense>
      <v-col cols="12" xl="4">
        <!-- Sales Card -->
        <v-card class="card-shadow" height="430">
          <rivers-card></rivers-card>
        </v-card>
      </v-col>
      <v-col cols="6" md="6" xl="4">
        <!-- Activity Card -->
        <v-card class="card-shadow" height="420">
          <climate-card></climate-card>
        </v-card>
      </v-col>
      <v-col cols="6" md="6" xl="4">
        <!-- Trafiic Card-->
        <v-card class="card-shadow h-full" height="420">
          <ecolndex-card></ecolndex-card>
        </v-card>
      </v-col>
    </v-row>
    
    
    <!-- ---------------------------------------------- -->
    <!---T2: 大事件 (新增这段) -->
    <!-- ---------------------------------------------- -->
    <v-row >
      <v-col cols="12">
        <EventCard />
      </v-col>
    </v-row>

    <v-row dense>
      <!-- 左侧：CityEvolutionCard + CityCloudCard 堆叠 -->
      <v-col cols="6">
        <v-card class="card-shadow mb-3" height="400">
          <city-evolution-card></city-evolution-card>
        </v-card>
        <city-cloud-card></city-cloud-card>
      </v-col>

      <!-- 右侧：桑基图 -->
      <v-col cols="6">
        <v-card class="card-shadow" height="800">
          <admin-evo-sankey-card></admin-evo-sankey-card>
        </v-card>
      </v-col>
    </v-row>


    <!-- ---------------------------------------------- -->
    <!---Second Row: T3交通舆图 -->
    <!-- ---------------------------------------------- -->
    <v-row class="flex-0" dense>
      <!-- 左侧：交通舆图 (高 700) -->
      <v-col cols="6" xl="6">
        <div class="h-100" style="height: 700px;">
          <TransportMapCard />
        </div>
      </v-col>

      <!-- 右侧：物产 & 民国 (垂直排列) -->
      <v-col cols="6" xl="6">
        <v-row dense>
          <!-- 上：物产结构 (高 320) -->
          <v-col cols="12">
            <div style="height: 320px;">
              <PropertyDonut />
            </div>
          </v-col>
          
          <!-- 下：民国商业 (高 380) -->
          <v-col cols="12">
            <div style="height: 380px;">
              <MinguoMarketDonut />
            </div>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <!-- ---------------------------------------------- -->
    <!---T4: 商业分布 -->
    <!-- ---------------------------------------------- -->
    <v-row class="mt-4" dense>
      <v-col cols="12">
        <v-card class="card-shadow">
          <commerce-distribution></commerce-distribution>
        </v-card>
      </v-col>
    </v-row>

  </div>
</template>
<style lang="scss" scoped>



</style>
