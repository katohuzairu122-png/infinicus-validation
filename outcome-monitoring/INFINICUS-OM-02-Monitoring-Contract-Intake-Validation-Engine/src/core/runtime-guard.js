(function(global){
  "use strict";
  if(!global.INFINICUS?.OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-02.");
  }
})(window);
