import { ref, shallowRef } from 'vue'

export interface ColorPickerSession {
  value: string
  onChange: (hex: string) => void
}

/** 全局唯一取色会话，避免每行 ColorSwatch 各自 Teleport 叠层 */
const open = ref(false)
const session = shallowRef<ColorPickerSession | null>(null)

export function useColorPicker() {
  function openColorPicker(value: string, onChange: (hex: string) => void) {
    session.value = { value, onChange }
    open.value = true
  }

  function confirmColor(hex: string) {
    session.value?.onChange(hex)
    closeColorPicker()
  }

  function closeColorPicker() {
    open.value = false
    session.value = null
  }

  return {
    open,
    session,
    openColorPicker,
    confirmColor,
    closeColorPicker,
  }
}
