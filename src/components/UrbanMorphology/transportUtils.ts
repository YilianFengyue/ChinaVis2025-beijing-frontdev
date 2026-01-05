/**
 * T3 交通舆图模块 - 工具函数
 */
import transportRawData from '@/data/transport/transport_llm_output_v2.2.json'

// ==================== 类型定义 ====================

export interface TransportRecord {
    input_dynasty: string | null
    standard_dynasty: string
    target_province: string
    transport_type: '陆路' | '水路' | '航线'
    evidence: string
}

export interface GroupedData {
    dynasty: string
    province: string
    type: '陆路' | '水路' | '航线'
    count: number
    evidences: string[]
}

export interface InternationalDestination {
    name: string
    types: Set<string>
    dynasties: Set<string>
    records: TransportRecord[]
}

// ==================== 常量配置 ====================

/** 朝代列表（按时间顺序） */
export const DYNASTIES = [
    '先秦', '秦汉', '隋唐五代', '辽', '宋', '金', '元', '明', '清', '民国', '新中国'
] as const

/** 交通类型颜色 */
export const TRANSPORT_COLORS: Record<string, string> = {
    '陆路': '#8D6E63', // 棕色 (Brown 400) - 像古道
    '水路': '#78909C', // 蓝灰 (Blue Grey 400) - 像河流
    '航线': '#9E9E9E', // 灰色 (Grey 500) - 像轨迹
} as const

/** 中国省份/直辖市列表 */
export const CHINESE_PROVINCES = [
    '北京市', '天津市', '河北省', '山西省', '内蒙古自治区',
    '辽宁省', '吉林省', '黑龙江省',
    '上海市', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省',
    '河南省', '湖北省', '湖南省', '广东省', '广西壮族自治区', '海南省',
    '重庆市', '四川省', '贵州省', '云南省', '西藏自治区',
    '陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区',
    '香港特别行政区', '澳门特别行政区', '台湾省',
    // 简称兼容
    '北京', '天津', '河北', '山西', '内蒙古',
    '辽宁', '吉林', '黑龙江',
    '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东',
    '河南', '湖北', '湖南', '广东', '广西', '海南',
    '重庆', '四川', '贵州', '云南', '西藏',
    '陕西', '甘肃', '青海', '宁夏', '新疆',
    '香港', '澳门', '台湾',
    // 特殊处理
    '九龙', // 被标记为九龙的数据
]

/** 省份中心坐标（用于地图绑定） */
export const PROVINCE_CENTERS: Record<string, [number, number]> = {
    '北京市': [116.4, 39.9],
    '天津市': [117.2, 39.1],
    '河北省': [114.5, 38.0],
    '山西省': [112.5, 37.9],
    '内蒙古自治区': [111.7, 40.8],
    '辽宁省': [123.4, 41.8],
    '吉林省': [125.3, 43.9],
    '黑龙江省': [126.6, 45.8],
    '上海市': [121.5, 31.2],
    '江苏省': [118.8, 32.1],
    '浙江省': [120.2, 30.3],
    '安徽省': [117.3, 31.9],
    '福建省': [119.3, 26.1],
    '江西省': [115.9, 28.7],
    '山东省': [117.0, 36.7],
    '河南省': [113.7, 34.8],
    '湖北省': [114.3, 30.6],
    '湖南省': [113.0, 28.2],
    '广东省': [113.3, 23.1],
    '广西壮族自治区': [108.3, 22.8],
    '海南省': [110.3, 20.0],
    '重庆市': [106.5, 29.6],
    '四川省': [104.1, 30.7],
    '贵州省': [106.7, 26.6],
    '云南省': [102.7, 25.0],
    '西藏自治区': [91.1, 29.7],
    '陕西省': [108.9, 34.3],
    '甘肃省': [103.8, 36.1],
    '青海省': [101.8, 36.6],
    '宁夏回族自治区': [106.3, 38.5],
    '新疆维吾尔自治区': [87.6, 43.8],
}

// ==================== 数据加载 ====================

/** 获取所有交通数据 */
export function getTransportData(): TransportRecord[] {
    return transportRawData as TransportRecord[]
}

// ==================== 数据处理函数 ====================

/** 标准化省份名称 */
export function normalizeProvinceName(name: string): string {
    // 省份简称映射到全称
    const mapping: Record<string, string> = {
        '北京': '北京市',
        '天津': '天津市',
        '上海': '上海市',
        '重庆': '重庆市',
        '河北': '河北省',
        '山西': '山西省',
        '辽宁': '辽宁省',
        '吉林': '吉林省',
        '黑龙江': '黑龙江省',
        '江苏': '江苏省',
        '浙江': '浙江省',
        '安徽': '安徽省',
        '福建': '福建省',
        '江西': '江西省',
        '山东': '山东省',
        '河南': '河南省',
        '湖北': '湖北省',
        '湖南': '湖南省',
        '广东': '广东省',
        '海南': '海南省',
        '四川': '四川省',
        '贵州': '贵州省',
        '云南': '云南省',
        '陕西': '陕西省',
        '甘肃': '甘肃省',
        '青海': '青海省',
        '台湾': '台湾省',
        '内蒙古': '内蒙古自治区',
        '广西': '广西壮族自治区',
        '西藏': '西藏自治区',
        '宁夏': '宁夏回族自治区',
        '新疆': '新疆维吾尔自治区',
        '香港': '香港特别行政区',
        '澳门': '澳门特别行政区',
        '九龙': '香港特别行政区',
    }
    return mapping[name] || name
}

/** 判断是否国际目的地 */
export function isInternational(province: string): boolean {
    const normalized = normalizeProvinceName(province)
    return !CHINESE_PROVINCES.includes(normalized) && !CHINESE_PROVINCES.includes(province)
}

/** 获取省份中心坐标 */
export function getProvinceCenter(province: string): [number, number] | null {
    const normalized = normalizeProvinceName(province)
    return PROVINCE_CENTERS[normalized] || null
}

/** 按朝代筛选数据 */
export function filterByDynasty(data: TransportRecord[], dynasty: string | null): TransportRecord[] {
    if (!dynasty) return data
    return data.filter(d => d.standard_dynasty === dynasty)
}

/** 按交通类型筛选数据 */
export function filterByType(data: TransportRecord[], types: string[]): TransportRecord[] {
    if (types.length === 0) return data
    return data.filter(d => types.includes(d.transport_type))
}

/** 分组统计：按 (朝代, 省份, 类型) 分组 */
export function groupByDynastyProvinceType(data: TransportRecord[]): GroupedData[] {
    const map = new Map<string, GroupedData>()

    data.forEach(record => {
        const key = `${record.standard_dynasty}|${record.target_province}|${record.transport_type}`

        if (!map.has(key)) {
            map.set(key, {
                dynasty: record.standard_dynasty,
                province: record.target_province,
                type: record.transport_type,
                count: 0,
                evidences: [],
            })
        }

        const group = map.get(key)!
        group.count++
        if (record.evidence) {
            group.evidences.push(record.evidence)
        }
    })

    return Array.from(map.values())
}

/** 获取国内省份连接数据（排除北京自身） */
export function getDomesticConnections(data: TransportRecord[]): GroupedData[] {
    const filtered = data.filter(d => {
        const normalized = normalizeProvinceName(d.target_province)
        return !isInternational(d.target_province) &&
            normalized !== '北京市' &&
            d.target_province !== '北京市' &&
            d.target_province !== '北京'
    })
    return groupByDynastyProvinceType(filtered)
}

/** 获取国际目的地数据 */
export function getInternationalDestinations(data: TransportRecord[]): InternationalDestination[] {
    const map = new Map<string, InternationalDestination>()

    data.filter(d => isInternational(d.target_province)).forEach(record => {
        const name = record.target_province

        if (!map.has(name)) {
            map.set(name, {
                name,
                types: new Set(),
                dynasties: new Set(),
                records: [],
            })
        }

        const dest = map.get(name)!
        dest.types.add(record.transport_type)
        dest.dynasties.add(record.standard_dynasty)
        dest.records.push(record)
    })

    return Array.from(map.values()).sort((a, b) => b.records.length - a.records.length)
}

/** 计算线条粗细（基于 evidence 数量） */
export function calculateLineWeight(count: number): number {
    // 最小 1px，最大 8px，使用对数缩放
    return Math.min(1 + Math.log2(count + 1) * 1.5, 8)
}

/** 获取所有朝代的统计概览 */
export function getDynastyOverview(data: TransportRecord[]): Record<string, {
    total: number
    domestic: number
    international: number
    byType: Record<string, number>
}> {
    const result: Record<string, any> = {}

    DYNASTIES.forEach(dynasty => {
        const dynastyData = data.filter(d => d.standard_dynasty === dynasty)
        result[dynasty] = {
            total: dynastyData.length,
            domestic: dynastyData.filter(d => !isInternational(d.target_province)).length,
            international: dynastyData.filter(d => isInternational(d.target_province)).length,
            byType: {
                '陆路': dynastyData.filter(d => d.transport_type === '陆路').length,
                '水路': dynastyData.filter(d => d.transport_type === '水路').length,
                '航线': dynastyData.filter(d => d.transport_type === '航线').length,
            }
        }
    })

    return result
}
