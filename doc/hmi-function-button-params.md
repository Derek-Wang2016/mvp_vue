# HMI 功能按钮参数

功能按钮在编辑器里用 JSON 文本配置参数，发布到设备 JSON 时写成对象。

## 设备 JSON

`pages.<name>.shapes[]` 中，`type` 为 `button` 且 `action` 为 `function` 时可带 `params`：

```json
{
  "type": "button",
  "x": 400,
  "y": 460,
  "w": 160,
  "h": 56,
  "text": "呼叫",
  "symbol": "CALL",
  "action": "function",
  "key": "CALL_NURSE",
  "params": {
    "floor": "3F",
    "bed": "08",
    "priority": 1
  }
}
```

- `key`：设备端识别功能的键。
- `params`：功能参数，可以是 JSON 对象、数组或其他合法 JSON 值；由设备端按 `key` 解释。
- `action` 为 `page` 时不写 `params`。
- 参数留空、不是合法 JSON 或按钮不是功能类型时，设备 JSON 不包含 `params`。

编辑器内部把参数保存为 JSON 文本，导入已发布设备 JSON 时会自动把对象型 `params` 转回文本。旧版无 `params` 的功能按钮保持兼容，设备端按空参数处理即可。
