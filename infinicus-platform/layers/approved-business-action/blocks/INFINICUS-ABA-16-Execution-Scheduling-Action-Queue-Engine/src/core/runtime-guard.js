(function(global){
  "use strict";
  const ABA=global.INFINICUS?.ABA;
  if(!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-16.");
  if(!ABA?.resourceReservationAvailabilityEngine){
    throw new Error("ABA-15 must be loaded before ABA-16.");
  }
})(window);
