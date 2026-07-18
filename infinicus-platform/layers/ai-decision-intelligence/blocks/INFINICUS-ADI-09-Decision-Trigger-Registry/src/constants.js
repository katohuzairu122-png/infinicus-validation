export const TRIGGER_TYPES=Object.freeze(["manual","threshold","anomaly","goal_variance","risk","opportunity","simulation","outcome_monitoring","external_verified"]);
export const TRIGGER_SEVERITIES=Object.freeze(["info","low","medium","high","critical"]);
export const TRIGGER_STATUSES=Object.freeze(["open","acknowledged","linked","resolved","dismissed","expired"]);
export const TRANSITIONS=Object.freeze({open:["acknowledged","linked","resolved","dismissed","expired"],acknowledged:["linked","resolved","dismissed","expired"],linked:["resolved","dismissed","expired"],resolved:[],dismissed:[],expired:[]});
