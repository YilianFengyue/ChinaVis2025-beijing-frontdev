<script setup lang="ts">
import SalesCard from "@/components/dashboard/SalesCard.vue";
import TicketsCard from "@/components/dashboard/TicketsCard.vue";
import RiversCard from "@/components/chinavis/rivers/RiversCard.vue";
import AdminEvoSankeyCard from "~/src/components/chinavis/rivers/AdministrativeEvolution/AdminEvoSankeyCard.vue";
import CommerceDistribution from "@/components/chinavis/InstitutionalEconomy/CommerceDistribution.vue";
import CityEvolutionCard from "~/src/components/chinavis/CityEvolutionCard.vue";
import CityCloudCard from "~/src/components/chinavis/CityCloudCard.vue";
</script>
<template>
  <div class="pa-5">
    <!-- ---------------------------------------------- -->
    <!---First Row: 左侧卡片堆叠 + 右侧桑基图 -->
    <!-- ---------------------------------------------- -->
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
    <!---Second Row: CommerceDistribution -->
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
<style lang="scss" scoped></style>
