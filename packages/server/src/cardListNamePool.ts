/**
 * 中文姓名库（姓氏 / 名字用字参考常见姓名字典）
 * 生成策略：随机姓 + 随机名，保证不重复，避免同姓连续扎堆。
 */

/** 常见单姓（约 80 个） */
const SURNAMES = [
  '王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴',
  '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗',
  '郑', '梁', '谢', '宋', '唐', '许', '韩', '冯', '邓', '曹',
  '彭', '曾', '肖', '田', '董', '潘', '袁', '蔡', '蒋', '余',
  '于', '杜', '叶', '程', '苏', '魏', '吕', '丁', '任', '沈',
  '姚', '卢', '姜', '崔', '钟', '谭', '陆', '汪', '范', '金',
  '石', '廖', '贾', '夏', '韦', '付', '方', '白', '邹', '孟',
  '熊', '秦', '邱', '江', '尹', '薛', '闫', '段', '雷', '侯',
  '龙', '史', '陶', '黎', '贺', '顾', '毛', '郝', '龚', '邵',
] as const

/** 单字名用字 */
const GIVEN_CHARS = [
  '伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋',
  '勇', '艳', '杰', '娟', '涛', '明', '超', '华', '慧',
  '巧', '美', '红', '玉', '梅', '琳', '燕', '辉', '鹏', '飞',
  '鑫', '波', '斌', '凯', '健', '宁', '萍', '兰', '凤', '霞',
  '云', '峰', '龙', '婷', '欣', '怡', '涵', '宇', '轩', '浩',
  '梓', '睿', '博', '宸', '雨', '彤', '昕', '瑶', '琪', '媛',
  '佳', '思', '诗', '梦', '雪', '晨', '泽', '子', '嘉', '俊',
  '昊', '旭', '朗', '铭', '栋', '霖', '沐', '晟', '骁', '琨',
  '茜', '芷', '煦', '嵘', '翊', '诺', '然', '澄', '悦',
] as const

/** 双字名常用组合 */
const GIVEN_DOUBLE = [
  '建国', '建军', '志强', '秀英', '桂英', '晓明', '晓东', '文博',
  '子涵', '梓涵', '浩宇', '欣怡', '雨桐', '思远', '俊杰', '佳怡',
  '宇航', '博文', '天佑', '诗涵', '嘉怡', '明轩', '子轩', '雨泽',
  '亦菲', '静雯', '晓彤', '雅婷', '振华', '国栋', '永强',
  '春梅', '秋菊', '冬梅', '玉兰', '秀兰', '丽华', '淑芬', '桂兰',
  '昊然', '子墨', '一诺', '可欣', '语嫣', '若曦',
  '承泽', '景行', '怀瑾', '沐阳', '清扬', '知秋', '望舒', '听澜',
] as const

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

/** 随机名字部分：双字名 / 单字名 / 两字随机组合 */
function randomGivenPart(): string {
  const r = Math.random()
  if (r < 0.42) return pick(GIVEN_DOUBLE)
  if (r < 0.88) return pick(GIVEN_CHARS)
  const a = pick(GIVEN_CHARS)
  let b = pick(GIVEN_CHARS)
  for (let i = 0; i < 10 && b === a; i++) b = pick(GIVEN_CHARS)
  return a + b
}

/** 随机姓 + 随机名 */
export function randomFullName(): string {
  return pick(SURNAMES) + randomGivenPart()
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
}

/**
 * 随机生成 count 个不重复患者姓名，排除 exclude（种子数据等）
 */
export function allocateUniquePatientNames(
  count: number,
  exclude: ReadonlySet<string>,
): string[] {
  if (count <= 0) return []

  const taken = new Set(exclude)
  const result: string[] = []
  const maxAttempts = Math.max(count * 300, 5000)
  let attempts = 0

  while (result.length < count && attempts < maxAttempts) {
    attempts++
    const name = randomFullName()
    if (taken.has(name)) continue
    taken.add(name)
    result.push(name)
  }

  let n = 1
  while (result.length < count) {
    const fallback = `患者${n++}`
    if (!taken.has(fallback)) {
      taken.add(fallback)
      result.push(fallback)
    }
  }

  shuffleInPlace(result)
  return result
}
