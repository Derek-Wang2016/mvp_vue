<script setup lang="ts">
import { PROP_LABEL, PROP_SECTION, PROP_INPUT, PROP_SELECT_COMPACT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER } from '../../propertyPanel/shared'
import { FONT_FAMILY_SELECT_CLASS, FONT_FAMILY_OPTIONS_WITH_INHERIT } from '../../propertyPanel/editorFontOptions'
import type { ComponentPropertyFieldsProps } from '../types'
import EditorNumberInput from '../../EditorNumberInput.vue'

const props = defineProps<ComponentPropertyFieldsProps>()

function propStr(key: string, fallback: string): string {
  return (props.comp.props[key] as string) ?? fallback
}

function propNum(key: string, fallback: number): number {
  const v = props.comp.props[key]
  if (typeof v === 'number') return v
  return fallback
}

function propBool(key: string): boolean {
  return (props.comp.props[key] as boolean) === true
}

function update(kv: Record<string, unknown>) {
  props.updateProps(kv)
}
</script>

<template>
  <div class="space-y-4 text-xs">

    <!-- Layout -->
    <section>
      <h4 :class="PROP_SECTION">布局</h4>
      <div class="space-y-2.5 mt-1.5">
        <label class="block">
          <span :class="PROP_LABEL">排列方向</span>
          <select
            :class="PROP_SELECT_COMPACT"
            :value="propStr('direction', 'horizontal')"
            @change="update({ direction: ($event.target as HTMLSelectElement).value })"
          >
            <option value="horizontal">横向（一行多列）</option>
            <option value="vertical">纵向（一列多行）</option>
          </select>
        </label>
        <label class="block">
          <span :class="PROP_LABEL">间距 (px)</span>
          <EditorNumberInput
            :min="0" :max="100" :step="1"
            :class="PROP_NUMBER_WRAP"
            :input-class="PROP_NUMBER_INNER"
            :model-value="propNum('gap', 8)"
            @update:model-value="(v: string) => update({ gap: Number(v) || 8 })"
          />
        </label>
        <label class="block">
          <span :class="PROP_LABEL">每行最多</span>
          <EditorNumberInput
            :min="0" :max="50" :step="1"
            :class="PROP_NUMBER_WRAP"
            :input-class="PROP_NUMBER_INNER"
            :model-value="propNum('maxPerRow', 0)"
            @update:model-value="(v: string) => update({ maxPerRow: Number(v) || 0 })"
          />
        </label>
        <p :class="'text-[10px] text-slate-500'">0 = 不限，自动折行</p>
        <label class="block">
          <span :class="PROP_LABEL">每列最多</span>
          <EditorNumberInput
            :min="0" :max="50" :step="1"
            :class="PROP_NUMBER_WRAP"
            :input-class="PROP_NUMBER_INNER"
            :model-value="propNum('maxPerCol', 0)"
            @update:model-value="(v: string) => update({ maxPerCol: Number(v) || 0 })"
          />
        </label>
        <p :class="'text-[10px] text-slate-500'">0 = 不限，自动折列</p>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            class="editor-checkbox shrink-0"
            :checked="propBool('itemEqualHeight')"
            @change="update({ itemEqualHeight: ($event.target as HTMLInputElement).checked })"
          />
          <span :class="PROP_LABEL">单项等高</span>
        </label>
        <label v-if="propBool('itemEqualHeight')" class="block">
          <span :class="PROP_LABEL">单项高度 (px)</span>
          <EditorNumberInput
            :min="24" :max="300" :step="1"
            :class="PROP_NUMBER_WRAP"
            :input-class="PROP_NUMBER_INNER"
            :model-value="propNum('itemHeight', 40)"
            @update:model-value="(v: string) => update({ itemHeight: Math.max(24, Number(v) || 40) })"
          />
        </label>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            class="editor-checkbox shrink-0"
            :checked="propBool('overflowScrollY')"
            @change="update({ overflowScrollY: ($event.target as HTMLInputElement).checked })"
          />
          <span :class="PROP_LABEL">项内自动纵向滚动（无滚动条）</span>
        </label>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            class="editor-checkbox shrink-0"
            :checked="propBool('itemEqualWidth')"
            @change="update({ itemEqualWidth: ($event.target as HTMLInputElement).checked })"
          />
          <span :class="PROP_LABEL">等宽对齐</span>
        </label>
        <p :class="'text-[10px] text-slate-500'">每项外框等宽；可设 KEY 固定列宽，其余空间给 VALUE</p>
        <label v-if="propBool('itemEqualWidth')" class="block">
          <span :class="PROP_LABEL">KEY 列默认宽度 (px)</span>
          <EditorNumberInput
            :min="0" :max="800" :step="1"
            :class="PROP_NUMBER_WRAP"
            :input-class="PROP_NUMBER_INNER"
            :model-value="propNum('keyColumnWidth', 0)"
            @update:model-value="(v: string) => update({ keyColumnWidth: Number(v) || 0 })"
          />
        </label>
        <p v-if="propBool('itemEqualWidth')" :class="'text-[10px] text-slate-500'">
          0 = 未单独配置时 KEY/VALUE 等分；数据面板可为每项 KEY 单独设宽
        </p>
        <label v-if="propBool('itemEqualWidth')" class="block">
          <span :class="PROP_LABEL">KEY / VALUE 列间距 (px)</span>
          <EditorNumberInput
            :min="0" :max="48" :step="1"
            :class="PROP_NUMBER_WRAP"
            :input-class="PROP_NUMBER_INNER"
            :model-value="propNum('keyValueColumnGap', 8)"
            @update:model-value="(v: string) => update({ keyValueColumnGap: Number(v) || 0 })"
          />
        </label>
      </div>
    </section>

    <!-- Item box -->
    <section>
      <h4 :class="PROP_SECTION">单项外框</h4>
      <div class="space-y-2.5 mt-1.5">
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            class="editor-checkbox shrink-0"
            :checked="propBool('itemBoxEnabled') || props.comp.props.itemBoxEnabled === undefined"
            @change="update({ itemBoxEnabled: ($event.target as HTMLInputElement).checked })"
          />
          <span :class="PROP_LABEL">显示包裹矩形</span>
        </label>
        <template v-if="propBool('itemBoxEnabled') || props.comp.props.itemBoxEnabled === undefined">
          <label class="block">
            <span :class="PROP_LABEL">背景色</span>
            <div class="flex items-center gap-1.5 mt-0.5">
              <input
                type="color"
                class="w-6 h-6 rounded border border-white/15 bg-transparent cursor-pointer"
                :value="propStr('itemBoxBgColor', 'rgba(255,255,255,0.06)').startsWith('rgba') ? '#1e293b' : propStr('itemBoxBgColor', '#1e293b')"
                @change="update({ itemBoxBgColor: ($event.target as HTMLInputElement).value })"
              />
              <input
                type="text"
                :class="PROP_INPUT"
                placeholder="transparent"
                :value="propStr('itemBoxBgColor', 'rgba(255,255,255,0.06)')"
                @change="update({ itemBoxBgColor: ($event.target as HTMLInputElement).value || 'transparent' })"
              />
            </div>
          </label>
          <label class="block">
            <span :class="PROP_LABEL">边框颜色</span>
            <div class="flex items-center gap-1.5 mt-0.5">
              <input
                type="color"
                class="w-6 h-6 rounded border border-white/15 bg-transparent cursor-pointer"
                :value="propStr('itemBoxBorderColor', 'rgba(148,163,184,0.4)').startsWith('rgba') ? '#94a3b8' : propStr('itemBoxBorderColor', '#94a3b8')"
                @change="update({ itemBoxBorderColor: ($event.target as HTMLInputElement).value })"
              />
              <input
                type="text"
                :class="PROP_INPUT"
                :value="propStr('itemBoxBorderColor', 'rgba(148,163,184,0.4)')"
                @change="update({ itemBoxBorderColor: ($event.target as HTMLInputElement).value || 'rgba(148,163,184,0.4)' })"
              />
            </div>
          </label>
          <label class="block">
            <span :class="PROP_LABEL">边框粗细 (px)</span>
            <EditorNumberInput
              :min="0" :max="20" :step="1"
              :class="PROP_NUMBER_WRAP"
              :input-class="PROP_NUMBER_INNER"
              :model-value="propNum('itemBoxBorderWidth', 1)"
              @update:model-value="(v: string) => update({ itemBoxBorderWidth: Number(v) || 0 })"
            />
          </label>
          <label class="block">
            <span :class="PROP_LABEL">边框样式</span>
            <select
              :class="PROP_SELECT_COMPACT"
              :value="propStr('itemBoxBorderStyle', 'solid')"
              @change="update({ itemBoxBorderStyle: ($event.target as HTMLSelectElement).value })"
            >
              <option value="solid">实线</option>
              <option value="dashed">虚线</option>
              <option value="dotted">点线</option>
              <option value="none">无</option>
            </select>
          </label>
          <label class="block">
            <span :class="PROP_LABEL">圆角 (px)</span>
            <EditorNumberInput
              :min="0" :max="40" :step="1"
              :class="PROP_NUMBER_WRAP"
              :input-class="PROP_NUMBER_INNER"
              :model-value="propNum('itemBoxBorderRadius', 6)"
              @update:model-value="(v: string) => update({ itemBoxBorderRadius: Number(v) || 0 })"
            />
          </label>
          <label class="block">
            <span :class="PROP_LABEL">内边距 (px)</span>
            <EditorNumberInput
              :min="0" :max="48" :step="1"
              :class="PROP_NUMBER_WRAP"
              :input-class="PROP_NUMBER_INNER"
              :model-value="propNum('itemBoxPadding', 8)"
              @update:model-value="(v: string) => update({ itemBoxPadding: Number(v) || 0 })"
            />
          </label>
        </template>
      </div>
    </section>

    <!-- Label Style -->
    <section>
      <h4 :class="PROP_SECTION">标签 (Key) 样式</h4>
      <div class="space-y-2.5 mt-1.5">
        <label class="block">
          <span :class="PROP_LABEL">字体大小</span>
          <input
            type="text"
            class="w-20 mt-0.5 bg-white/[0.08] border border-white/15 rounded-md px-2 py-1.5 text-xs text-slate-100 text-right focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
            :value="propStr('labelFontSize', '14px')"
            @change="update({ labelFontSize: ($event.target as HTMLInputElement).value || '14px' })"
          />
        </label>
        <label class="block">
          <span :class="PROP_LABEL">字重</span>
          <select
            :class="PROP_SELECT_COMPACT"
            :value="propStr('labelFontWeight', 'bold')"
            @change="update({ labelFontWeight: ($event.target as HTMLSelectElement).value })"
          >
            <option value="normal">正常</option>
            <option value="bold">加粗</option>
          </select>
        </label>
        <label class="block">
          <span :class="PROP_LABEL">文字颜色</span>
          <div class="flex items-center gap-1.5 mt-0.5">
            <input
              type="color"
              class="w-6 h-6 rounded border border-white/15 bg-transparent cursor-pointer"
              :value="propStr('labelColor', '#94a3b8')"
              @change="update({ labelColor: ($event.target as HTMLInputElement).value })"
            />
            <input
              type="text"
              class="w-20 bg-white/[0.08] border border-white/15 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
              :value="propStr('labelColor', '#94a3b8')"
              @change="update({ labelColor: ($event.target as HTMLInputElement).value || '#94a3b8' })"
            />
          </div>
        </label>
        <label class="block">
          <span :class="PROP_LABEL">背景色</span>
          <div class="flex items-center gap-1.5 mt-0.5">
            <input
              type="color"
              class="w-6 h-6 rounded border border-white/15 bg-transparent cursor-pointer"
              :value="propStr('labelBgColor', 'transparent')"
              @change="update({ labelBgColor: ($event.target as HTMLInputElement).value })"
            />
            <input
              type="text"
              class="w-20 bg-white/[0.08] border border-white/15 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
              :value="propStr('labelBgColor', 'transparent')"
              @change="update({ labelBgColor: ($event.target as HTMLInputElement).value || 'transparent' })"
            />
          </div>
        </label>
        <label class="block">
          <span :class="PROP_LABEL">字体</span>
          <select
            :class="FONT_FAMILY_SELECT_CLASS"
            :value="propStr('labelFontFamily', 'sans-serif')"
            @change="update({ labelFontFamily: ($event.target as HTMLSelectElement).value })"
          >
            <option
              v-for="opt in FONT_FAMILY_OPTIONS_WITH_INHERIT"
              :key="opt.value"
              :value="opt.value"
            >{{ opt.label }}</option>
          </select>
        </label>
      </div>
    </section>

    <!-- Value Style -->
    <section>
      <h4 :class="PROP_SECTION">值 (Value) 样式</h4>
      <div class="space-y-2.5 mt-1.5">
        <label class="block">
          <span :class="PROP_LABEL">字体大小</span>
          <input
            type="text"
            class="w-20 mt-0.5 bg-white/[0.08] border border-white/15 rounded-md px-2 py-1.5 text-xs text-slate-100 text-right focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
            :value="propStr('valueFontSize', '14px')"
            @change="update({ valueFontSize: ($event.target as HTMLInputElement).value || '14px' })"
          />
        </label>
        <label class="block">
          <span :class="PROP_LABEL">字重</span>
          <select
            :class="PROP_SELECT_COMPACT"
            :value="propStr('valueFontWeight', 'normal')"
            @change="update({ valueFontWeight: ($event.target as HTMLSelectElement).value })"
          >
            <option value="normal">正常</option>
            <option value="bold">加粗</option>
          </select>
        </label>
        <label class="block">
          <span :class="PROP_LABEL">文字颜色</span>
          <div class="flex items-center gap-1.5 mt-0.5">
            <input
              type="color"
              class="w-6 h-6 rounded border border-white/15 bg-transparent cursor-pointer"
              :value="propStr('valueColor', '#e2e8f0')"
              @change="update({ valueColor: ($event.target as HTMLInputElement).value })"
            />
            <input
              type="text"
              class="w-20 bg-white/[0.08] border border-white/15 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
              :value="propStr('valueColor', '#e2e8f0')"
              @change="update({ valueColor: ($event.target as HTMLInputElement).value || '#e2e8f0' })"
            />
          </div>
        </label>
        <label class="block">
          <span :class="PROP_LABEL">背景色</span>
          <div class="flex items-center gap-1.5 mt-0.5">
            <input
              type="color"
              class="w-6 h-6 rounded border border-white/15 bg-transparent cursor-pointer"
              :value="propStr('valueBgColor', 'rgba(255,255,255,0.08)')"
              @change="update({ valueBgColor: ($event.target as HTMLInputElement).value })"
            />
            <input
              type="text"
              class="w-20 bg-white/[0.08] border border-white/15 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
              :value="propStr('valueBgColor', 'rgba(255,255,255,0.08)')"
              @change="update({ valueBgColor: ($event.target as HTMLInputElement).value || 'rgba(255,255,255,0.08)' })"
            />
          </div>
        </label>
        <label class="block">
          <span :class="PROP_LABEL">圆角 (px)</span>
          <EditorNumberInput
            :min="0" :max="40" :step="1"
            :class="PROP_NUMBER_WRAP"
            :input-class="PROP_NUMBER_INNER"
            :model-value="propNum('valueBorderRadius', 4)"
            @update:model-value="(v: string) => update({ valueBorderRadius: Number(v) || 4 })"
          />
        </label>
        <label class="block">
          <span :class="PROP_LABEL">字体</span>
          <select
            :class="FONT_FAMILY_SELECT_CLASS"
            :value="propStr('valueFontFamily', 'sans-serif')"
            @change="update({ valueFontFamily: ($event.target as HTMLSelectElement).value })"
          >
            <option
              v-for="opt in FONT_FAMILY_OPTIONS_WITH_INHERIT"
              :key="opt.value"
              :value="opt.value"
            >{{ opt.label }}</option>
          </select>
        </label>
      </div>
    </section>

    <!-- TAG Settings -->
    <section>
      <h4 :class="PROP_SECTION">TAG 分割</h4>
      <div class="space-y-2.5 mt-1.5">
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            class="editor-checkbox shrink-0"
            :checked="propBool('tagSplitEnabled')"
            @change="update({ tagSplitEnabled: ($event.target as HTMLInputElement).checked })"
          />
          <span :class="PROP_LABEL">启用 TAG 分割</span>
        </label>
        <template v-if="propBool('tagSplitEnabled')">
          <label class="block">
            <span :class="PROP_LABEL">分隔符</span>
            <input
              type="text"
              class="w-16 mt-0.5 bg-white/[0.08] border border-white/15 rounded-md px-2 py-1.5 text-xs text-slate-100 text-center focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
              :value="propStr('tagSeparator', ',')"
              @change="update({ tagSeparator: ($event.target as HTMLInputElement).value || ',' })"
            />
          </label>
          <label class="block">
            <span :class="PROP_LABEL">TAG 间距 (px)</span>
            <EditorNumberInput
              :min="0" :max="40" :step="1"
              :class="PROP_NUMBER_WRAP"
              :input-class="PROP_NUMBER_INNER"
              :model-value="propNum('tagGap', 4)"
              @update:model-value="(v: string) => update({ tagGap: Number(v) || 4 })"
            />
          </label>
          <label class="block">
            <span :class="PROP_LABEL">TAG 宽度 (px)</span>
            <EditorNumberInput
              :min="16" :max="400" :step="1"
              :class="PROP_NUMBER_WRAP"
              :input-class="PROP_NUMBER_INNER"
              :model-value="propNum('tagWidth', 48)"
              @update:model-value="(v: string) => update({ tagWidth: Math.max(16, Number(v) || 48) })"
            />
          </label>
          <p :class="'text-[10px] text-slate-500'">各 TAG 等宽，文字在 TAG 内居中</p>
        </template>
      </div>
    </section>

    <!-- Count Display -->
    <section>
      <h4 :class="PROP_SECTION">计数显示</h4>
      <div class="mt-1.5">
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            class="editor-checkbox shrink-0"
            :checked="propBool('showValueCount')"
            @change="update({ showValueCount: ($event.target as HTMLInputElement).checked })"
          />
          <span :class="PROP_LABEL">在标签后显示值个数</span>
        </label>
        <p :class="'text-[10px] text-slate-500 mt-0.5'">开启后 Key 会显示为 "名称(3)" 格式</p>
      </div>
    </section>

    <!-- Dictionary Matching -->
    <section>
      <h4 :class="PROP_SECTION">字典匹配（标签名）</h4>
      <div class="space-y-2 mt-1.5">
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            class="editor-checkbox shrink-0"
            :checked="propBool('labelAbbrevEnabled')"
            @change="update({ labelAbbrevEnabled: ($event.target as HTMLInputElement).checked })"
          />
          <span :class="PROP_LABEL">缩略语字典匹配</span>
        </label>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            class="editor-checkbox shrink-0"
            :checked="propBool('labelColorDictEnabled')"
            @change="update({ labelColorDictEnabled: ($event.target as HTMLInputElement).checked })"
          />
          <span :class="PROP_LABEL">颜色字典匹配</span>
        </label>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            class="editor-checkbox shrink-0"
            :checked="propBool('labelIconDictEnabled')"
            @change="update({ labelIconDictEnabled: ($event.target as HTMLInputElement).checked })"
          />
          <span :class="PROP_LABEL">图标字典匹配</span>
        </label>
      </div>
    </section>

  </div>
</template>
