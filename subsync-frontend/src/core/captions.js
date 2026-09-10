// 자막 파싱 및 시간 병합 엔진 (core)
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  SubSync.getVideoId = function getVideoId() {
    try {
      const url = new URL(location.href);
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const shorts = url.pathname.match(/^\/shorts\/([\w-]+)/);
      if (shorts) return shorts[1];
    } catch (_) {}
    return null;
  };

  SubSync.resolveNativeLang = function resolveNativeLang(nativeLangs, lang) {
    if (!lang) return null;
    if (nativeLangs.includes(lang)) return lang;
    const base = lang.split("-")[0];
    return nativeLangs.find((l) => l.split("-")[0] === base) || null;
  };

  function pickSourceLang(nativeLangs) {
    return (
      nativeLangs.find((l) => l === "en") ||
      nativeLangs.find((l) => l.startsWith("en")) ||
      nativeLangs[0] ||
      "en"
    );
  }

  function buildVariant(workingUrl, lang, tracks, sourceLang) {
    const nativeLangs = tracks.map((track) => track.lang || "");
    const nativeCode = SubSync.resolveNativeLang(nativeLangs, lang);
    const sameLanguage =
      lang === sourceLang ||
      (lang && sourceLang && lang.split("-")[0] === sourceLang.split("-")[0]);
    const nativeTrack = nativeCode
      ? tracks.find((track) => track.lang === nativeCode)
      : null;
    const shouldUseNativeTrackUrl =
      nativeTrack && nativeTrack.baseUrl && !sameLanguage;
    const u = new URL(
      shouldUseNativeTrackUrl ? nativeTrack.baseUrl : workingUrl,
      location.origin
    );
    if (nativeCode || sameLanguage) {
      u.searchParams.set("lang", nativeCode || sourceLang);
      u.searchParams.delete("tlang");
    } else {
      u.searchParams.set("lang", sourceLang);
      u.searchParams.set("tlang", lang);
    }
    u.searchParams.set("fmt", "json3");
    return u.toString();
  }

  function parseJson3(data) {
    const events = (data && data.events) || [];
    const lines = [];

    for (const ev of events) {
      if (!ev.segs) continue;
      const startSec = (ev.tStartMs || 0) / 1000;
      const durSec = (ev.dDurationMs || 0) / 1000;

      // segs 내의 단어/텍스트 결합
      const text = ev.segs
        .map((s) => s.utf8 || "")
        .join("")
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!text || text === "\n") continue;

      lines.push({
        start: startSec,
        end: startSec + durSec,
        text
      });
    }

    return lines;
  }

  // 문장 단위로 분할 및 병합하는 헬퍼
  function splitAndFormatSentences(rawLines) {
    if (!rawLines || !rawLines.length) return [];

    const result = [];
    let currentStart = rawLines[0].start;
    let currentEnd = rawLines[0].end;
    let currentText = "";

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (!currentText) {
        currentStart = line.start;
      }
      currentEnd = line.end;

      if (currentText && !currentText.endsWith(" ") && !line.text.startsWith(" ")) {
        currentText += " " + line.text;
      } else {
        currentText += line.text;
      }

      // 문장 종료 조건: . ! ? 로 끝나거나 뒤 문장과의 시간 간격이 2.5초 이상 벌어질 때
      const isSentenceEnd = /[.!?](\s*)$/.test(line.text.trim());
      const nextLine = rawLines[i + 1];
      const hasGap = nextLine && (nextLine.start - line.end > 2.0);
      const isLongEnough = currentText.length > 70;

      if (isSentenceEnd || hasGap || isLongEnough || !nextLine) {
        result.push({
          start: currentStart,
          end: currentEnd,
          text: currentText.trim()
        });
        currentText = "";
      }
    }

    return result.length ? result : rawLines;
  }

  async function fetchLines(url, fetcher = fetch) {
    try {
      const res = await fetcher(url, { credentials: "include" });
      if (!res.ok) {
        return {
          lines: [],
          error: {
            code: "http",
            httpStatus: Number(res.status) || 0
          }
        };
      }
      const text = await res.text();
      if (!text) return { lines: [], error: { code: "empty" } };

      try {
        const data = JSON.parse(text);
        const lines = parseJson3(data);
        return lines.length
          ? { lines, error: null }
          : { lines: [], error: { code: "no-cues" } };
      } catch (_) {
        return { lines: [], error: { code: "parse" } };
      }
    } catch (err) {
      console.warn("[SubSync] 자막 요청 실패:", err && err.name ? err.name : "network");
      return { lines: [], error: { code: "network" } };
    }
  }

  function reportStatus(options, status) {
    if (options && typeof options.onStatus === "function") {
      options.onStatus(status);
    }
  }

  function findNearestText(lines, t, tolerance = 3.5) {
    let best = "";
    let bestDiff = Infinity;
    for (const line of lines) {
      const diff = Math.abs(line.start - t);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = line.text;
      }
    }
    return bestDiff <= tolerance ? best : "";
  }

  function intervalGap(startA, endA, startB, endB) {
    if (endA < startB) return startB - endA;
    if (endB < startA) return startA - endB;
    return 0;
  }

  function intervalOverlap(startA, endA, startB, endB) {
    return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
  }

  function alignKnownLines(learnLines, knownLines) {
    const aligned = learnLines.map(() => []);

    for (const knownLine of knownLines) {
      const knownStart = Number(knownLine.start);
      const knownEnd = Math.max(knownStart, Number(knownLine.end));
      if (!Number.isFinite(knownStart) || !Number.isFinite(knownEnd)) continue;

      let best = null;
      learnLines.forEach((learnLine, index) => {
        const learnStart = Number(learnLine.start);
        const learnEnd = Math.max(learnStart, Number(learnLine.end));
        if (!Number.isFinite(learnStart) || !Number.isFinite(learnEnd)) return;

        const overlap = intervalOverlap(knownStart, knownEnd, learnStart, learnEnd);
        const gap = intervalGap(knownStart, knownEnd, learnStart, learnEnd);
        const candidate = { index, overlap, gap };
        if (
          !best ||
          candidate.overlap > best.overlap ||
          (candidate.overlap === best.overlap && candidate.gap < best.gap) ||
          (candidate.overlap === best.overlap &&
            candidate.gap === best.gap &&
            candidate.index < best.index)
        ) {
          best = candidate;
        }
      });

      if (best && (best.overlap > 0 || best.gap <= 3.5)) {
        aligned[best.index].push(knownLine);
      }
    }

    return aligned.map((lines) => {
      const uniqueLines = [];
      for (const line of lines.sort((a, b) => a.start - b.start)) {
        const text = line.text.trim();
        if (!text) continue;

        const isDuplicate = uniqueLines.some(
          (previous) =>
            previous.text === text &&
            intervalOverlap(
              Number(previous.start),
              Number(previous.end),
              Number(line.start),
              Number(line.end)
            ) > 0
        );
        if (!isDuplicate) uniqueLines.push({ ...line, text });
      }

      return uniqueLines.map((line) => line.text).join(" ");
    });
  }

  SubSync.buildSubtitlesFromUrl = async function buildSubtitlesFromUrl(
    videoId,
    workingUrl,
    opts
  ) {
    const tracks = (opts && opts.tracks) || [];
    const learnLang = (opts && opts.learnLang) || "en";
    const knownLang = (opts && opts.knownLang) || "ko";
    const fetchCaption = (opts && opts.fetchCaption) || fetch;
    const nativeLangs = tracks.map((t) => t.lang || "");
    const sourceLang = pickSourceLang(nativeLangs);

    console.log("[SubSync] 자막 생성 시작:", {
      videoId,
      learnLang,
      knownLang,
      trackLanguages: nativeLangs,
      sourceLang
    });

    const learnResult = await fetchLines(
      buildVariant(workingUrl, learnLang, tracks, sourceLang),
      fetchCaption
    );
    const rawLearnLines = learnResult.lines;
    if (!rawLearnLines.length) {
      reportStatus(opts, {
        state: "error",
        phase: "learn",
        ...(learnResult.error || { code: "no-cues" })
      });
      return [];
    }

    let rawKnownLines = [];
    let knownError = null;
    if (knownLang) {
      const knownResult = await fetchLines(
        buildVariant(workingUrl, knownLang, tracks, sourceLang),
        fetchCaption
      );
      rawKnownLines = knownResult.lines;
      knownError = knownResult.error;
    }

    // 통으로 뭉개지지 않도록 적절한 문장/시간 단위로 정제
    const learnLines = splitAndFormatSentences(rawLearnLines);
    const knownLines = rawKnownLines.length ? rawKnownLines : [];
    const alignedKnownText = alignKnownLines(learnLines, knownLines);

    const result = learnLines.map((line, index) => {
      const matchedKo = alignedKnownText[index] || "";

      return {
        video_id: videoId,
        timestamp: line.start,
        end_timestamp: line.end,
        learn: line.text,
        known: matchedKo || ""
      };
    });

    reportStatus(
      opts,
      knownError
        ? { state: "warning", phase: "known", ...knownError }
        : { state: "ready", phase: "complete", count: result.length }
    );
    return result;
  };
})();
