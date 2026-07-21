(function(global){
  "use strict";

  function normalizeText(value){
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g," ")
      .replace(/\s+/g," ")
      .trim();
  }

  function classify({
    evidence,
    taxonomies,
    policy
  }={}){
    const text=
      normalizeText(
        JSON.stringify(evidence.evidencePayload || {})
      );

    const matches=[];

    for(const taxonomy of taxonomies){
      const keywords=
        (taxonomy.keywords || [])
          .map(normalizeText)
          .filter(Boolean);

      const hits=
        keywords.filter(keyword=>text.includes(keyword));

      if(!hits.length){
        continue;
      }

      const confidence=
        Math.min(
          1,
          hits.length / Math.max(1,keywords.length)
        );

      matches.push({
        taxonomyId:taxonomy.learningTaxonomyId,
        categoryCode:taxonomy.categoryCode,
        subcategoryCode:taxonomy.subcategoryCode || null,
        matchedKeywords:hits,
        confidence:Number(confidence.toFixed(4))
      });
    }

    matches.sort(
      (a,b)=>b.confidence-a.confidence
    );

    const filtered=
      matches
        .filter(
          item=>
            item.confidence>=
            policy.minimumClassificationConfidence
        )
        .slice(
          0,
          policy.allowMultiLabel
            ? policy.maximumLabels
            : 1
        );

    return {
      primaryClassification:
        filtered[0] || null,
      classifications:filtered,
      unclassified:filtered.length===0
    };
  }

  global.INFINICUS.CL.taxonomyClassifier=
    Object.freeze({normalizeText,classify});
})(window);
