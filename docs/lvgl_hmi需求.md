我打算新增加一个模块lvgl_hmi，有点类似editor模块，主要目的是生成用于描述界面的json，这个json后面需要在设备中读取，根据json配置生成LVGL界面。我已经有做好的json,稍后我会提供.

1.hmi程序提供底层形状和绝对定位卡片
2.卡片内部是栅格，不嵌套容器，也不在卡片里再套卡片
3.格子分 label、value、qrcode、split，标题和数值可以左右并排并设置间距。split 缺省纵向；`flow` 为 `row` 时按列从左往右排，此时 `item_h` 是列宽
4.页面根据目标设备显示屏进行配置，如现在需要完成1024X600的屏幕
5.卡片显示和数据查询 json 配对，预览使用样例数据，样例不写入设备 JSON
6.颜色直接写 #RRGGBB
7.图片只作为形状装饰，拉伸到指定宽高。`src` 相对程序目录；`url` 为可访问地址，有值时从该地址取图。上传图片会把文件服务的完整地址写入 `url`，例如 `http://主机:3002/api/hmi/files/{id}`
8.支持 HTML 预览。设备 JSON 只有 version、shapes、cards


数据json一般如下：

返回结果:
{
    "res": "ok",
    "obj": [
        {
            "UUID": "D1B0AF7F-0CD6-4154-9678-2E10B4F2FE82",
            "DEPT_SN": "01100",
            "WARD_SN": "01111",
            "PATIENT_ID": "01212074812345",
            "ROOM_NO": "3",
            "ROOMNAME": "3房",
            "BED_NO": "6",
            "BEDNAME": "6床",
            "PATIENT_NAME": "万春江",
            "SEX_NAME": "女",
            "AGE": "35岁",
            "ADMISS_HOSPITAL_DATE": "2025-11-10",
            "DOCTOR": "张华军",
            "DRUG_FEEDBACK": "花粉类过敏,青霉素过敏",
            "BIRTH_DATE": "1900-01-01 00:00:00.0",
            "RELIGION": "",
            "PATIENT_IDENTITY": "",
            "PATIENT_IDENTITY_NAME": "",
            "PATIENT_STATUS": "5",
            "PATIENT_STATUS_NAME": "",
            "PLANCHECKOUTDATE": "",
            "ADMISS_WARD_DATE": "2021-06-20",
            "ADMISS_TIMES": "1",
            "PATIENT_OUT_PLACE": "",
            "PATIENTCHECKIN_NO": "012119430",
            "DOCTOR_CURE": "",
            "PROFESSOR": "方伟",
            "NURSE": "欧文李月",
            "NURSELEADER": "李二凯",
            "PAY_TYPE": "7",
            "PAY_TYPE_NAME": "城镇职工基本医疗保险",
            "DIET_LEVEL": "4",
            "DIET_LEVEL_NAME": "低盐低脂",
            "TEND": "3",
            "TEND_NAME": "三级护理",
            "ISOLATION_TYPE": "",
            "ISOLATION_TYPE_NAME": "",
            "MEASURE_METHOD": "",
            "TOILETING_ABILITY": "",
            "COMMUNICABLE_DISEASES_INDEX": "",
            "COMMUNICABLE_DISEASES_NAME": "飞沫隔离",
            "OPERATION_TIME": "2021-12-06",
            "BOOKCHECKTIME": "",
            "BOOKDOCTORTIME": "",
            "DOCTORLEADER": "",
            "BED_TYPE": "0",
            "BED_TYPE_NAME": "",
            "PREPAY_TOTAL": "5000.00",
            "CHARGE_TOTAL": "9122.82",
            "BALANCE_TOTAL": "-4122.82",
            "CHARGE_YESTODAY": "0.00",
            "CHARGE_TODAY": "417.88",
            "OTHER2": false,
            "SAFETAKECARE": "防窒息,防坠床",
            "DIAGNOSE": "腰椎间盘突出",
            "QRCODE": "01212074812345",
            "WORKMEMO": "",
            "CHARGE_SOCIALSECURITY": "0.00",
            "CHARGE_PRIVATE": "0.00",
            "IDENTITY_CARD": "533022198510172621",
            "IDCARD_NUM": "91471684",
            "TELPHONE": "18783372340",
            "NATIVE_PLACE": "23252",
            "POSITION": "",
            "TELPHONE_HOME": "18783372340",
            "COMPANY": "",
            "ADDRESS": "四川省眉山市东坡区金花乡长山埂1组",
            "TAKECAREPEOPLE": "万先生",
            "TAKECAREPEOPLE_TELPHONE": "18783372340",
            "ZT": "在线",
            "DAYS": -1,
            "ADMISSTODAY": 0,
            "FEE_LIST": [],
            "PIIMGXH": 0,
            "EDITED": "update",
            "PATIENT_OUT_PLACE_NAME": "西安三医院",
            "QYBZ": "未签阅",
            "MEMO": "012119430",
            "OTHER3": "",
            "OTHER4": "0",
            "OTHER1": "",
            "COLORRED": 24,
            "COLORGREEN": 231,
            "COLORBLUE": 24,
            "DEVIP": "192.168.10.75",
            "SHORTNUM": "0006",
            "ISVIDEO": 0,
            "NEWROOMNAME": "3房",
            "NEWBEDNAME": "6床",
            "ADMISSHOSPITALSTR": "2025-11-10 00:00:00.0"
        }
    ],
    "datatype": "病人信息"
}



下面是一个例子：

{
  "version": 2,
  "shapes": [
    {"type": "rect", "x": 0, "y": 0, "w": 1024, "h": 600, "bg": "#33ABE4"},
    {"type": "rect", "x": 0, "y": 0, "w": 1024, "h": 54, "bg": "#0E3A5F"},
    {"type": "line", "x1": 0, "y1": 54, "x2": 1024, "y2": 54, "width": 1, "color": "#7EC8E3"}
  ],
  "cards": [
    {
      "x": 0, "y": 0, "w": 1024, "h": 54,
      "cols": 1, "rows": 1,
      "items": [
        {
          "type": "value", "prop": "CLOCK", "col": 0, "row": 0,
          "font": "status", "color": "#FFFFFF", "align": "end",
          "format": "%Y年%m月%d日 %H:%M:%S %A"
        }
      ]
    },
    {
      "x": 16, "y": 67, "w": 210, "h": 520,
      "bg": "#EBF7FC", "radius": 10,
      "shadow": {"width": 12, "color": "#104866", "ofs_y": 4},
      "cols": 1, "gap": 4,
      "row_h": [110, 32, 40, 168, 32, 48],
      "items": [
        {"type": "value", "prop": "BEDNAME", "row": 0, "font": "num_huge", "color": "#222222", "align": "center"},
        {"type": "label", "text": "入院时间", "row": 1, "font": "default", "color": "#333333", "align": "center"},
        {"type": "value", "prop": "ADMISS_HOSPITAL_DATE", "row": 2, "font": "status", "color": "#222222", "align": "center"},
        {"type": "qrcode", "prop": "QRCODE", "row": 3, "size": 140, "align": "center"},
        {"type": "label", "text": "住院号", "row": 4, "font": "default", "color": "#333333", "align": "center"},
        {"type": "value", "prop": "PATIENTCHECKIN_NO", "row": 5, "font": "status", "color": "#222222", "align": "center"}
      ]
    },
    {
      "x": 247, "y": 67, "w": 490, "h": 244,
      "bg": "#EBF7FC", "radius": 10,
      "shadow": {"width": 12, "color": "#104866", "ofs_y": 4},
      "rows": 3, "gap": 8,
      "col_w": [300, 80, 90],
      "row_h": [120, 52, 52],
      "items": [
        {"type": "value", "prop": "PATIENT_NAME", "col": 0, "row": 0, "font": "num_huge", "bold": 1, "color": "#222222", "align": "start"},
        {"type": "value", "prop": "SEX_NAME", "col": 1, "row": 0, "font": "status", "color": "#222222", "align": "center"},
        {"type": "value", "prop": "AGE", "col": 2, "row": 0, "font": "status", "color": "#222222", "align": "center"},
        {"type": "value", "prop": "DOCTOR_CURE", "col": 0, "row": 1, "colspan": 3, "title": "主治医生:", "title_font": "status", "title_color": "#222222", "font": "status", "color": "#222222", "align": "start"},
        {"type": "value", "prop": "NURSE", "col": 0, "row": 2, "colspan": 3, "title": "责任护士:", "title_font": "status", "title_color": "#222222", "font": "status", "color": "#222222", "align": "start"}
      ]
    },
    {
      "x": 247, "y": 323, "w": 490, "h": 80,
      "bg": "#EBF7FC", "radius": 12,
      "shadow": {"width": 12, "color": "#104866", "ofs_y": 4},
      "cols": 1, "rows": 1,
      "items": [
        {"type": "value", "prop": "TEND_NAME", "title": "级", "title_font": "num_large", "title_color": "#FF0000", "font": "35", "color": "#222222", "align": "start"}
      ]
    },
    {
      "x": 247, "y": 415, "w": 490, "h": 80,
      "bg": "#EBF7FC", "radius": 12,
      "shadow": {"width": 12, "color": "#104866", "ofs_y": 4},
      "cols": 1, "rows": 1,
      "items": [
        {"type": "value", "prop": "DRUG_FEEDBACK", "title": "敏", "title_font": "num_large", "title_color": "#FF0000", "font": "35", "color": "#222222", "align": "start"}
      ]
    },
    {
      "x": 247, "y": 507, "w": 490, "h": 80,
      "bg": "#EBF7FC", "radius": 12,
      "shadow": {"width": 12, "color": "#104866", "ofs_y": 4},
      "cols": 1, "rows": 1,
      "items": [
        {"type": "value", "prop": "DIET_LEVEL_NAME", "title": "食", "title_font": "num_large", "title_color": "#1A6F99", "font": "35", "color": "#222222", "align": "start"}
      ]
    },
    {
      "x": 758, "y": 67, "w": 250, "h": 420,
      "bg": "#EBF7FC", "radius": 10,
      "shadow": {"width": 12, "color": "#104866", "ofs_y": 4},
      "cols": 1, "rows": 1,
      "items": [
        {
          "type": "split", "prop": "SAFETAKECARE", "split": ",",
          "font": "33", "color": "#FFFFFF", "item_h": 73, "gap": 8,
          "default_color": "#7C7C7C",
          "colors": {"防坠床": "#FF0000", "防窒息": "#02AC38", "防跌倒": "#E67E22", "防压疮": "#8E44AD", "防走失": "#2980B9", "防烫伤": "#C0392B", "防脱管": "#16A085", "防误吸": "#D35400", "防血栓": "#1A5276", "防感染": "#6C3483", "留陪人": "#1E8449", "绝对卧床": "#1F4E79"}
        }
      ]
    }
  ]
}
