/**
 * Just Do it Statistics · 문제(OMR) 결과를 구글 스프레드시트에 저장하는 Apps Script
 *
 * 설치 방법
 *  1. 구글 스프레드시트를 새로 만듭니다.
 *  2. 메뉴 [확장 프로그램] → [Apps Script]를 엽니다.
 *  3. 기본 코드를 모두 지우고 이 파일 내용을 붙여넣은 뒤 저장합니다.
 *  4. [배포] → [새 배포] → 유형 [웹 앱]
 *       - 다음 사용자 인증 정보로 실행: 나
 *       - 액세스 권한이 있는 사용자: 모든 사용자
 *     → [배포] (처음 한 번 권한 허용)
 *  5. 나온 웹 앱 URL(https://script.google.com/macros/s/…/exec)을 exam.html 의 SHEET_URL 에 넣습니다.
 *
 * 저장 위치: '전체' 시트와 장별 시트('1장' … '13장')에 한 줄씩 추가됩니다.
 */
var HEAD = ['제출시각', '장', '장 제목', '학번', '이름', '점수(100점)', '맞힌 문항', '전체 문항', '안 푼 문항', '풀이 시간(초)', '틀린 문항', '응답'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var d = JSON.parse(e.postData.contents);
    var ch = parseInt(d.chapter, 10);
    if (!(ch >= 1 && ch <= 13)) throw new Error('장 번호가 올바르지 않습니다');
    var cut = function (v, n) { return String(v == null ? '' : v).slice(0, n); };
    var row = [
      new Date(), ch, cut(d.chapterTitle, 80),
      "'" + cut(d.studentId, 20),            // 학번 앞자리 0이 지워지지 않도록 글자로 저장
      cut(d.name, 20),
      Number(d.score) || 0, Number(d.correct) || 0, Number(d.total) || 0, Number(d.unanswered) || 0, Number(d.seconds) || 0,
      cut(d.wrong, 1000), cut(d.answers, 2000)
    ];
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ['전체', ch + '장'].forEach(function (name) {
      var sh = ss.getSheetByName(name) || ss.insertSheet(name);
      if (sh.getLastRow() === 0) { sh.appendRow(HEAD); sh.setFrozenRows(1); sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold'); }
      sh.appendRow(row);
    });
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function doGet() { return out({ ok: true, message: 'Just Do it Statistics 문제 결과 저장용 웹 앱입니다.' }); }

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
