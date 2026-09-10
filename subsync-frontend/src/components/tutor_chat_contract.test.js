const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const tutorChat = fs.readFileSync(path.join(__dirname, "tutor_chat.js"), "utf8");
const tutorCss = fs.readFileSync(path.join(__dirname, "..", "..", "styles", "tutor.css"), "utf8");
const themeCss = fs.readFileSync(path.join(__dirname, "..", "..", "styles", "theme.css"), "utf8");
const tutorService = fs.readFileSync(path.join(__dirname, "..", "services", "tutor_service.js"), "utf8");
const contentMain = fs.readFileSync(path.join(__dirname, "..", "content_main.js"), "utf8");

test("Tutor UI sends nearby subtitle context to the ask service", () => {
  assert.match(tutorChat, /tutorService\.ask\(text,\s*getRecentSubtitles\(\)\)/);
  assert.match(contentMain, /SubSync\.getRecentSubtitles\s*=\s*function/);
});

test("Tutor UI sends the backend conversation ID with feedback", () => {
  assert.match(
    tutorChat,
    /tutorService\.sendFeedback\(\s*messageId,\s*rating,\s*undefined,\s*conversationId\s*\)/
  );
  assert.match(tutorService, /conversation_id:\s*requestedConversationId \|\| conversationId/);
});

test("Tutor proactive checks use the backend service contract", () => {
  assert.match(tutorChat, /tutorService\.checkProactive\(recentSubtitles,\s*\{/);
  assert.match(tutorService, /recent_subtitles:\s*normalizeSubtitles\(recentSubtitles\)/);
});

test("Tutor shows and removes an animated answer-preparation indicator", () => {
  assert.match(tutorChat, /addThinkingIndicator/);
  assert.match(tutorChat, /removeThinkingIndicator/);
  assert.match(tutorChat, /subsync-tutor-thinking/);
  assert.match(tutorCss, /@keyframes subsync-tutor-thinking-wave/);
  assert.match(tutorCss, /animation-name:\s*subsync-tutor-thinking-wave/);
  assert.match(tutorCss, /animation-delay/);
  assert.match(tutorCss, /prefers-reduced-motion/);
});

test("Tutor left-aligns the answer-preparation indicator with tutor messages", () => {
  assert.match(
    tutorCss,
    /\.subsync-msg\.subsync-msg-thinking\s*\{[\s\S]*?align-self:\s*flex-start;[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*center;/
  );
});

test("light theme renders the Tutor answer-preparation dots in black", () => {
  assert.match(
    themeCss,
    /body\[data-subsync-theme="light"\]\s+\.subsync-tutor-box\s+\.subsync-tutor-thinking-dot\s*\{[\s\S]*?background:\s*#000(?:000)?;/
  );
});

class TutorTestElement {
  constructor(tagName, documentRef) {
    this.tagName = tagName;
    this.documentRef = documentRef;
    this.children = [];
    this.parentNode = null;
    this.listeners = new Map();
    this.attributes = {};
    this.style = {};
    this.disabled = false;
    this.value = "";
    this.textContent = "";
    this.className = "";
    this.scrollTop = 0;
    this.scrollHeight = 0;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this._innerHTML.includes("subsync-tutor-thinking-dots")) {
      const dots = new TutorTestElement("span", this.documentRef);
      dots.className = "subsync-tutor-thinking-dots";
      for (let i = 0; i < 3; i += 1) {
        const dot = new TutorTestElement("span", this.documentRef);
        dot.className = "subsync-tutor-thinking-dot";
        dots.appendChild(dot);
      }
      this.appendChild(dots);
    }
    if (!this.documentRef || this.tagName !== "div" || !this._innerHTML.includes("subsync-tutor-box")) return;
    for (const [id, tagName] of [["subsync-tutor-msgs", "div"], ["subsync-tutor-input", "input"], ["subsync-tutor-send-btn", "button"]]) {
      const child = new TutorTestElement(tagName, this.documentRef);
      child.id = id;
      this.appendChild(child);
      this.documentRef.elements.set(id, child);
    }
  }

  get innerHTML() {
    return this._innerHTML || "";
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  addEventListener(type, listener) {
    const callbacks = this.listeners.get(type) || [];
    callbacks.push(listener);
    this.listeners.set(type, callbacks);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    this.scrollHeight = this.children.length;
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
  }

  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  querySelectorAll() {
    return [];
  }
}

class TutorTestDocument {
  constructor() {
    this.elements = new Map();
    this.body = new TutorTestElement("body", this);
  }

  createElement(tagName) {
    return new TutorTestElement(tagName, this);
  }

  getElementById(id) {
    return this.elements.get(id) || null;
  }
}

test("Tutor answer preparation indicator exists only while the request is pending", async () => {
  const documentRef = new TutorTestDocument();
  let resolveAsk;
  const subSync = {
    icon() { return ""; },
    getRecentSubtitles() { return []; },
    interactiveText: { attach(element, text) { element.textContent = text; } },
    tutorService: {
      resetConversation() {},
      ask() {
        return new Promise((resolve) => { resolveAsk = resolve; });
      }
    }
  };
  const context = { console: { warn() {} }, document: documentRef, window: null, __SubSync: subSync };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(tutorChat, context, { filename: "tutor_chat.js" });

  const container = documentRef.createElement("div");
  subSync.tutorChat.init(container);
  const messages = documentRef.getElementById("subsync-tutor-msgs");
  const input = documentRef.getElementById("subsync-tutor-input");
  const sendButton = documentRef.getElementById("subsync-tutor-send-btn");
  input.value = "What does this mean?";

  const sendPromise = sendButton.listeners.get("click")[0]();
  const thinking = messages.children.find((child) => child.className.includes("subsync-msg-thinking"));
  assert.ok(thinking);
  assert.equal(thinking.children[0].children.length, 3);

  resolveAsk({ reply: "It means the speaker is asking for an explanation." });
  await sendPromise;
  assert.equal(messages.children.some((child) => child.className.includes("subsync-msg-thinking")), false);
  assert.equal(messages.children.at(-1).children[0].textContent, "It means the speaker is asking for an explanation.");
});
