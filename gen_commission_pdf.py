# -*- coding: utf-8 -*-
"""產生一份模擬委託單 PDF，格式與系統 printCommission.ts 一致"""
from fpdf import FPDF
import os

OUT = r"C:\Users\88690\OneDrive\Desktop\畢業專題\mock_commission_EXP-2024-TEST01.pdf"

# ── 字型路徑（Windows 微軟正黑體）────────────────────────────────────────
FONT_PATH = r"C:\Windows\Fonts\msjh.ttc"
if not os.path.exists(FONT_PATH):
    FONT_PATH = r"C:\Windows\Fonts\mingliu.ttc"   # 細明體 fallback

# ── 模擬資料 ──────────────────────────────────────────────────────────────
CODE         = "EXP-2024-TEST01"
CLIENT_CO    = "旺隆責任有限公司 / WANG LONG (VIET NAM)"
FABRIC_CODE  = "WL-2024-A099"
CLIENT_NAME  = "陳大明 / Tran Dai Minh"
APPLY_DATE   = "2024-11-15"
EXPECTED     = "2024-11-25"
ACTUAL       = "2024-11-22"
COMM_TYPE    = "K"   # K / B / Q / O

TEST_ITEMS = [
    {
        "chemicalName": "RC-629",
        "lotNo": "RC629-2411A",
        "testPurposes": "Quick dry、Water repellence",
        "description": "低泡精練滲透劑\n用量 2% owf\n浴比 1:10，60°C × 20min",
        "result": "乾燥時間 180s → 42s（達標）\n斥水角 95°（通過 AATCC 22）",
    },
    {
        "chemicalName": "DF-301",
        "lotNo": "DF301-2411B",
        "testPurposes": "ΔE、Appearance",
        "description": "消泡劑\n用量 0.5g/L\n搭配 RC-629 使用",
        "result": "ΔE = 0.32（< 1.0）\n外觀均勻無斑",
    },
    {
        "chemicalName": "AW-120 柔軟劑",
        "lotNo": "AW120-2411C",
        "testPurposes": "Handle、Wicking",
        "description": "陽離子柔軟劑\n4% owf，80°C 定型 90s",
        "result": "手感柔順（通過）\n吸濕導濕性略降 5%（可接受）",
    },
]

COMM_NOTES   = "☑ 報告 báo cáo"
CONCL_BEFORE = "布料原始乾燥時間約 180 秒，斥水性未達標（AATCC 22 < 70°），需施加功能助劑。"
CONCL_AFTER  = "處理後乾燥時間 42 秒，斥水角 95°，手感柔順，建議量產採用 RC-629 + AW-120 組合配方。"

# ── PDF class ─────────────────────────────────────────────────────────────
class CommissionPDF(FPDF):
    def header(self):
        pass  # 用自訂標題代替

    def cell_text(self, w, h, txt, border=0, ln=0, align='L', fill=False, style=''):
        self.set_font("msjh", style=style, size=9)
        self.multi_cell(w, h, txt, border=border, align=align, new_x="RIGHT", new_y="TOP")
        if ln:
            self.ln(h)

pdf = FPDF(orientation="P", unit="mm", format="A4")
pdf.add_font("msjh", "", FONT_PATH)
pdf.add_font("msjh", "B", FONT_PATH)
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=10)

L = 10   # left margin
W = 190  # usable width

# ── 標題 ─────────────────────────────────────────────────────────────────
pdf.set_font("msjh", "B", 11)
pdf.set_xy(L, 10)
pdf.cell(W, 6, "旺隆責任有限公司 / CÔNG TY TNHH WANG LONG (VIỆT NAM)", align="C", ln=True)
pdf.set_font("msjh", "B", 9)
pdf.set_x(L)
pdf.cell(W, 5, "實驗室委託單（化學品對布料效果測試表）/ PHIẾU YÊU CẦU PHÒNG THÍ NGHIỆM", align="C", ln=True)
pdf.ln(2)

# ── Info table ────────────────────────────────────────────────────────────
pdf.set_font("msjh", "", 9)
row_h = 6
col_left = W // 2

def info_row(left_txt, right_txt):
    pdf.set_x(L)
    pdf.cell(col_left, row_h, left_txt, border=1)
    pdf.cell(col_left, row_h, right_txt, border=1, ln=True)

info_row(f"No: {CODE}", f"試驗編號：{CODE}")
info_row(f"客戶公司名稱 / Tên Cty Khách Hàng：{CLIENT_CO}", f"申請日期：{APPLY_DATE}")
info_row(f"布料代碼 / Mã số vải：{FABRIC_CODE}", f"預計完成日：{EXPECTED}")
info_row(f"客戶名稱 / Người Liên lạc：{CLIENT_NAME}", f"實際完成日：{ACTUAL}")

# 類型列
TYPES = {
    "K": "K : R&D 研究開發",
    "B": "B : Comparison 對照測試",
    "Q": "Q : Replace 替代測試",
    "O": "O : Others 其他",
}
type_str = "類型：  " + "  ".join(
    ("☑ " if k == COMM_TYPE else "☐ ") + v for k, v in TYPES.items()
)
pdf.set_x(L)
pdf.cell(W, row_h, type_str, border=1, ln=True)

pdf.ln(2)

# ── 測試項目表 ────────────────────────────────────────────────────────────
pdf.set_font("msjh", "B", 9)
col_w = [26, 22, 40, 51, 51]   # 化學品名稱、Lot No、測試目的、說明、結果
headers = [
    "化學品名稱\nTên Mẫu",
    "Lot No\nMã Hàng",
    "測試目的\nMục đích",
    "說明\nMô tả",
    "結果\nKết quả",
]

# 表頭
y_start = pdf.get_y()
x = L
for i, (h_txt, cw) in enumerate(zip(headers, col_w)):
    pdf.set_xy(x, y_start)
    pdf.multi_cell(cw, 4.5, h_txt, border=1, align="C")
    x += cw
# 移到下一行
pdf.set_xy(L, y_start + 9)

# 資料列
pdf.set_font("msjh", "", 8)
for item in TEST_ITEMS:
    y_row = pdf.get_y()
    x = L
    cells = [
        item["chemicalName"],
        item["lotNo"],
        item["testPurposes"],
        item["description"],
        item["result"],
    ]
    # 先計算這一列需要的高度（以最高的 multi_cell 為準）
    max_h = 0
    for i, (txt, cw) in enumerate(zip(cells, col_w)):
        # 模擬計算行數
        lines = txt.count("\n") + 1
        h = lines * 4.5
        if h > max_h:
            max_h = h
    max_h = max(max_h, 12)

    for txt, cw in zip(cells, col_w):
        pdf.set_xy(x, y_row)
        pdf.multi_cell(cw, 4.5, txt, border=1)
        x += cw
    pdf.set_xy(L, y_row + max_h)

pdf.ln(2)

# ── 備註 ─────────────────────────────────────────────────────────────────
pdf.set_font("msjh", "", 9)
pdf.set_x(L)
pdf.cell(W, 6, f"備註 / Ghi chú：  {COMM_NOTES}", border=1, ln=True)
pdf.ln(2)

# ── 結論 Before / After ───────────────────────────────────────────────────
pdf.set_font("msjh", "B", 9)
pdf.set_x(L)
pdf.cell(W // 2, 5.5, "結論 Before", border=1, align="C")
pdf.cell(W // 2, 5.5, "結論 After",  border=1, align="C", ln=True)

pdf.set_font("msjh", "", 9)
y_concl = pdf.get_y()
pdf.set_xy(L, y_concl)
pdf.multi_cell(W // 2, 5, CONCL_BEFORE, border="LRB")
after_y = pdf.get_y()
pdf.set_xy(L + W // 2, y_concl)
pdf.multi_cell(W // 2, 5, CONCL_AFTER, border="LRB")
pdf.set_y(max(after_y, pdf.get_y()) + 2)

# ── 簽名列 ───────────────────────────────────────────────────────────────
sig_labels = ["經理 / Giám Đốc", "化驗室人員 / Người phụ trách", "建立者 / Người đưa đơn"]
sig_w = W // 3
pdf.set_font("msjh", "B", 9)
y_sig = pdf.get_y()
for i, lbl in enumerate(sig_labels):
    pdf.set_xy(L + i * sig_w, y_sig)
    pdf.multi_cell(sig_w, 20, lbl, border=1, align="C")

pdf.output(OUT)
print(f"✅ PDF 已產生：{OUT}")
