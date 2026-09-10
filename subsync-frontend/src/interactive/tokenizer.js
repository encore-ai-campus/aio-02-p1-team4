// 영문 문장을 특수문자를 보존하면서 단어(span) 단위로 토큰화
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  SubSync.tokenizer = {
    // 텍스트를 파싱하여 단어 span 엘리먼트들이 포함된 DocumentFragment 반환
    tokenizeToFragment(text, onWordHover, onWordClick) {
      const frag = document.createDocumentFragment();
      // 단어와 비단어(공백/특수문자)를 정규식으로 분리
      const tokens = text.split(/([a-zA-Z0-9'-]+)/);

      tokens.forEach((token) => {
        if (!token) return;
        if (/^[a-zA-Z0-9'-]+$/.test(token)) {
          const span = document.createElement("span");
          span.className = "subsync-word";
          span.textContent = token;
          span.dataset.word = token.toLowerCase();

          // CSS :hover만으로는 외부 페이지 스타일과의 cascade 충돌 시
          // 시각 상태가 사라질 수 있으므로, 포인터 상태를 명시적 클래스로 유지한다.
          span.addEventListener("mouseenter", (e) => {
            span.classList.add("subsync-word-hovered");
            if (onWordHover) onWordHover(token, span, e);
          });
          span.addEventListener("mouseleave", () => {
            span.classList.remove("subsync-word-hovered");
            if (onWordHover) onWordHover(null, span);
          });
          if (onWordClick) {
            span.addEventListener("click", (e) => {
              e.stopPropagation();
              onWordClick(token, text, span, e);
            });
          }
          frag.appendChild(span);
        } else {
          frag.appendChild(document.createTextNode(token));
        }
      });

      return frag;
    }
  };
})();
