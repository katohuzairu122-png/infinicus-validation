# Integration contract

Attach after ADI-16, ADI-17 and ADI-18. Supply an optional `calibrator` with `calibrate({ rawConfidence, alternativeId, components })`; it returns `{ calibratedConfidence, version }`. Without one, the result is explicitly marked `uncalibrated`.

Confidence is computed from ranking coverage (35%), completed simulation coverage (25%), quantified risk coverage (20%) and supplied sensitivity stability (20%). Missing stability is zero, not assumed certainty.
