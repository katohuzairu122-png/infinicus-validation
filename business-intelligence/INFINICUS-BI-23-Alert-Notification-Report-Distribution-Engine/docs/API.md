# API

`window.INFINICUS.BI.alertNotificationDistributionEngine`

- `registerPolicy(input)`
- `registerChannel(input)`
- `registerAudience(input)`
- `registerSender(channelType, sender)`
- `distribute({...})`
- `acknowledge({...})`
- `getDelivery({...})`
- `getIntelligencePublicationHandoff({...})`
- `listDeadLetters()`

Routes:
- `bi.distribution_policy.register`
- `bi.distribution_channel.register`
- `bi.audience.register`
- `bi.report.distribute`
- `bi.report_delivery.acknowledge`
