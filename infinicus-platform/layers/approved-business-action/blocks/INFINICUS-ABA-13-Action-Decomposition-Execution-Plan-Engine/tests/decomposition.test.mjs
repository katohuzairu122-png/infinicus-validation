import assert from "node:assert/strict";

const tasks=[
  {id:"a",dependencies:[],duration:10},
  {id:"b",dependencies:["a"],duration:20},
  {id:"c",dependencies:["b"],duration:15}
];

function critical(tasks){
  const byId=new Map(tasks.map(t=>[t.id,t]));
  const memo=new Map();

  function total(id){
    if(memo.has(id)) return memo.get(id);
    const task=byId.get(id);
    const value=
      Math.max(0,...task.dependencies.map(total))+
      task.duration;
    memo.set(id,value);
    return value;
  }

  return Math.max(...tasks.map(t=>total(t.id)));
}

assert.equal(critical(tasks),45);

const ids=new Set(tasks.map(t=>t.id));
assert.equal(
  tasks.every(t=>t.dependencies.every(id=>ids.has(id))),
  true
);

console.log("ABA-13 decomposition tests passed.");
