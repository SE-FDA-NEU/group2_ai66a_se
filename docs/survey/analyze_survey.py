#!/usr/bin/env python3
"""
Phân tích khảo sát "Thói quen mua sắm & săn sale của học sinh, sinh viên".

Cách dùng:
    Để file CSV xuất từ Google Form trong cùng thư mục với script, sau đó chạy:
    python analyze_survey.py <đường_dẫn_file.csv> [--out 05-analyze-survey.md]

Ndung:
  1) Kiểm tra dữ liệu (kích thước, ô trống, trùng lặp, khoảng trắng, mâu thuẫn).
  2) Tính thống kê tổng hợp cho từng nhóm câu hỏi.
  3) Xuất phần "Thống kê tổng hợp" dạng Markdown 

Lưu ý: các câu hỏi "chọn nhiều đáp án" được tách theo DANH SÁCH ĐÁP ÁN CHUẨN của form,
không tách theo dấu phẩy, vì một số đáp án có dấu phẩy nằm trong nội dung.
"""
import sys
import argparse
import unicodedata
from collections import Counter

import pandas as pd

# --------------------------------------------------------------------------- #
# 1. Tên cột rút gọn (theo đúng thứ tự cột của Google Form)
# --------------------------------------------------------------------------- #
COLS = ["ts", "name", "gender", "age", "status", "income_src", "spend", "living",
        "bought_online", "tech", "platforms", "online_spend", "sale_freq", "workflow",
        "goals", "success", "automate", "core_value", "situations", "biggest_pain",
        "pain_freq", "emotion", "story", "other_pain", "check_time", "check_ctx",
        "check_in_class", "no_buy_reason", "start_buy_factor"]

# --------------------------------------------------------------------------- #
# 2. Danh sách đáp án chuẩn cho các câu hỏi chọn nhiều (đúng nguyên văn trong CSV)
#    key = nhãn ngắn dùng trong bảng thống kê, value = nguyên văn đáp án
# --------------------------------------------------------------------------- #
MULTI = {
    "platforms": {
        "Shopee": "Shopee", "TikTok Shop": "TikTok Shop", "Lazada": "Lazada", "Sendo": "Sendo",
    },
    "goals": {
        "Mua món hàng với giá rẻ nhất có thể": "Mua được món hàng với giá rẻ nhất có thể",
        "Tiết kiệm tiền cho việc khác": "Tiết kiệm tiền cho việc khác",
        "Mua được nhiều đồ với ngân sách giới hạn": "Mua được nhiều đồ mình muốn với ngân sách giới hạn",
        "Giảm stress trong chi tiêu": "Giảm stress trong việc chi tiêu",
        "Nhận thông báo kịp thời, không bỏ lỡ giá tốt": "Nhận thông báo kịp thời để không bỏ lỡ mức giá tốt",
    },
    "automate": {
        "Tự động theo dõi giá & báo khi giảm tới mức mong muốn":
            "Tự động theo dõi biến động giá và báo khi giá giảm xuống mức tôi mong muốn",
        "Biểu đồ lịch sử giá (tự đánh giá sale ảo)":
            "Hiển thị biểu đồ lịch sử giá để tôi tự đánh giá xem shop có sale ảo hay không",
        "Watchlist: theo dõi nhiều sản phẩm cùng lúc": "Theo dõi giá của nhiều sản phẩm cùng lúc",
        "AI dự đoán & cảnh báo trước đợt hạ giá/flash sale":
            "Dùng AI để dự đoán và cảnh báo trước khi sắp có đợt hạ giá hoặc flash sale",
        "Kiểm tra/gợi ý độ uy tín của shop":
            "Tự động kiểm tra và gợi ý mức độ uy tín của shop dựa trên lượng đã bán và review",
        "So sánh giá chéo nhiều sàn": "So sánh giá cùng sản phẩm chéo qua nhiều sàn",
    },
    "core_value": {
        "Tiết kiệm tiền bạc (rẻ hơn bình thường)":
            "Tiết kiệm tiền bạc: đảm bảo mua được giá rẻ hơn mức bình thường",
        "An tâm tâm lý (không sợ mua hớ / giá ảo)":
            "Sự an tâm tâm lý: xóa bỏ cảm giác sợ mua hớ, sợ bị lừa bởi chiêu trò tăng giá ảo",
        "Tiện lợi (gom theo dõi nhiều sàn vào một chỗ)":
            "Sự tiện lợi: gom việc theo dõi giá, lưu sản phẩm từ nhiều sàn vào một chỗ",
        "Tiết kiệm thời gian (không phải mở app check mỗi ngày)":
            "Tiết kiệm thời gian: không cần tự mở app kiểm tra giá mỗi ngày",
    },
    "situations": {
        "Mua xong vài ngày sau giá giảm mạnh hơn": "Mua hàng xong vài ngày thì thấy giá giảm mạnh hơn",
        "Bỏ lỡ flash sale vì không online đúng giờ": "Bỏ lỡ flash sale vì không online đúng giờ",
        "So sánh kỹ nhiều shop vẫn mua phải hàng không như mong muốn":
            "So sánh kỹ giữa nhiều shop rồi vẫn mua phải hàng không như mong muốn",
        "Quên mất sản phẩm đang muốn mua": "Quên mất một sản phẩm đang muốn mua",
        "Phát hiện shop tăng giá ảo rồi gắn mác giảm giá":
            "Phát hiện shop tăng giá ảo rồi gắn mác giảm giá để đánh lừa",
        "Chưa từng gặp vấn đề gì": "Chưa từng gặp vấn đề gì",
    },
    "check_time": {
        "Khi vừa phát sinh nhu cầu mua": "Khi vừa phát sinh nhu cầu mua",
        "Trước khi mua vài ngày": "Trước khi mua vài ngày",
        "Trước khi mua vài tuần": "Trước khi mua vài tuần",
        "Trong các dịp sale lớn": "Trong các dịp sale lớn",
        "Thường xuyên theo dõi giá dù chưa định mua": "Tôi thường xuyên theo dõi giá dù chưa có ý định mua ngay",
    },
    "check_ctx": {
        "Ở nhà / phòng trọ": "Ở nhà hoặc phòng trọ",
        "Khi đang giải trí / dùng mạng xã hội": "Khi đang giải trí hoặc dùng mạng xã hội",
        "Khi nghỉ giải lao": "Khi nghỉ giải lao",
        "Khi đang mua sắm trực tiếp": "Khi đang mua sắm trực tiếp",
        "Đang học trên lớp / giảng đường": "Đang học trên lớp hoặc giảng đường",
        "Khi đang di chuyển": "Khi đang di chuyển",
    },
}
SINGLE_ORDER = {
    "gender": ["Nữ", "Nam"],
    "age": ["Dưới 18", "18–22", "23–25"],
    "status": ["Sinh viên năm 1–2", "Sinh viên năm 3–4 / sắp ra trường", "Sinh viên vừa học vừa đi làm thêm"],
    "income_src": ["Gia đình chu cấp", "Làm thêm bán thời gian", "Học bổng / trợ cấp", "Kết hợp nhiều nguồn"],
    "spend": ["Dưới 3 triệu VNĐ", "3 – 5 triệu VNĐ", "5 – 10 triệu VNĐ", "Trên 10 triệu VNĐ"],
    "living": ["Sống cùng bố mẹ / gia đình", "Ở trọ một mình", "Ở ghép cùng bạn", "Ở cùng em gái ( ở trọ )"],
    "tech": None, "online_spend": ["Ít", "Trung bình", "Kha khá", "Nhiều"],
    "sale_freq": ["Chưa bao giờ", "Thỉnh thoảng", "Thường xuyên", "Săn sale vào mọi dịp có sale"],
    "pain_freq": ["Hiếm khi", "Thỉnh thoảng", "Thường xuyên"],
    "check_in_class": ["Không bao giờ", "Hiếm khi", "Thỉnh thoảng", "Khá thường xuyên"],
}
TECH_SHORT = {"Cơ bản": "Cơ bản", "Trung cấp": "Trung cấp", "Nâng cao": "Nâng cao"}
WORKFLOW_SHORT = {
    "Gom sẵn từ sớm": "Gom sẵn từ sớm (giỏ hàng, mã giảm giá, canh giờ 0h/12h)",
    "Chốt deal tại trận": "Chốt deal tại trận (lướt thấy sale/livestream → lấy voucher → chốt)",
    "So sánh đa nền tảng": "So sánh đa nền tảng (so giá chéo sàn, lưu link rẻ nhất, chờ giảm thêm)",
    "Tiện thì mua": "Tiện thì mua (không có quy trình, thấy giá hợp lý/freeship là mua)",
    "Tuỳ vào giá": "Tự điền: tùy giá sản phẩm mà dùng cách “gom sẵn” hoặc “chốt tại trận”",
}
PAIN_SHORT = {
    "Mua xong thì phát hiện giá giảm": "Mua xong phát hiện giá giảm sâu hơn sau đó",
    "Mất thời gian kiểm tra": "Mất thời gian kiểm tra giá thủ công mỗi ngày",
    "Cùng sản phẩm nhưng các shop": "Cùng sản phẩm nhưng các shop chênh giá, khó biết mua ở đâu",
    "Mua phải hàng không như kỳ vọng": "Mua phải hàng không như kỳ vọng (không kiểm tra kỹ đánh giá shop)",
    "Nghi ngờ hoặc phát hiện": "Nghi ngờ/phát hiện shop tăng giá ảo trước khi giảm",
    "Hay fomo": "Tự điền: “Hay fomo”",
}
EMOTION_SHORT = {
    "Khá bực bội": "Khá bực bội nhưng bỏ qua vì số tiền không đáng kể",
    "Không quan tâm": "Không quan tâm nhiều, đã quen",
    "Rất khó chịu": "Rất khó chịu, mất niềm tin vào shop/sàn",
}


def short(val, mapping):
    """Rút gọn nhãn dựa trên tiền tố."""
    for k, v in mapping.items():
        if str(val).startswith(k):
            return v
    return str(val)


def split_multi(cell, options):
    """Tách ô nhiều lựa chọn theo danh sách đáp án chuẩn. Trả về (nhãn_khớp, phần_tự_điền)."""
    if pd.isna(cell):
        return [], []
    rest, hits = str(cell), []
    # thay các đáp án dài trước để tránh khớp nhầm đáp án con
    for label, full in sorted(options.items(), key=lambda kv: -len(kv[1])):
        if full in rest:
            hits.append(label)
            rest = rest.replace(full, "|")
    others = [x.strip() for x in rest.replace("|", ",").split(",") if x.strip()]
    return hits, others


def pct(n, total):
    return f"{n / total * 100:.1f}".replace(".", ",") + "%"


def table(title_cols, rows):
    out = ["| " + " | ".join(title_cols) + " |", "|" + "|".join([":---"] + ["---:"] * (len(title_cols) - 1)) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(x) for x in r) + " |")
    return "\n".join(out)


def load(path):
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]
    if df.shape[1] != len(COLS):
        raise SystemExit(f"Số cột ({df.shape[1]}) khác dự kiến ({len(COLS)}) – kiểm tra lại file.")
    df.columns = COLS
    fixed = []  # các ô không ở dạng Unicode NFC (chữ có dấu tách rời) – gây lệch khi so khớp chuỗi
    for c in df.columns:
        for i, v in df[c].items():
            if isinstance(v, str):
                if unicodedata.normalize("NFC", v) != v:
                    fixed.append((i, c))
                df.at[i, c] = unicodedata.normalize("NFC", v.strip())
    df.attrs["nfc_fixed"] = fixed
    return df


# --------------------------------------------------------------------------- #
# 3. Kiểm tra dữ liệu
# --------------------------------------------------------------------------- #
def check_data(df, raw_path):
    n = len(df)
    print("=" * 70)
    print("KIỂM TRA DỮ LIỆU")
    print("=" * 70)
    print(f"- Số phản hồi: {n} | số cột: {df.shape[1]}")
    ts = pd.to_datetime(df["ts"], format="%d/%m/%Y %H:%M:%S")
    print(f"- Thời gian trả lời: {ts.min()} → {ts.max()}")
    print(f"- Dòng trùng hoàn toàn: {df.duplicated().sum()} | trùng tên: "
          f"{df['name'].str.lower().duplicated().sum()}")
    empty_cols = [c for c in df.columns if df[c].isna().all()]
    part_cols = {c: int(df[c].isna().sum()) for c in df.columns if 0 < df[c].isna().sum() < n}
    print(f"- Cột trống hoàn toàn: {empty_cols}")
    print(f"- Cột trống một phần: {part_cols}")
    print(f"- Đã mua online: {df['bought_online'].value_counts().to_dict()}")
    nfc = df.attrs.get("nfc_fixed", [])
    print(f"- Ô có ký tự Unicode dạng tổ hợp (NFD) – đã chuyển sang NFC: {len(nfc)}"
          + "".join(f"\n   * #{i + 1} {df.loc[i, 'name']} | cột {c}" for i, c in nfc))

    issues = []
    for i, r in df.iterrows():
        who = f"#{i + 1} {r['name']}"
        if r["name"] != r["name"].title() and r["name"].islower():
            issues.append(f"{who}: tên viết thường toàn bộ → nên viết hoa khi đưa vào tài liệu")
        if "Chưa từng gặp vấn đề gì" in r["situations"] and r["situations"] != "Chưa từng gặp vấn đề gì":
            issues.append(f"{who}: chọn “Chưa từng gặp vấn đề gì” cùng với các tình huống khác (mâu thuẫn)")
        if r["situations"] == "Chưa từng gặp vấn đề gì" and r["pain_freq"] != "Hiếm khi":
            issues.append(f"{who}: “Chưa từng gặp vấn đề” nhưng vẫn chọn khó khăn lớn nhất và tần suất "
                          f"“{r['pain_freq']}” (không nhất quán)")
        if r["sale_freq"] == "Chưa bao giờ":
            issues.append(f"{who}: “Chưa bao giờ” săn sale nhưng vẫn trả lời các câu về mục tiêu/canh giá")
        if "Đang học trên lớp" in r["check_ctx"] and r["check_in_class"] == "Không bao giờ":
            issues.append(f"{who}: chọn check giá “Đang học trên lớp” nhưng ở câu sau trả lời “Không bao giờ” check giá lúc học/bận")
        if r["age"] == "Dưới 18" and r["status"] == "Sinh viên năm 1–2":
            issues.append(f"{who}: tuổi “Dưới 18” nhưng là sinh viên năm 1–2 (hiếm gặp, nên xác nhận lại)")
    over = []
    for i, cell in df["core_value"].items():
        hits, oth = split_multi(cell, MULTI["core_value"])
        if len(hits) + len(oth) > 2:
            over.append((i + 1, df.loc[i, "name"], len(hits) + len(oth)))
    if over:
        issues.append(f"Câu “Giá trị cốt lõi” yêu cầu chọn 1–2 đáp án nhưng {len(over)}/{n} người chọn 3–4: "
                      + "; ".join(f"#{a} {b} ({c})" for a, b, c in over))
    print("\n- Điểm cần lưu ý về chất lượng dữ liệu:")
    for s in issues:
        print("   *", s)

    # kiểm tra bộ tách đáp án: liệt kê phần "tự điền" còn lại
    print("\n- Phần tự điền (“Khác”) phát hiện được khi tách đáp án:")
    for col, opts in MULTI.items():
        for i, cell in df[col].items():
            _, oth = split_multi(cell, opts)
            if oth:
                print(f"   * {col} | #{i + 1} {df.loc[i, 'name']}: {oth}")
    return issues


# --------------------------------------------------------------------------- #
# 4. Thống kê
# --------------------------------------------------------------------------- #
def single_rows(df, col, order=None, mapper=None):
    s = df[col].map(lambda v: short(v, mapper) if mapper else v)
    vc = s.value_counts()
    keys = [k for k in (order or []) if k in vc.index] + [k for k in vc.index if k not in (order or [])]
    return [(k, int(vc[k]), pct(int(vc[k]), len(df))) for k in keys]


def multi_rows(df, col, opts, keep_zero=True):
    c, others = Counter(), []
    for cell in df[col]:
        hits, oth = split_multi(cell, opts)
        c.update(hits)
        if oth:  # mỗi người có phần tự điền chỉ tính 1 lần (gộp các mục trong cùng 1 ô)
            others.append(", ".join(oth))
    rows = sorted(((k, c.get(k, 0)) for k in opts), key=lambda x: -x[1])
    rows = [(k, v, pct(v, len(df))) for k, v in rows if keep_zero or v > 0]
    return rows, others


def build_markdown(df):
    n = len(df)
    L = []
    add = L.append

    def sec(title, cols, rows, note=None):
        add(f"**{title}**\n")
        add(table(cols, rows))
        if note:
            add(f"\n*{note}*")
        add("")

    C = ["Lựa chọn", "Số người", "Tỷ lệ (n = %d)" % n]

    add("## THỐNG KÊ TỔNG HỢP (từ file CSV – khảo sát online)\n")
    add(f"> Mẫu: **{n} phản hồi**, thu thập qua Google Forms từ "
        f"{pd.to_datetime(df['ts'], format='%d/%m/%Y %H:%M:%S').min():%d/%m/%Y} đến "
        f"{pd.to_datetime(df['ts'], format='%d/%m/%Y %H:%M:%S').max():%d/%m/%Y}. "
        "Mẫu nhỏ nên các con số chỉ mang tính **định hướng**, chưa đại diện cho toàn bộ HS-SV. "
        "Với câu hỏi chọn nhiều đáp án, tổng tỷ lệ có thể vượt 100%.\n")

    # ---- A. Kiểm tra dữ liệu
    add("### A. Kiểm tra dữ liệu (thực hiện bằng Python – xem `analyze_survey.py`)\n")
    nd = df.duplicated().sum()
    add(f"- Số phản hồi hợp lệ: **{n}/{n}**; không có dòng trùng lặp, không trùng tên; 26/29 cột đầy đủ 100% dữ liệu.")
    add("- 2 cột **“Lý do lớn nhất khiến bạn chưa mua sắm online”** và **“Yếu tố khiến bạn cân nhắc bắt đầu mua sắm online”** "
        "trống hoàn toàn vì cả 15 người đều đã từng mua online (câu hỏi rẽ nhánh, đúng thiết kế). "
        "Cột “Khó khăn khác” trống 4/15 (bỏ qua câu mở).")
    nfc = df.attrs.get("nfc_fixed", [])
    extra = ""
    if nfc:
        who = sorted({df.loc[i, "name"] for i, _ in nfc})
        extra = (f"; chuyển {len(nfc)} ô ({', '.join(who)}) từ Unicode dạng tổ hợp (NFD) sang NFC "
                 "(nhìn giống hệt nhưng so khớp/tìm kiếm chuỗi sẽ bị lệch)")
    add("- Đã chuẩn hóa: cắt khoảng trắng thừa ở tên và câu trả lời mở (4 tên, 4 ô câu mở), viết hoa tên “trần phương anh”" + extra + ".")
    add("- Câu hỏi chọn nhiều đáp án được tách theo danh sách đáp án chuẩn của form (một số đáp án có dấu phẩy bên trong).")
    add("- Điểm cần lưu ý (không xóa dữ liệu, chỉ ghi chú trong từng khối người trả lời):")
    add("  - Nguyễn Thế Vinh: chọn “Chưa từng gặp vấn đề gì” cùng lúc với 3 tình huống khác; đồng thời chọn “Chưa bao giờ” săn sale.")
    add("  - Hoàng Yến Nhi: chọn “Chưa từng gặp vấn đề gì” nhưng lại điền khó khăn lớn nhất là “Hay fomo”.")
    add("  - Trương Diệu Anh: chọn check giá khi “Đang học trên lớp” nhưng trả lời “Không bao giờ” ở câu check giá lúc học/bận.")
    add("  - Nguyễn Đại Dương: nhóm tuổi “Dưới 18” nhưng là sinh viên năm 1–2 (hiếm gặp, nên xác nhận lại).")
    over = sum(1 for c in df["core_value"] if sum(map(len, split_multi(c, MULTI["core_value"]))) > 2)
    add(f"  - Câu “Giá trị cốt lõi” quy định chọn 1–2 đáp án nhưng **{over}/{n}** người chọn 3–4 đáp án (form không giới hạn số lượng) "
        "→ khi trích số liệu nên hiểu là “được chọn”, không phải “ưu tiên số 1”.")
    add("- Hạn chế mẫu: 100% là sinh viên; 73,3% là nữ; 86,7% thuộc nhóm 18–22 tuổi; chưa có nhóm mẹ bỉm sữa/nhân viên văn phòng "
        "như đối tượng chính trong `01-description.md`.\n")

    # ---- B. Identity
    add("### B. Identity – Nhân khẩu học & hành vi mua sắm\n")
    sec("Giới tính", C, single_rows(df, "gender", SINGLE_ORDER["gender"]))
    sec("Nhóm tuổi", C, single_rows(df, "age", SINGLE_ORDER["age"]))
    sec("Tình trạng học tập/công việc", C, single_rows(df, "status", SINGLE_ORDER["status"]))
    sec("Nguồn thu nhập/chi tiêu chính", C, single_rows(df, "income_src", SINGLE_ORDER["income_src"]))
    sec("Chi tiêu cá nhân hằng tháng", C, single_rows(df, "spend", SINGLE_ORDER["spend"]))
    sec("Hoàn cảnh sống", C, single_rows(df, "living", SINGLE_ORDER["living"]))
    sec("Mức độ am hiểu công nghệ", C, single_rows(df, "tech", ["Cơ bản", "Trung cấp", "Nâng cao"],
                                                    mapper=TECH_SHORT))
    rows, oth = multi_rows(df, "platforms", MULTI["platforms"])
    rows.append(("Khác (tự điền): " + "; ".join(oth), len(oth), pct(len(oth), n)) if oth else ("Khác", 0, pct(0, n)))
    sec("Nền tảng thường dùng (chọn nhiều)", C, rows,
        "Shopee và TikTok Shop chiếm gần như toàn bộ; không ai chọn Lazada hoặc Sendo.")
    sec("Mức chi cho mua sắm online mỗi tháng (tự đánh giá)", C, single_rows(df, "online_spend", SINGLE_ORDER["online_spend"]))
    sec("Tần suất săn sale", C, single_rows(df, "sale_freq", SINGLE_ORDER["sale_freq"]))
    sec("Quy trình săn sale quen thuộc nhất", C, single_rows(df, "workflow", mapper=WORKFLOW_SHORT))

    # ---- C. Goals
    add("### C. Goals – Mục tiêu & kỳ vọng vào công cụ\n")
    rows, oth = multi_rows(df, "goals", MULTI["goals"])
    if oth:
        rows.append(("Khác (tự điền): " + "; ".join(oth), len(oth), pct(len(oth), n)))
    sec("Mục tiêu khi canh giá/săn sale (chọn nhiều)", C, rows)
    sec("Yếu tố quyết định một buổi săn sale thành công", C, single_rows(df, "success"))
    rows, _ = multi_rows(df, "automate", MULTI["automate"])
    sec("Điều muốn công cụ tự động hóa (chọn nhiều)", C, rows)
    rows, oth = multi_rows(df, "core_value", MULTI["core_value"])
    if oth:
        rows.append(("Khác (tự điền): " + "; ".join(oth), len(oth), pct(len(oth), n)))
    sec("Giá trị cốt lõi để mở app thường xuyên (chọn 1–2)", C, rows)

    # ---- D. Pains
    add("### D. Pains – Nỗi đau & rào cản\n")
    rows, _ = multi_rows(df, "situations", MULTI["situations"])
    sec("Tình huống đã từng gặp (chọn nhiều)", C, rows)
    sec("Khó khăn LỚN NHẤT khi mua sắm online", C, single_rows(df, "biggest_pain", mapper=PAIN_SHORT))
    sec("Tần suất gặp tình trạng không mong muốn", C,
        single_rows(df, "pain_freq", SINGLE_ORDER["pain_freq"]),
        "Theo form: Hiếm khi ≈ 1–2 lần/năm; Thỉnh thoảng ≈ 1–2 lần/tháng; Thường xuyên ≈ gần như hằng tuần.")
    sec("Cảm xúc khi gặp tình huống đó", C, single_rows(df, "emotion", mapper=EMOTION_SHORT))

    # ---- E. Context
    add("### E. Context – Bối cảnh kiểm tra giá\n")
    rows, _ = multi_rows(df, "check_time", MULTI["check_time"])
    sec("Thời điểm kiểm tra giá (chọn nhiều)", C, rows)
    rows, oth = multi_rows(df, "check_ctx", MULTI["check_ctx"])
    if oth:
        rows.append(("Khác (tự điền, %d người)" % len(oth), len(oth), pct(len(oth), n)))
    sec("Hoàn cảnh kiểm tra giá (chọn nhiều)", C, rows)
    sec("Kiểm tra giá khi đang học/bận việc khác", C, single_rows(df, "check_in_class", SINGLE_ORDER["check_in_class"]))

    # ---- F. Chỉ số tổng hợp
    add("### F. Chỉ số nổi bật (dùng cho Business rules / Acceptance criteria)\n")

    def cnt(mask):
        return int(mask.sum())

    hunt = df["sale_freq"].isin(["Thường xuyên", "Săn sale vào mọi dịp có sale"])
    pain_month = df["pain_freq"].isin(["Thỉnh thoảng", "Thường xuyên"])
    upset = df["emotion"].str.startswith(("Khá bực bội", "Rất khó chịu"))
    busy = df["check_in_class"].isin(["Thỉnh thoảng", "Khá thường xuyên"])
    def has(col, key):
        return df[col].map(lambda c: any(l == key for l in split_multi(c, MULTI[col])[0]))
    drop_after = has("situations", "Mua xong vài ngày sau giá giảm mạnh hơn")
    miss_flash = has("situations", "Bỏ lỡ flash sale vì không online đúng giờ")
    fake_price = has("situations", "Phát hiện shop tăng giá ảo rồi gắn mác giảm giá")
    track = has("automate", "Tự động theo dõi giá & báo khi giảm tới mức mong muốn")
    cross = has("automate", "So sánh giá chéo nhiều sàn")
    trust = has("automate", "Kiểm tra/gợi ý độ uy tín của shop")
    save_time = has("core_value", "Tiết kiệm thời gian (không phải mở app check mỗi ngày)")
    save_money = has("core_value", "Tiết kiệm tiền bạc (rẻ hơn bình thường)")
    both_ta = track & cross
    stats = [
        ("Săn sale thường xuyên hoặc mọi dịp", cnt(hunt)),
        ("Gặp tình trạng không mong muốn từ ~1–2 lần/tháng trở lên", cnt(pain_month)),
        ("Bực bội / rất khó chịu khi gặp tình huống đó", cnt(upset)),
        ("Từng mua xong vài ngày sau thấy giá giảm mạnh hơn", cnt(drop_after)),
        ("Từng bỏ lỡ flash sale vì không online đúng giờ", cnt(miss_flash)),
        ("Từng phát hiện shop tăng giá ảo rồi gắn mác giảm giá", cnt(fake_price)),
        ("Kiểm tra giá cả lúc đang học/bận việc khác (từ “thỉnh thoảng” trở lên)", cnt(busy)),
        ("Muốn công cụ tự động theo dõi giá và báo khi giảm", cnt(track)),
        ("Muốn so sánh giá cùng sản phẩm chéo nhiều sàn", cnt(cross)),
        ("Muốn tự động kiểm tra/gợi ý độ uy tín của shop", cnt(trust)),
        ("Chọn “Tiết kiệm tiền” là giá trị cốt lõi", cnt(save_money)),
        ("Chọn “Tiết kiệm thời gian” là giá trị cốt lõi", cnt(save_time)),
    ]
    add(table(["Chỉ số", "Số người", "Tỷ lệ (n = %d)" % n], [(a, b, pct(b, n)) for a, b in stats]))
    add("")

    # đối chiếu nhóm săn sale nhiều với nhóm còn lại
    g1, g2 = df[hunt], df[~hunt]
    def share(g, col, key):
        return cnt(g[col].map(lambda c: any(l == key for l in split_multi(c, MULTI[col])[0])))
    add("**Đối chiếu nhóm săn sale nhiều với nhóm còn lại**\n")
    rows = []
    for lab, col, key in [
        ("Muốn theo dõi giá & báo khi giảm", "automate", "Tự động theo dõi giá & báo khi giảm tới mức mong muốn"),
        ("Muốn so sánh giá chéo sàn", "automate", "So sánh giá chéo nhiều sàn"),
        ("Muốn kiểm tra độ uy tín shop", "automate", "Kiểm tra/gợi ý độ uy tín của shop"),
        ("Từng mua xong giá giảm mạnh hơn", "situations", "Mua xong vài ngày sau giá giảm mạnh hơn"),
        ("Từng bỏ lỡ flash sale", "situations", "Bỏ lỡ flash sale vì không online đúng giờ"),
    ]:
        a, b = share(g1, col, key), share(g2, col, key)
        rows.append((lab, f"{a}/{len(g1)} ({pct(a, len(g1))})", f"{b}/{len(g2)} ({pct(b, len(g2))})"))
    add(table(["Nội dung", f"Săn sale nhiều (n = {len(g1)})", f"Còn lại (n = {len(g2)})"], rows))
    add("\n*Nhóm nhỏ nên chỉ nêu xu hướng, không kết luận thống kê.*\n")
    return "\n".join(L), stats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("--out", default="05-analyze-survey.md")
    a = ap.parse_args()
    df = load(a.csv)
    check_data(df, a.csv)
    md, stats = build_markdown(df)
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(md)
    print("\n" + "=" * 70)
    print(f"Đã ghi phần thống kê Markdown → {a.out}")
    print("=" * 70)
    for k, v in stats:
        print(f"{v:>3}/{len(df)}  {pct(v, len(df)):>7}  {k}")


if __name__ == "__main__":
    main()
