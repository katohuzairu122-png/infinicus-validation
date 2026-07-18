(function (global) {
  "use strict";

  function build({
    synchronizedState = [],
    businessEvents = [],
    opportunities = [],
    vulnerabilities = [],
    breaches = []
  } = {}) {
    const entries = [];

    for (const state of synchronizedState) {
      entries.push({
        timelineEntryId:
          `state_${state.businessStateRecordId}_${state.version}`,
        entryType: "state",
        occurredAt:
          state.observedAt ||
          state.updatedAt ||
          state.createdAt,
        referenceId:
          state.businessStateRecordId,
        stateKey:
          state.stateKey,
        value:
          structuredClone(state.value),
        version:
          state.version,
        confidence:
          state.confidence
      });
    }

    for (const event of businessEvents) {
      entries.push({
        timelineEntryId:
          `event_${event.businessEventId}`,
        entryType: "business_event",
        occurredAt:
          event.occurredAt ||
          event.createdAt,
        referenceId:
          event.businessEventId,
        stateKey:
          event.stateKey,
        severity:
          event.severity,
        beforeValue:
          structuredClone(event.beforeValue),
        afterValue:
          structuredClone(event.afterValue)
      });
    }

    for (const opportunity of opportunities) {
      entries.push({
        timelineEntryId:
          `opportunity_${opportunity.strategicOpportunityId}`,
        entryType: "opportunity",
        occurredAt:
          opportunity.createdAt,
        referenceId:
          opportunity.strategicOpportunityId,
        name:
          opportunity.name,
        priorityCategory:
          opportunity.priorityCategory,
        riskAdjustedOpportunityScore:
          opportunity.riskAdjustedOpportunityScore
      });
    }

    for (const vulnerability of vulnerabilities) {
      entries.push({
        timelineEntryId:
          `risk_${vulnerability.vulnerabilityId}`,
        entryType: "risk",
        occurredAt:
          vulnerability.createdAt,
        referenceId:
          vulnerability.vulnerabilityId,
        name:
          vulnerability.name,
        status:
          vulnerability.status
      });
    }

    for (const breach of breaches) {
      entries.push({
        timelineEntryId:
          `breach_${breach.breachId}`,
        entryType: "breach",
        occurredAt:
          breach.createdAt,
        referenceId:
          breach.breachId,
        severity:
          breach.severity,
        status:
          breach.status
      });
    }

    return entries.sort((a, b) =>
      new Date(a.occurredAt).getTime() -
      new Date(b.occurredAt).getTime()
    );
  }

  global.INFINICUS.DT.timelineBuilder =
    Object.freeze({ build });
})(window);
