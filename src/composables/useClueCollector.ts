/**
 * @Composable: useClueCollector
 * @Description: 线索收集器，用于从各种Card组件双击收集Tooltip信息到线索板
 */
import { useInspirationStore, type InspirationItem } from '@/stores/inspirationStore'
import { useSnackbarStore } from '@/stores/snackbarStore'

export type ClueType = 'clue_river' | 'clue_climate' | 'clue_eco' | 'clue_event' | 'clue_city'

interface ClueData {
    // 通用字段
    title?: string
    name?: string
    river?: string

    // 时间/朝代
    period?: string
    subLabel?: string
    dynasty?: string
    year?: number | string

    // 描述内容
    note?: string
    description?: string
    content?: string

    // 其他
    action?: string
    functions?: string
    [key: string]: any
}

export function useClueCollector() {
    const inspirationStore = useInspirationStore()
    const snackbarStore = useSnackbarStore()

    /**
     * 收集线索到整理板
     * @param data - tooltip的原始数据
     * @param type - 线索类型
     * @param sourceLabel - 来源标签（如"生命之河"、"气候演变"等）
     */
    const collectClue = (data: ClueData, type: ClueType, sourceLabel: string) => {
        // 提取标题（按优先级尝试不同字段）
        const title = data.title || data.river || data.name || '未命名线索'

        // 提取副标题（通常是时间/朝代信息）
        const subtitle = data.period || data.subLabel ||
            (data.dynasty && data.year ? `${data.dynasty} · ${data.year}` : data.dynasty) || ''

        // 提取主要内容
        const content = data.note || data.description || data.content ||
            (data.action ? `${data.action}${data.functions ? ' - ' + data.functions : ''}` : '') ||
            '无详细描述'

        // 生成标签
        const typeLabel = type.replace('clue_', '')
        const tags = [typeLabel]
        if (data.dynasty) tags.push(data.dynasty)
        if (data.action) tags.push(data.action)

        // 调用store添加
        const success = inspirationStore.addItem({
            type,
            title,
            subtitle,
            content,
            sourceType: sourceLabel,
            tags,
            metadata: { raw: data }
        })

        return success
    }

    /**
     * 检查线索是否已收集
     */
    const isClueCollected = (title: string, type: ClueType) => {
        return inspirationStore.isCollected(title, type)
    }

    return {
        collectClue,
        isClueCollected
    }
}
