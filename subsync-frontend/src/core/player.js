// YouTube 플레이어 제어 유틸 (재생/일시정지/탐색)
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  SubSync.player = {
    getVideo() {
      return document.querySelector("video");
    },
    getCurrentTime() {
      const v = this.getVideo();
      return v ? v.currentTime : 0;
    },
    seekTo(seconds) {
      const v = this.getVideo();
      if (v) {
        v.currentTime = Math.max(0, seconds);
        v.play();
      }
    },
    pause() {
      const v = this.getVideo();
      if (v) v.pause();
    },
    play() {
      const v = this.getVideo();
      if (v) v.play();
    }
  };
})();
