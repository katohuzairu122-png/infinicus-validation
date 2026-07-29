(function (global) {
  "use strict";

  function analyze({
    members = [],
    capabilities = [],
    states = [],
    positions = []
  } = {}) {
    const totalAvailableHours =
      states.reduce(
        (sum, state) =>
          sum + Number(state.availableHours || 0),
        0
      );

    const totalAssignedHours =
      states.reduce(
        (sum, state) =>
          sum + Number(state.assignedHours || 0),
        0
      );

    const totalProductiveHours =
      states.reduce(
        (sum, state) =>
          sum + Number(state.productiveHours || 0),
        0
      );

    const totalAbsenceHours =
      states.reduce(
        (sum, state) =>
          sum + Number(state.absenceHours || 0),
        0
      );

    const utilizationPercent =
      totalAvailableHours === 0
        ? null
        : Number(
            (
              totalAssignedHours /
              totalAvailableHours *
              100
            ).toFixed(4)
          );

    const productivityPercent =
      totalAssignedHours === 0
        ? null
        : Number(
            (
              totalProductiveHours /
              totalAssignedHours *
              100
            ).toFixed(4)
          );

    const absenceRatePercent =
      totalAvailableHours === 0
        ? null
        : Number(
            (
              totalAbsenceHours /
              totalAvailableHours *
              100
            ).toFixed(4)
          );

    const vacantPositions =
      positions.filter(position =>
        !position.occupantEntityInstanceId ||
        position.status === "vacant"
      );

    const capabilityCoverage =
      new Map();

    for (const capability of capabilities) {
      if (!capabilityCoverage.has(capability.skillId)) {
        capabilityCoverage.set(
          capability.skillId,
          {
            skillId:
              capability.skillId,
            memberCount: 0,
            verifiedCount: 0,
            averageProficiencyScore: 0,
            totalProficiencyScore: 0
          }
        );
      }

      const record =
        capabilityCoverage.get(capability.skillId);

      record.memberCount += 1;
      record.verifiedCount +=
        capability.verified ? 1 : 0;
      record.totalProficiencyScore +=
        Number(capability.proficiencyScore || 0);
    }

    const skillCoverage =
      [...capabilityCoverage.values()]
        .map(record => ({
          skillId:
            record.skillId,
          memberCount:
            record.memberCount,
          verifiedCount:
            record.verifiedCount,
          averageProficiencyScore:
            record.memberCount === 0
              ? 0
              : Number(
                  (
                    record.totalProficiencyScore /
                    record.memberCount
                  ).toFixed(4)
                )
        }))
        .sort((a, b) =>
          a.memberCount - b.memberCount
        );

    const overloadedMembers =
      states
        .filter(state =>
          state.availableHours > 0 &&
          state.assignedHours /
            state.availableHours >
            1
        )
        .map(state => ({
          workforceMemberId:
            state.workforceMemberId,
          utilizationPercent:
            Number(
              (
                state.assignedHours /
                state.availableHours *
                100
              ).toFixed(4)
            )
        }));

    return {
      headcount:
        members.filter(member =>
          member.status === "active"
        ).length,
      positionCount:
        positions.length,
      vacantPositionCount:
        vacantPositions.length,
      totalAvailableHours:
        Number(totalAvailableHours.toFixed(4)),
      totalAssignedHours:
        Number(totalAssignedHours.toFixed(4)),
      totalProductiveHours:
        Number(totalProductiveHours.toFixed(4)),
      utilizationPercent,
      productivityPercent,
      absenceRatePercent,
      skillCoverage,
      overloadedMembers
    };
  }

  global.INFINICUS.DT.workforceAnalyzer =
    Object.freeze({ analyze });
})(window);
