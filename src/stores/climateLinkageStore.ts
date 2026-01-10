import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * 气候联动 Store
 * 用于在 CommerceDistribution 和 ClimateCard/EcoIndexCard 之间共享联动状态
 */
export const useClimateLinkageStore = defineStore('climateLinkage', () => {
    // 当前高亮的气候类型: 'warm' | 'cold' | 'stable' | null
    const highlightClimate = ref<'warm' | 'cold' | 'stable' | null>(null);

    // 当前高亮的朝代
    const highlightPeriod = ref<string | null>(null);

    // 设置气候高亮
    const setClimateHighlight = (climate: 'warm' | 'cold' | 'stable' | null) => {
        highlightClimate.value = climate;
    };

    // 设置朝代高亮
    const setPeriodHighlight = (period: string | null) => {
        highlightPeriod.value = period;
    };

    // 清除所有高亮
    const clearHighlight = () => {
        highlightClimate.value = null;
        highlightPeriod.value = null;
    };

    return {
        highlightClimate,
        highlightPeriod,
        setClimateHighlight,
        setPeriodHighlight,
        clearHighlight,
    };
});
