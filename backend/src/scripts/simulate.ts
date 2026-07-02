import { earnQueue } from "../queues/earnQueues.js";
import { startEarnSimulationLoop } from "../scheduler/earnSimulation.js";

const simulationTask = startEarnSimulationLoop();

if (!simulationTask.enabled) {
  console.log("[simulation] disabled");
  await earnQueue.close();
  process.exit(0);
}

console.log("[simulation] producer started");

async function shutdown() {
  simulationTask.stop();
  await earnQueue.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
