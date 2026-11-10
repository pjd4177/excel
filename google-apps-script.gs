/**
 * Just Do it Statistics · 문제(OMR) 결과를 구글 스프레드시트에 저장하는 Apps Script
 *
 * 저장 위치: 아래 SPREADSHEET_ID 의 스프레드시트
 *   1장 → 시트1, 2장 → 시트2 … 13장 → 시트13 (n번째 시트)
 *   처음 저장할 때 그 시트 이름을 '1장', '2장' … 으로 바꿉니다. 시트가 모자라면 새로 만듭니다.
 *
 * 한 줄에 들어가는 내용
 *   제출시각 · 학번 · 이름 · 점수(예: 6점 만점에 6점) · 맞힌 문항 · 안 푼 문항 · 풀이 시간 · 틀린 문항
 *   · 문항마다 '응답 ② / 정답 ③ / X' (문항 번호가 열 제목)
 *
 * 설치 방법 (한 번만)
 *  1. 스프레드시트를 열고 메뉴 [확장 프로그램] → [Apps Script]
 *  2. 기본 코드를 모두 지우고 이 파일 내용을 붙여넣은 뒤 저장(디스크 아이콘)
 *  3. [배포] → [새 배포] → 톱니바퀴에서 [웹 앱]
 *       - 다음 사용자 인증 정보로 실행: 나
 *       - 액세스 권한이 있는 사용자: 모든 사용자
 *     → [배포] → 권한 검토 → 계정 선택 → (경고 화면이면 [고급] → [이동]) → [허용]
 *  4. 나온 웹 앱 URL(https://script.google.com/macros/s/…/exec)을 exam.html 의 SHEET_URL 에 넣습니다.
 *  코드를 고친 뒤에는 [배포] → [배포 관리] → 연필 → 버전 [새 버전] → [배포] 해야 반영됩니다.
 */
var SPREADSHEET_ID = '1LNG6nLq5KY6Qn_fzS_IxO19pj6gdX5df0xZS3kMMeKA';
var CIRCLED = ['①', '②', '③', '④', '⑤'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var d = JSON.parse(e.postData.contents);
    var ch = parseInt(d.chapter, 10);
    if (!(ch >= 1 && ch <= 13)) throw new Error('장 번호가 올바르지 않습니다');
    var items = (d.items || []).slice(0, 60);
    var cut = function (v, n) { return String(v == null ? '' : v).slice(0, n); };
    var mark = function (n) { return n >= 1 && n <= 5 ? CIRCLED[n - 1] : '-'; };

    var sh = sheetFor(ch);
    var head = ['제출시각', '학번', '이름', '점수', '맞힌 문항', '안 푼 문항', '풀이 시간', '틀린 문항']
      .concat(items.map(function (it) { return cut(it.id, 10); }));
    if (sh.getLastRow() === 0) {
      sh.appendRow(head);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#ECEBFA');
    }
    var sec = Number(d.seconds) || 0;
    var row = [
      new Date(),
      "'" + cut(d.studentId, 20),               // 학번 앞자리 0이 지워지지 않도록 글자로 저장
      cut(d.name, 20),
      cut(d.scoreText, 30) || ((Number(d.total) || 0) + '점 만점에 ' + (Number(d.correct) || 0) + '점'),
      Number(d.correct) || 0,
      Number(d.unanswered) || 0,
      Math.floor(sec / 60) + '분 ' + (sec % 60) + '초',
      cut(d.wrong, 500) || '없음'
    ].concat(items.map(function (it) {
      return '응답 ' + mark(it.answer) + ' / 정답 ' + mark(it.key) + ' / ' + (it.ok ? 'O' : 'X');
    }));
    sh.appendRow(row);
    return out({ ok: true, sheet: sh.getName() });
  } catch (err) {
    return out({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// n장 → 'n장' 시트. 없으면 n번째 시트를 'n장'으로 이름 바꿔 쓰고, 그래도 없으면 새로 만든다.
function sheetFor(ch) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var name = ch + '장';
  var sh = ss.getSheetByName(name);
  if (sh) return sh;
  var sheets = ss.getSheets();
  var nth = sheets[ch - 1];
  if (nth && !/^\d+장$/.test(nth.getName())) { nth.setName(name); return nth; }
  sh = ss.insertSheet(name, Math.min(ch - 1, ss.getSheets().length));
  return sh;
}

function doGet() { return out({ ok: true, message: 'Just Do it Statistics 문제 결과 저장용 웹 앱입니다.' }); }

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
