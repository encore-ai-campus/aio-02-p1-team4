const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const servicePath = path.join(__dirname, "log_service.js");
const serviceSource = fs.readFileSync(servicePath, "utf8");

function loadLogService() {
  const requestCalls = [];
  const historyCalls = [];
  const context = {
    Promise,
    String,
    Number,
    Boolean,
    document: {
      title: "Fixture video - YouTube",
      querySelector() {
        return null;
      }
    },
    window: {
      __SubSync: {
        getVideoId: () => "fixture-video",
        player: {
          getCurrentTime: () => 12.5
        },
        apiClient: {
          request: async (...args) => {
            requestCalls.push(args);
            return { ok: true };
          }
        },
        learningHistory: {
          async recordWordClick(...args) {
            historyCalls.push(["click", args]);
          },
          async recordWatch(...args) {
            historyCalls.push(["watch", args]);
          }
        }
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(serviceSource, context, { filename: servicePath });
  return { logService: context.window.__SubSync.logService, requestCalls, historyCalls };
}

test("learning history logging does not call the removed /logs/event endpoint", async () => {
  const harness = loadLogService();

  harness.logService.recordClick("honest", "Be honest.");
  harness.logService.recordWatch(5);
  await Promise.resolve();

  assert.equal(harness.requestCalls.length, 0);
  assert.equal(harness.historyCalls.length, 2);
  assert.equal(harness.historyCalls[0][0], "click");
  assert.equal(harness.historyCalls[1][0], "watch");
});
