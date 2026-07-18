(function(global){
  "use strict";

  function validateRequest({resource,request,existingReservations=[]}){
    const issues=[];
    const quantity=Number(request.quantity || 0);

    if(!resource || resource.status!=="active"){
      issues.push("Resource is not active.");
    }

    if(quantity<=0){
      issues.push("Reservation quantity must be greater than zero.");
    }

    const currentlyReserved=existingReservations
      .filter(item =>
        item.state==="reserved" &&
        (!item.expiresAt || new Date(item.expiresAt).getTime()>Date.now())
      )
      .reduce((sum,item)=>sum+Number(item.quantity || 0),0);

    const available=
      Number(resource?.totalQuantity || 0)-currentlyReserved;

    if(quantity>available){
      issues.push("Requested quantity exceeds available resource capacity.");
    }

    if(
      request.expiresAt &&
      new Date(request.expiresAt).getTime()<=Date.now()
    ){
      issues.push("Reservation expiry must be in the future.");
    }

    return {
      valid:issues.length===0,
      issues,
      availableQuantity:available
    };
  }

  global.INFINICUS.ABA.resourceReservationValidator=
    Object.freeze({validateRequest});
})(window);
