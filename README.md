# Pixel LMS

Hệ thống quản lý học tập (LMS) với 4 loại tài khoản (Admin / Giáo viên / Học sinh) và
**6 module tách biệt hoàn toàn về database**: Tài khoản, Khóa học, Bài làm, Đề thi, Thi, Bài viết.

Stack: Next.js 14 (Pages Router) · Tailwind CSS · Vercel · 6× Neon Postgres.

---

## 1. Vì sao 6 database?

Mỗi module dùng **một Neon Postgres project riêng biệt**, hoàn toàn độc lập với nhau. Điều này có nghĩa là:

- **Không có foreign key thật giữa các module.** Ví dụ: bảng `course_access` (DB Khóa học) lưu `user_id`,
  nhưng `user_id` đó thực sự "sống" ở DB Tài khoản. App sẽ tự query 2 lần và ghép dữ liệu ở tầng code,
  không dựa vào `JOIN` SQL giữa các DB.
- **Xóa tài khoản không tự động dọn dẹp dữ liệu liên quan** ở các DB khác (ví dụ: giáo viên bị xóa thì các
  khóa học họ tạo chương/bài vẫn còn `created_by` trỏ tới một ID không còn tồn tại). Đây là đánh đổi đã biết
  của kiến trúc multi-database, không phải lỗi.
- Mỗi DB có thể **scale, backup, và down độc lập** với nhau — nếu DB Bài làm bị quá tải trong mùa thi,
  không ảnh hưởng tới DB Tài khoản hay Bài viết.

---

## 2. Tạo 6 database Neon

Truy cập [neon.tech](https://neon.tech) → tạo lần lượt **6 project Postgres riêng biệt** (gợi ý đặt tên
để dễ phân biệt, nhưng tên project không bắt buộc phải khớp với tên biến môi trường):

1. `pixel-lms-accounts` — Tài khoản
2. `pixel-lms-courses` — Khóa học
3. `pixel-lms-submissions` — Bài làm
4. `pixel-lms-questionbank` — Đề thi
5. `pixel-lms-exams` — Thi (ca thi)
6. `pixel-lms-posts` — Bài viết

Với mỗi project, vào **Dashboard → Connection Details**, copy chuỗi kết nối dạng:

```
postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
```

> Lưu ý: dùng connection string **pooled** (thường ghi là "Pooled connection") nếu Neon có cung cấp,
> để tránh hết connection khi chạy trên Vercel serverless.

---

## 3. Deploy lên Vercel

1. Push project này lên một repo GitHub mới.
2. Vào [vercel.com](https://vercel.com) → **New Project** → import repo vừa tạo.
3. Trước khi bấm Deploy (hoặc sau đó, vào **Project → Settings → Environment Variables**), thêm các
   biến môi trường sau (áp dụng cho cả Production/Preview/Development):

| Biến môi trường            | Giá trị                                    |
|-----------------------------|---------------------------------------------|
| `DATABASE_URL_ACCOUNTS`     | connection string của DB Tài khoản          |
| `DATABASE_URL_COURSES`      | connection string của DB Khóa học           |
| `DATABASE_URL_SUBMISSIONS`  | connection string của DB Bài làm            |
| `DATABASE_URL_QUESTIONBANK` | connection string của DB Đề thi             |
| `DATABASE_URL_EXAMS`        | connection string của DB Thi                |
| `DATABASE_URL_POSTS`        | connection string của DB Bài viết           |
| `AUTH_SECRET`               | một chuỗi ngẫu nhiên dài, bí mật (xem bên dưới) |
| `CRON_SECRET`               | (tùy chọn) một chuỗi ngẫu nhiên để bảo vệ cron endpoint |

Tạo `AUTH_SECRET` ngẫu nhiên, ví dụ chạy lệnh sau ở máy bạn (hoặc dùng bất kỳ trình tạo chuỗi ngẫu nhiên nào):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Bấm **Deploy**.

---

## 4. Khởi tạo database (chạy 1 lần — và mỗi khi có bảng mới)

> Nếu bạn đã deploy trước đó và tải bản cập nhật này về, hãy **gọi lại `/api/setup` một lần nữa**
> trước khi dùng tính năng "Gán đề thi luyện tập vào bài học" — bản cập nhật này thêm bảng mới
> `lesson_practice_links` vào DB Khóa học, đồng thời nới lỏng ràng buộc `session_id` và thêm cột
> `kind` vào bảng `attempts` (DB Bài làm) để lưu kết quả luyện tập như một bài làm, và thêm cột
> `show_answers` vào bảng `papers` (DB Đề thi) cho tính năng bật/tắt xem đáp án, và cột
> `time_limit_minutes` vào bảng `lesson_practice_links` để đặt giờ luyện tập riêng cho từng đề. Việc
> gọi lại hoàn toàn an toàn, không xóa dữ liệu cũ.

Sau khi deploy xong, mở trình duyệt và truy cập:

```
https://<tên-project-của-bạn>.vercel.app/api/setup
```

Endpoint này sẽ tạo toàn bộ bảng cần thiết ở cả 6 database (an toàn để gọi lại nhiều lần — dùng
`IF NOT EXISTS`), và tự tạo sẵn 1 tài khoản admin mặc định nếu bảng `accounts` đang trống:

- **Tên đăng nhập:** `admin`
- **Mật khẩu:** `admin123`

⚠️ **Đổi mật khẩu tài khoản admin này ngay sau lần đăng nhập đầu tiên** — vào mục Tài khoản → Đổi mật khẩu
(`/admin/accounts`), hoặc đơn giản hơn: bấm dòng "Welcome, admin" ở sidebar → trang `/account`.

Nếu response trả về `"ok": false`, đọc phần `results` trong JSON để biết chính xác DB nào bị lỗi kết nối
(thường là do gõ sai/thiếu biến môi trường `DATABASE_URL_*`).

---

## 5. Cơ chế xóa tài khoản Admin có độ trễ 5 ngày

Khi một admin yêu cầu xóa một admin khác:

- Hệ thống đánh dấu `delete_requested_at = now()`.
- Nếu admin bị yêu cầu xóa **đăng nhập lại** trong vòng 5 ngày, yêu cầu xóa **tự động bị hủy**.
- Nếu không đăng nhập trong 5 ngày, tài khoản sẽ bị xóa vĩnh viễn bởi một **Vercel Cron Job** chạy mỗi
  ngày (đã cấu hình sẵn trong `vercel.json`, gọi `/api/cron/process-admin-deletions`).

Vercel Cron Jobs cần dự án nằm trên gói **Pro** để chạy đúng lịch tùy ý; ở gói Hobby (miễn phí), Vercel
giới hạn cron chỉ chạy tối đa 1 lần/ngày — cấu hình mặc định trong `vercel.json` (`0 18 * * *`, tức 18:00
UTC ~ 01:00 sáng giờ Việt Nam) đã phù hợp với giới hạn này. Nếu bạn nâng cấp lên Pro, có thể chỉnh lại
lịch chạy dày hơn trong `vercel.json`.

Nếu đặt `CRON_SECRET`, endpoint cron sẽ yêu cầu header `Authorization: Bearer <CRON_SECRET>` — Vercel tự
động đính kèm header này khi gọi cron đã khai báo trong `vercel.json`, bạn không cần làm gì thêm.

---

## 6. Tài khoản & quyền hạn

| Vai trò    | Tài khoản | Khóa học | Bài làm | Đề thi | Thi | Bài viết |
|------------|-----------|----------|---------|--------|-----|----------|
| **Admin**  | Toàn quyền (tạo/xóa/đổi mật khẩu mọi loại tài khoản; xóa admin khác có độ trễ 5 ngày) | Tạo khóa học, cấp quyền truy cập, xem/soạn như giáo viên | Hủy, chỉnh thời gian, kết thúc, xem tất cả, chấm điểm | Xem/soạn | Tạo & quản lý ca thi | Đăng/sửa/xóa |
| **Giáo viên** | Tạo/xóa/đổi mật khẩu tài khoản học sinh | Soạn chương/bài trong khóa học được cấp quyền | Hủy, chỉnh thời gian, kết thúc, xem, chấm điểm | Xem/soạn | Tạo & quản lý ca thi | Đăng/sửa/xóa |
| **Học sinh** | — | Xem khóa học được cấp quyền | Chỉ xem bài làm của chính mình | Không thấy mục này | Chỉ nhập mã ca thi để vào thi | Chỉ xem trên trang chủ |

---

## 7. Markdown & LaTeX (áp dụng xuyên suốt hệ thống)

Mọi nội dung do người dùng soạn — **bài học, câu hỏi/lựa chọn trong đề thi, bài viết** — đều được soạn
bằng Markdown thuần (lưu trong DB dưới dạng text) và **render bằng Markdown + KaTeX** (tương đương
MathJax) ở mọi nơi hiển thị: trang chủ, trang bài viết, xem khóa học, soạn/xem đề thi, màn hình làm bài,
màn hình chấm bài.

Cú pháp được hỗ trợ:
- **Chèn ảnh:** `![mô tả ảnh](https://link-anh.jpg)`
- **Công thức toán inline:** `$x^2 + y^2 = z^2$`
- **Công thức toán block:** `$$\frac{-b \pm \sqrt{b^2-4ac}}{2a}$$`
- Markdown tiêu chuẩn khác: **in đậm**, *in nghiêng*, tiêu đề `#`, danh sách, bảng, link, blockquote...

Không có ô "thêm link ảnh" riêng ở phần tạo câu hỏi — chèn ảnh trực tiếp trong nội dung bằng cú pháp
Markdown ở trên là đủ.

**Xem trước trực tiếp (live preview):** cả 3 nơi soạn nội dung — bài học (`/lessons/[id]`), câu hỏi
trong đề thi (`/teacher/questionbank/[id]`), bài viết (`/teacher/posts`) — đều hiện khung xem trước
ngay bên phải ô nhập (xếp chồng lên nhau trên màn hình nhỏ), cập nhật theo từng ký tự gõ vào, không cần
bấm nút riêng. Riêng phần **câu hỏi**, khung xem trước hiển thị **y hệt giao diện câu hỏi sau khi lưu**
(cùng component `QuestionCard`) — đủ cả khoanh tròn lựa chọn A/B/C/D, tô màu đáp án đúng, khung đáp án
điền khuyết... để biết chắc trông sẽ như thế nào trước khi lưu, không chỉ là đoạn Markdown thô.

---

## 8. Cấu trúc thư mục

```
lib/db.js         6 pool kết nối Postgres riêng biệt (accounts/courses/submissions/questionbank/exams/posts)
lib/auth.js        Session HMAC-signed dạng cookie, không cần bảng session riêng
pages/api/         Toàn bộ API routes theo từng module
pages/admin/       Giao diện Admin (tài khoản, khóa học)
pages/teacher/     Giao diện Giáo viên (khóa học, đề thi, thi, bài làm, bài viết) — Admin cũng dùng chung các trang này
pages/student/     Giao diện Học sinh (khóa học, vào thi, bài làm của tôi)
pages/exam/take/   Màn hình làm bài thi có tính giờ (ca thi từ mục "Thi", đếm giờ, autosave, tự nộp khi hết giờ)
pages/exam/waiting/[code].js  Phòng chờ ca thi: học sinh đứng yên ở đây, tự động vào thi ngay khi
                        giáo viên mở ca thi (poll trạng thái mỗi 3 giây)
pages/practice/[paperId].js  Luyện tập không giới hạn số lần: chấm điểm ngay, không tính giờ, không
                        cần ca thi/mã — dùng cho đề thi được gán dưới bài học. Mỗi lần nộp vẫn được
                        lưu lại thành một dòng trong mục Bài làm (đánh dấu "Luyện tập") để giáo viên/
                        admin xem và chấm tay các câu tự luận/nối câu nếu cần.
pages/lessons/[id].js  Trang riêng cho từng bài học (đọc tập trung, giáo viên/admin sửa nội dung
                        và gán đề thi luyện tập ngay bên dưới bài học; học sinh bấm "Làm bài" để
                        luyện tập ngay, làm lại bao nhiêu lần cũng được)
```

---

## 9. In ấn

Các nơi có nút in đều mở một **cửa sổ/tab mới** chứa bản in đã định dạng gọn cho khổ giấy, rồi tự động
gọi hộp thoại in của trình duyệt (`window.print()`). Nếu trình duyệt chặn popup, cho phép popup cho
trang này rồi bấm lại nút in. Công thức LaTeX trong nội dung vẫn được render đúng khi in.

- **In đề** (trang Đề thi): in toàn bộ đề dưới dạng phiếu làm bài — liệt kê hết các lựa chọn, **không**
  lộ đáp án đúng, có chỗ trống để học sinh trả lời câu điền khuyết/tự luận.
- **In đáp án** (trang Đề thi): in bảng đáp án gọn để giáo viên đối chiếu chấm nhanh, không in lại toàn
  bộ đề.
- **In các ca thi đã chọn** (trang Thi): tick chọn ca thi cần in → in danh sách mã ca thi kèm tên, thời
  gian làm bài, trạng thái — chỉ in những ca thi đã được chọn, không in toàn bộ danh sách.
- **In tài khoản đã chọn** (trang Tài khoản): vì mật khẩu được lưu dạng plaintext trong DB nhưng **không**
  được API trả về khi tải danh sách (để tránh lộ hàng loạt), nút in chỉ khả dụng với những tài khoản
  **vừa được tạo hoặc vừa đổi mật khẩu trong phiên làm việc hiện tại** (đánh dấu nhãn "Mới"). Tick chọn
  tài khoản cần in rồi bấm in — tải lại trang sẽ mất danh sách này, đúng theo mục đích "in ngay sau khi
  tạo/đổi mật khẩu" chứ không phải in lại mật khẩu cũ bất kỳ lúc nào.

---

## 10. Giao diện điều hướng & hồ sơ cá nhân

> Bản cập nhật này thêm cột `email` và `phone` vào bảng `accounts` — nếu bạn đã deploy trước đó, **gọi
> lại `/api/setup` một lần nữa** (an toàn, không mất dữ liệu).

- **Dòng "Welcome, {tên đăng nhập}"** nằm ngay trên nút Đăng xuất (sidebar trên desktop, trong menu ☰
  trên mobile). Di chuột vào đó hiện tooltip với họ tên, tên đăng nhập, email, số điện thoại. Bấm vào để
  mở trang **`/account`** — nơi tự sửa họ tên, email, số điện thoại, và đổi mật khẩu (yêu cầu nhập đúng
  mật khẩu hiện tại). Không thể tự đổi tên đăng nhập ở đây.
- **Điều hướng trên điện thoại** chuyển thành thanh ngang phía trên (logo + nút Menu ☰) thay vì sidebar
  bên cạnh, bấm Menu để xổ ra danh sách trang + dòng Welcome + nút đăng xuất.
- **Đã bỏ nút "Quay lại trang chủ"** khỏi khu vực điều hướng sau đăng nhập. Thay vào đó, trang **Tổng
  quan** (`/admin`, `/teacher`, `/student` — trang đầu tiên sau khi đăng nhập) hiển thị: 4 bài viết mới
  nhất, 3 khóa học tham gia gần đây nhất (đúng theo quyền của từng vai trò — admin thấy khóa học mới tạo
  gần đây, giáo viên/học sinh thấy khóa học được cấp quyền gần đây), và 3 bài làm gần đây nhất mà người
  đó có quyền xem (admin/giáo viên thấy toàn hệ thống, học sinh chỉ thấy bài của mình).
- Trang admin trước đây nằm ở `/admin` (quản lý tài khoản) nay đã chuyển sang **`/admin/accounts`**;
  `/admin` giờ là trang Tổng quan, đồng bộ với `/teacher` và `/student`.

---

## 11. Bật/tắt xem đáp án

Mỗi **đề thi** (trang Đề thi → chọn đề) có công tắc **"Học sinh được xem đáp án sau khi nộp bài"**
(mặc định bật). Áp dụng đồng thời cho cả hai nơi dùng đề đó:

- **Luyện tập** (`/practice/[paperId]`, gán dưới bài học): tắt công tắc → sau khi nộp học sinh vẫn
  thấy điểm số, nhưng không còn thấy câu nào đúng/sai hay đáp án đúng của từng câu.
- **Ca thi chính thức** (`/exam/take`, qua mục "Thi"): trong lúc đang làm bài học sinh **không bao giờ**
  thấy đáp án dù công tắc bật hay tắt. Đáp án chỉ có thể hiện ra **sau khi đã nộp bài xong**, và chỉ khi
  công tắc đang bật.
- Giáo viên/admin luôn thấy đầy đủ đáp án ở trang chấm bài (`/teacher/submissions/[id]`) bất kể công
  tắc này, vì đó là màn hình chấm điểm chứ không phải màn hình học sinh xem lại bài.

---

## 12. Chấm lại khi sửa đáp án

Nếu giáo viên sửa đáp án đúng của một câu hỏi sau khi học sinh đã nộp bài, điểm cũ sẽ không tự cập
nhật — cần bấm nút **"🔄 Chấm lại"**:

- **Ở trang chi tiết một bài làm** (`/teacher/submissions/[id]`): nút "Chấm lại bài này" chỉ tính lại
  điểm của **bài làm đang xem**.
- **Ở trang chi tiết một đề thi** (`/teacher/questionbank/[id]`): nút "Chấm lại tất cả bài làm" tính lại
  điểm của **mọi bài làm đã nộp** (cả ca thi lẫn luyện tập) từng dùng đề thi đó.

Cả hai đều **giữ nguyên điểm chấm tay đã lưu** (ví dụ điểm tự luận, hoặc điểm bạn từng ghi đè thủ công
cho một câu trắc nghiệm) — chỉ tính lại phần các câu chưa được chấm tay, dựa trên đáp án đúng **hiện tại**
trong đề thi. Bài làm đang ở trạng thái "Đang làm" (chưa nộp) sẽ được bỏ qua.

---

## 13. Giới hạn thời gian luyện tập

Ở khối "📝 Thực hành" cuối mỗi bài học, mỗi đề gán vào đó có thể bật **"Giới hạn thời gian"** riêng
(tính bằng phút) thay vì để học sinh làm tự do:

- **Không tick "Giới hạn thời gian"** (mặc định): học sinh làm tự do như trước, không đếm giờ.
- **Tick + nhập số phút**: khi học sinh bấm "Làm bài", trang luyện tập hiện đồng hồ đếm ngược. Hết giờ
  tự động nộp bài. Sau khi nộp (dù tự động hay bấm tay), phải bấm **"↻ Làm lại"** mới làm tiếp được —
  lúc đó đồng hồ được cấp lại đầy đủ số phút.
- Giới hạn này gắn với **từng cặp bài học – đề thi**, không phải gắn cứng vào đề thi — cùng một đề có
  thể gán vào bài học khác với thời gian khác nhau (hoặc không giới hạn).

---

## 14. Điền khuyết — nhiều đáp án đúng

Khi tạo/sửa câu hỏi dạng **Điền khuyết**, có thể bấm **"+ Thêm đáp án đúng khác"** để nhập nhiều đáp án
được chấp nhận cho cùng một câu (ví dụ: "Hà Nội", "Ha Noi", "HN" đều được tính đúng). Học sinh chỉ cần
trả lời trùng với **một trong số đó** (không phân biệt hoa/thường, khoảng trắng đầu/cuối) là được tính
điểm. Mọi nơi hiển thị đáp án đúng (xem trước lúc soạn, làm bài, luyện tập, chấm bài, in đề/đáp án) đều
liệt kê đầy đủ các đáp án được chấp nhận, nối bằng "hoặc". Câu điền khuyết tạo từ bản cũ (chỉ có 1 đáp
án) vẫn hoạt động bình thường, không cần chỉnh sửa lại.

---

## 15. Câu hỏi dạng Sắp xếp

Loại câu hỏi mới **"Sắp xếp"** (`ordering`): giáo viên nhập các mục theo **đúng thứ tự từ trên xuống**
khi soạn câu hỏi (dùng nút ▲▼ để sửa thứ tự lúc soạn nếu gõ nhầm). Khi học sinh làm bài/luyện tập, hệ
thống **xáo trộn thứ tự hiển thị** — học sinh kéo-thả (hoặc bấm ▲▼ trên mobile) để sắp xếp lại đúng như
thứ tự giáo viên đã nhập. Chấm đúng/sai toàn bộ (không có điểm từng phần): đúng tuyệt đối thứ tự mới
được tính điểm.

Vài lưu ý kỹ thuật:
- Thứ tự xáo trộn hiển thị cho học sinh là **cố định theo từng bài làm** (deterministic theo `attemptId`
  + `questionId`), nên tải lại trang giữa lúc làm bài không làm các mục nhảy lộn xộn khác đi.
- Trong lúc học sinh đang làm bài, **thứ tự đúng không bao giờ được gửi về trình duyệt** — chỉ gửi bản
  đã xáo trộn — nên không thể xem mã nguồn/DevTools để dò đáp án.
- Sau khi nộp bài, nếu đề đang bật "xem đáp án", màn hình xem lại sẽ tô xanh/đỏ từng vị trí đúng/sai so
  với thứ tự gốc.
- Khi in đề, các mục cũng được in theo thứ tự xáo trộn (in ổn định theo `paperId`+`questionId`) kèm ô
  trống để học sinh ghi số thứ tự đúng; in đáp án thì liệt kê đúng theo thứ tự gốc giáo viên đã nhập.

---

## 16. Phát triển local (tùy chọn)

```bash
npm install
# tạo file .env.local với đủ 8 biến môi trường ở mục 3
npm run dev
```

Rồi mở `http://localhost:3000/api/setup` để khởi tạo database y như bước 4.
