(function (global) {
  "use strict";

  function validate({
    members = [],
    skills = [],
    capabilities = [],
    states = [],
    positions = []
  } = {}) {
    const issues = [];

    const memberIds =
      new Set(
        members.map(item =>
          item.workforceMemberId
        )
      );

    const skillIds =
      new Set(
        skills.map(item =>
          item.skillId
        )
      );

    const positionIds =
      new Set(
        positions.map(item =>
          item.positionId
        )
      );

    for (const member of members) {
      if (
        member.positionId &&
        !positionIds.has(member.positionId)
      ) {
        issues.push(
          `Unknown workforce position: ${member.positionId}`
        );
      }

      if (
        member.confidence < 0 ||
        member.confidence > 1
      ) {
        issues.push(
          "Workforce-member confidence must be between 0 and 1."
        );
      }
    }

    for (const capability of capabilities) {
      if (
        !memberIds.has(
          capability.workforceMemberId
        )
      ) {
        issues.push(
          `Unknown workforce member: ${capability.workforceMemberId}`
        );
      }

      if (!skillIds.has(capability.skillId)) {
        issues.push(
          `Unknown skill: ${capability.skillId}`
        );
      }
    }

    for (const state of states) {
      if (
        !memberIds.has(state.workforceMemberId)
      ) {
        issues.push(
          `Unknown workforce state member: ${state.workforceMemberId}`
        );
      }

      if (
        state.confidence < 0 ||
        state.confidence > 1
      ) {
        issues.push(
          "Workforce-state confidence must be between 0 and 1."
        );
      }
    }

    return {
      valid:
        issues.length === 0,
      issues
    };
  }

  global.INFINICUS.DT.workforceValidator =
    Object.freeze({ validate });
})(window);
