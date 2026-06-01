import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 地图测试数据（二选一）：
 *
 * REST（推荐，名称与 GeoJSON 一致，数值每次随机）：
 *   全国：GET http://localhost:3002/api/demo/map-stats?level=country
 *   陕西：GET http://localhost:3002/api/demo/map-stats?level=province&province=陕西省
 *   广东：GET http://localhost:3002/api/demo/map-stats?level=province&adcode=440000
 *   编辑器 REST 数据源 → 数据路径：data
 *
 * SQL（固定种子，需 db:seed）：
 *   全国：SELECT name, value FROM region_stats ORDER BY id
 *   陕西：SELECT name, value FROM city_stats WHERE province = '陕西省' ORDER BY id
 *   广东：SELECT name, value FROM city_stats WHERE province = '广东省' ORDER BY id
 *
 * 地图属性：全国 →「全国（显示省）」；省级 → 选对应省份。
 */

/** 全国地图：name 需与省级 GeoJSON 一致 */
const REGION_STATS_ROWS: [string, number][] = [
  ['北京市', 124],
  ['上海市', 176],
  ['广东省', 559], // 原广州 330 + 深圳 229
  ['浙江省', 150], // 原杭州
]

async function seedRegionStats() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS region_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      value REAL NOT NULL
    )
  `)
  await prisma.$executeRawUnsafe(`DELETE FROM region_stats`)
  for (const [name, value] of REGION_STATS_ROWS) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO region_stats (name, value) VALUES (?, ?)`,
      name,
      value,
    )
  }
  console.log(`Seed complete: region_stats table with ${REGION_STATS_ROWS.length} rows`)
}

/** 省级地图：province + name（地级市，与 DataV 省内 GeoJSON 一致） */
const CITY_STATS_ROWS: [string, string, number][] = [
  ['陕西省', '西安市', 320],
  ['陕西省', '宝鸡市', 128],
  ['陕西省', '咸阳市', 210],
  ['陕西省', '渭南市', 165],
  ['陕西省', '延安市', 98],
  ['广东省', '广州市', 330],
  ['广东省', '深圳市', 229],
  ['广东省', '佛山市', 180],
  ['广东省', '东莞市', 152],
]

async function seedCityStats() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS city_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      province TEXT NOT NULL,
      name TEXT NOT NULL,
      value REAL NOT NULL
    )
  `)
  await prisma.$executeRawUnsafe(`DELETE FROM city_stats`)
  for (const [province, name, value] of CITY_STATS_ROWS) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO city_stats (province, name, value) VALUES (?, ?, ?)`,
      province,
      name,
      value,
    )
  }
  console.log(`Seed complete: city_stats table with ${CITY_STATS_ROWS.length} rows`)
}

async function seedSalesData() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS sales_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      revenue REAL NOT NULL,
      orders INTEGER NOT NULL
    )
  `)
  await prisma.$executeRawUnsafe(`DELETE FROM sales_data`)

  const rows = [
    ['1月', 42000, 128],
    ['2月', 38000, 105],
    ['3月', 51000, 156],
    ['4月', 47000, 142],
    ['5月', 55000, 170],
    ['6月', 62000, 195],
    ['7月', 58000, 178],
    ['8月', 65000, 210],
    ['9月', 53000, 160],
    ['10月', 70000, 225],
    ['11月', 78000, 250],
    ['12月', 85000, 280],
  ]

  for (const [month, revenue, orders] of rows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO sales_data (month, revenue, orders) VALUES (?, ?, ?)`,
      month,
      revenue,
      orders,
    )
  }
  console.log('Seed complete: sales_data table with 12 rows')
}

/** 修正测试页地图组件错误的 nameField（$.data.name → 自动识别 name） */
async function migrateMapPageFieldMapping() {
  const pages = await prisma.pageDraft.findMany()
  for (const page of pages) {
    let schema: { components?: { type?: string; props?: Record<string, unknown> }[] }
    try {
      schema = JSON.parse(page.schemaJson)
    } catch {
      continue
    }
    let changed = false
    for (const comp of schema.components ?? []) {
      if (comp.type !== 'map' || !comp.props) continue
      if (comp.props.nameField === '$.data.name' || comp.props.nameField === 'data.name') {
        delete comp.props.nameField
        changed = true
      }
      if (comp.props.valueField === '$.data.value' || comp.props.valueField === 'data.value') {
        delete comp.props.valueField
        changed = true
      }
    }
    if (changed) {
      await prisma.pageDraft.update({
        where: { id: page.id },
        data: { schemaJson: JSON.stringify(schema) },
      })
      console.log(`Migrated map field mapping on page id=${page.id} (${page.name})`)
    }
  }
}

async function main() {
  await seedRegionStats()
  await seedCityStats()
  await seedSalesData()
  await migrateMapPageFieldMapping()
  console.log(
    'Renderer 可用提示：curl -X POST http://localhost:3002/api/publish/pages/from-draft/1 -H "Content-Type: application/json" -d "{}"',
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
