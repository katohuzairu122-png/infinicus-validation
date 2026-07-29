(function(global){
  "use strict";

  function detect({
    context,
    policy,
    now=new Date().toISOString()
  }={}){
    const exceptions=[];

    for(const metric of context.metrics || []){
      const observations=
        (context.observations || []).filter(
          item=>item.metricId===metric.metricId
        );

      const checkpoints=
        (context.checkpoints || []).filter(
          item=>item.metricId===metric.metricId
        );

      const completedCheckpointIds=
        new Set(
          observations
            .map(item=>item.monitoringCheckpointId)
            .filter(Boolean)
        );

      const overdueCheckpoints=
        checkpoints.filter(checkpoint=>{
          const due=
            new Date(
              checkpoint.graceEndsAt ||
              checkpoint.scheduledAt
            ).getTime();

          return (
            due < new Date(now).getTime() &&
            !completedCheckpointIds.has(
              checkpoint.monitoringCheckpointId
            )
          );
        });

      if(overdueCheckpoints.length){
        exceptions.push({
          exceptionType:"missing_checkpoint",
          metricId:metric.metricId,
          count:overdueCheckpoints.length,
          references:
            overdueCheckpoints.map(
              item=>item.monitoringCheckpointId
            ),
          severity:
            overdueCheckpoints.length >=
            policy.missingCheckpointCriticalCount
              ? "critical"
              : "warning"
        });
      }

      if(!observations.length){
        exceptions.push({
          exceptionType:"missing_observation",
          metricId:metric.metricId,
          count:1,
          references:[],
          severity:"critical"
        });
      }

      const latest=
        observations
          .slice()
          .sort(
            (a,b)=>
              new Date(b.sourceTimestamp).getTime() -
              new Date(a.sourceTimestamp).getTime()
          )[0];

      if(latest?.sourceTimestamp){
        const staleMinutes=
          (
            new Date(now).getTime() -
            new Date(latest.sourceTimestamp).getTime()
          ) / 60000;

        if(staleMinutes>=policy.staleMinutesWarning){
          exceptions.push({
            exceptionType:"stale_observation",
            metricId:metric.metricId,
            count:1,
            references:[latest.observationId],
            staleMinutes:Number(staleMinutes.toFixed(2)),
            severity:
              staleMinutes>=policy.staleMinutesCritical
                ? "critical"
                : "warning"
          });
        }
      }

      const requiredEvidence=
        Number(metric.requiredEvidenceCount || 1);

      const actualEvidence=
        observations.filter(
          item=>item.rawEvidence!=null
        ).length;

      const completeness=
        requiredEvidence===0
          ? 1
          : Math.min(1,actualEvidence/requiredEvidence);

      if(completeness<policy.minimumEvidenceCompleteness){
        exceptions.push({
          exceptionType:"incomplete_evidence",
          metricId:metric.metricId,
          count:1,
          references:
            observations.map(item=>item.observationId),
          evidenceCompleteness:
            Number(completeness.toFixed(4)),
          severity:
            completeness<0.5 ? "critical" : "warning"
        });
      }
    }

    for(const failure of context.collectionFailures || []){
      exceptions.push({
        exceptionType:
          failure.error?.code==="OM_COLLECTOR_NOT_FOUND"
            ? "connector_unavailable"
            : "collection_failure",
        metricId:failure.metricId || null,
        count:1,
        references:
          [failure.bindingId].filter(Boolean),
        severity:"critical",
        failure
      });
    }

    return exceptions;
  }

  global.INFINICUS.OM.monitoringExceptionDetector=
    Object.freeze({detect});
})(window);
