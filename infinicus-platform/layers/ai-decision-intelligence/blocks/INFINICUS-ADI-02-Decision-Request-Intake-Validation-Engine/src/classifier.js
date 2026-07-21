const PRIORITY = Object.freeze({ low: 25, medium: 50, high: 75, critical: 100 });
const SCOPE_WEIGHT = Object.freeze({ team: 0, function: 3, business: 6, portfolio: 9, ecosystem: 12 });

export function classifyRequest(request) {
  const priorityScore = Math.min(100, PRIORITY[request.urgency] + SCOPE_WEIGHT[request.scope]);
  const lane = request.urgency === "critical" ? "expedited" :
    request.urgency === "high" ? "priority" : "standard";
  return Object.freeze({ decisionType: request.decisionType, priorityScore, processingLane: lane });
}
