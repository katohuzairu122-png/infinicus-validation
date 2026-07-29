(function (global) {
  "use strict";

  function validate({
    channels = [],
    audiences = [],
    campaigns = [],
    states = [],
    customerSegments = []
  } = {}) {
    const issues = [];
    const channelIds =
      new Set(channels.map(item => item.marketingChannelId));
    const audienceIds =
      new Set(audiences.map(item => item.audienceId));
    const campaignIds =
      new Set(campaigns.map(item => item.campaignId));
    const segmentIds =
      new Set(customerSegments.map(item => item.customerSegmentId));

    for (const audience of audiences) {
      for (const segmentId of audience.customerSegmentIds) {
        if (!segmentIds.has(segmentId)) {
          issues.push(
            `Unknown customer segment: ${segmentId}`
          );
        }
      }
    }

    for (const campaign of campaigns) {
      if (!channelIds.has(campaign.marketingChannelId)) {
        issues.push(
          `Unknown marketing channel: ${campaign.marketingChannelId}`
        );
      }

      for (const audienceId of campaign.audienceIds) {
        if (!audienceIds.has(audienceId)) {
          issues.push(
            `Unknown audience: ${audienceId}`
          );
        }
      }
    }

    for (const state of states) {
      if (!campaignIds.has(state.campaignId)) {
        issues.push(
          `Unknown campaign: ${state.campaignId}`
        );
      }

      if (
        state.confidence < 0 ||
        state.confidence > 1
      ) {
        issues.push(
          "Campaign-state confidence must be between 0 and 1."
        );
      }
    }

    return {
      valid:
        issues.length === 0,
      issues
    };
  }

  global.INFINICUS.DT.marketingStateValidator =
    Object.freeze({ validate });
})(window);
