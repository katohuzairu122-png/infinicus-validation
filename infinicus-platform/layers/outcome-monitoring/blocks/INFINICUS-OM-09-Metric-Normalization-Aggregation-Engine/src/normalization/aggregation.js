(function(global){
  "use strict";

  function aggregate(values,mode="latest",weights=[]){
    if(!values.length) return null;

    switch(mode){
      case "sum":
        return values.reduce((sum,value)=>sum+value,0);
      case "average":
        return values.reduce((sum,value)=>sum+value,0)/values.length;
      case "minimum":
        return Math.min(...values);
      case "maximum":
        return Math.max(...values);
      case "count":
        return values.length;
      case "weighted_average":{
        const totalWeight=weights.reduce((sum,value)=>sum+value,0);
        if(!totalWeight) return null;
        return values.reduce(
          (sum,value,index)=>sum+value*(weights[index] || 0),
          0
        )/totalWeight;
      }
      case "latest":
      default:
        return values.at(-1);
    }
  }

  global.INFINICUS.OM.metricAggregation=
    Object.freeze({aggregate});
})(window);
