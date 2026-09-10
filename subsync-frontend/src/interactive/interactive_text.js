// 자막, 스크립트, 튜터 메시지 등 어디에나 마우스 인터랙션을 장착하는 공통 래퍼
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  SubSync.interactiveText = {
    // containerEl 안의 텍스트 노드를 토큰화하여 Hover/Click 인터랙티브 엘리먼트로 변환
    attach(containerEl, englishText, fullSentence) {
      containerEl.innerHTML = "";
      const sentence = fullSentence || englishText;

      const fragment = SubSync.tokenizer.tokenizeToFragment(
        englishText,
        (word, span) => {
          if (word) {
            SubSync.hoverTooltip.show(word, span, sentence);
          } else if (SubSync.hoverTooltip.leaveTarget) {
            SubSync.hoverTooltip.leaveTarget();
          } else {
            SubSync.hoverTooltip.hide();
          }
        },
        (word, sent, span) => {
          SubSync.hoverTooltip.hide();
          SubSync.clickPopup.show(word, sent, span);
        }
      );

      containerEl.appendChild(fragment);
    }
  };
})();
