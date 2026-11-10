我打算新增加一个模块lvgl_hmi，有点类似editor模块，主要目的是生成用于描述界面的json，这个json后面需要在设备中读取，根据json配置生成LVGL界面。我已经有做好的json,稍后我会提供.

1.hmi程序提供布局组件和通用卡片组件
2.整体布局采用类似flex的流式布局，参考栅格布局的方式，设置容器，容器可套嵌。
3.通用卡片主要KEY-VALUE显示，可以配置KEY的字体，样式，颜色，底色等，也可配置上下还是左右，还有间距。
4.页面根据目标设备显示屏进行配置，如现在需要完成1024X600的屏幕。
5.卡片显示对应主要和数据查询json配对，
6.要支持颜色字典，要支持缩略语字典。
7.需要支持图片，以及本地地址和远程地址显示。
8.支持预览，可以用HTML的方式进行预览。


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
  "version": 1,
  "cards": [
    {
      "type": "container",
      "id": "home",
      "pad": 0,
      "radius": 0,
      "bg_color": "#33ABE4",
      "border": { "width": 0 },
      "shadow": { "width": 0 },
      "size": { "w": 1024, "h": 600 },
      "layout": {
        "flow": "column",
        "gap_row": 0,
        "align_main": "start",
        "align_cross": "start"
      },
      "children": [
        {
          "type": "container",
          "id": "banner",
          "pad": 0,
          "radius": 0,
          "bg_color": "#0E3A5F",
          "border": { "width": 0 },
          "shadow": { "width": 0 },
          "size": { "w": 1024, "h": 54 },
          "layout": { "flow": "row", "align_main": "end", "align_cross": "center" },
          "children": [
            {
              "type": "value",
              "prop": "CLOCK",
              "format": "%Y年%m月%d日 %H:%M:%S %A",
              "value_font": "status",
              "value_color": "#FFFFFF",
              "pad_x": 16,
              "pad_y": 0,
              "text_ofs_y": 8,
              "layout": { "flow": "row", "align_main": "end", "align_cross": "center" },
              "size": { "w": 1024, "h": 54 }
            }
          ]
        },
        {
          "type": "container",
          "id": "body",
          "pad_y": 13,
          "pad_left": 16,
          "pad_right": 16,
          "bg_color": "#33ABE4",
          "border": { "width": 0 },
          "shadow": { "width": 0 },
          "size": { "w": 1024, "h": 546 },
          "layout": {
            "flow": "row",
            "gap_col": 21,
            "align_main": "start",
            "align_cross": "start"
          },
          "children": [
        {
          "type": "container",
          "id": "left",
          "pad": 4,
          "bg_color": "#EBF7FC",
          "radius": 10,
          "border": { "width": 0 },
          "shadow": { "width": 12, "color": "#104866", "ofs_x": 0, "ofs_y": 4 },
          "size": { "w": 210, "h": 520 },
          "layout": {
            "flow": "column",
            "gap_row": 4,
            "align_main": "start",
            "align_cross": "center"
          },
          "children": [
            {
              "type": "value",
              "prop": "BEDNAME",
              "value_font": "num_huge",
              "value_color": "#222222",
              "layout": { "flow": "column", "align_main": "center", "align_cross": "center" },
              "size": { "w": 200, "h": 110 }
            },
            {
              "type": "label",
              "title": "入院时间",
              "title_font": "default",
              "title_color": "#333333"
            },
            {
              "type": "value",
              "prop": "ADMISS_HOSPITAL_DATE",
              "value_font": "status",
              "value_color": "#222222",
              "layout": { "flow": "column", "align_main": "center", "align_cross": "center" },
              "size": { "w": 200, "h": 40 }
            },
            {
              "type": "qrcode",
              "prop": "QRCODE",
              "bg_color": "#FFFFFF",
              "radius": 4,
              "pad": 4,
              "size": { "w": 156, "h": 156 }
            },
            {
              "type": "label",
              "title": "住院号",
              "title_font": "default",
              "title_color": "#333333"
            },
            {
              "type": "value",
              "prop": "PATIENTCHECKIN_NO",
              "value_font": "status",
              "value_color": "#222222",
              "layout": { "flow": "column", "align_main": "center", "align_cross": "center" },
              "size": { "w": 200, "h": 40 }
            }
          ]
        },
        {
          "type": "container",
          "id": "center",
          "pad": 0,
          "border": { "width": 0 },
          "shadow": { "width": 0 },
          "size": { "w": 490, "h": 520 },
          "layout": {
            "flow": "column",
            "gap_row": 12,
            "align_main": "start",
            "align_cross": "center"
          },
          "children": [
            {
              "type": "container",
              "id": "name_card",
              "pad": 8,
              "bg_color": "#EBF7FC",
              "radius": 10,
              "border": { "width": 0 },
              "shadow": { "width": 12, "color": "#104866", "ofs_x": 0, "ofs_y": 4 },
              "size": { "w": 490, "h": 244 },
              "layout": {
                "flow": "column",
                "gap_row": 10,
                "align_main": "start",
                "align_cross": "start"
              },
              "children": [
            {
              "type": "container",
              "pad": 0,
              "border": { "width": 0 },
              "shadow": { "width": 0 },
              "size": { "w": 470, "h": 110 },
              "layout": {
                "flow": "row",
                "gap_col": 12,
                "align_main": "start",
                "align_cross": "center"
              },
              "children": [
                {
                  "type": "value",
                  "prop": "PATIENT_NAME",
                  "value_font": "num_huge",
                  "value_style": "bold",
                  "value_color": "#222222",
                  "layout": { "flow": "row", "align_main": "start", "align_cross": "center" },
                  "size": { "w": 300, "h": 100 }
                },
                {
                  "type": "value",
                  "prop": "SEX_NAME",
                  "value_font": "status",
                  "value_color": "#222222",
                  "size": { "w": 60, "h": 48 }
                },
                {
                  "type": "value",
                  "prop": "AGE",
                  "value_font": "status",
                  "value_color": "#222222",
                  "size": { "w": 100, "h": 48 }
                }
              ]
            },
            {
              "type": "value",
              "prop": "DOCTOR_CURE",
              "title": "主治医生:",
              "title_font": "status",
              "title_color": "#222222",
              "value_font": "status",
              "value_color": "#222222",
              "pad_x": 8,
              "pad_y": 0,
              "layout": { "flow": "row", "gap_col": 16, "align_main": "start", "align_cross": "center" },
              "size": { "w": 470, "h": 48 }
            },
            {
              "type": "value",
              "prop": "NURSE",
              "title": "责任护士:",
              "title_font": "status",
              "title_color": "#222222",
              "value_font": "status",
              "value_color": "#222222",
              "pad_x": 8,
              "pad_y": 0,
              "layout": { "flow": "row", "gap_col": 16, "align_main": "start", "align_cross": "center" },
              "size": { "w": 470, "h": 48 }
            }
              ]
            },
            {
              "type": "value",
              "prop": "TEND_NAME",
              "title": "级",
              "title_font": "num_large",
              "title_color": "#FF0000",
              "value_font": "35",
              "value_color": "#222222",
              "bg_color": "#EBF7FC",
              "radius": 12,
              "pad": 8,
              "border": { "width": 0 },
              "shadow": { "width": 12, "color": "#104866", "ofs_x": 0, "ofs_y": 4 },
              "layout": { "flow": "row", "gap_col": 16, "align_main": "start", "align_cross": "center" },
              "size": { "w": 490, "h": 80 }
            },
            {
              "type": "value",
              "prop": "DRUG_FEEDBACK",
              "title": "敏",
              "title_font": "num_large",
              "title_color": "#FF0000",
              "value_font": "35",
              "value_color": "#222222",
              "bg_color": "#EBF7FC",
              "radius": 12,
              "pad": 8,
              "border": { "width": 0 },
              "shadow": { "width": 12, "color": "#104866", "ofs_x": 0, "ofs_y": 4 },
              "layout": { "flow": "row", "gap_col": 16, "align_main": "start", "align_cross": "center" },
              "size": { "w": 490, "h": 80 }
            },
            {
              "type": "value",
              "prop": "DIET_LEVEL_NAME",
              "title": "食",
              "title_font": "num_large",
              "title_color": "#1A6F99",
              "value_font": "35",
              "value_color": "#222222",
              "bg_color": "#EBF7FC",
              "radius": 12,
              "pad": 8,
              "border": { "width": 0 },
              "shadow": { "width": 12, "color": "#104866", "ofs_x": 0, "ofs_y": 4 },
              "layout": { "flow": "row", "gap_col": 16, "align_main": "start", "align_cross": "center" },
              "size": { "w": 490, "h": 80 }
            }
          ]
        },
        {
          "type": "container",
          "id": "safe",
          "pad": 4,
          "bg_color": "#EBF7FC",
          "radius": 10,
          "border": { "width": 0 },
          "shadow": { "width": 12, "color": "#104866", "ofs_x": 0, "ofs_y": 4 },
          "size": { "w": 250, "h": 420 },
          "layout": {
            "flow": "column",
            "gap_row": 8,
            "align_main": "start",
            "align_cross": "center"
          },
          "children": [
            {
              "type": "split",
              "prop": "SAFETAKECARE",
              "split": ",",
              "value_font": "33",
              "value_color": "#FFFFFF",
              "item_h": 73,
              "gap": 8,
              "size": { "w": 242, "h": 404 },
              "colors": {
                "防坠床": "#FF0000",
                "防窒息": "#02AC38"
              },
              "default_color": "#7C7C7C"
            }
          ]
        }
      ]
    }
  ]
    }
  ]
}
