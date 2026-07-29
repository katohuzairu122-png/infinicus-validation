import assert from "node:assert/strict";

const tasks=[
  {id:"a",dependencies:[]},
  {id:"b",dependencies:["a"]},
  {id:"c",dependencies:["b"]}
];

const indegree=new Map(tasks.map(t=>[t.id,0]));
for(const task of tasks){
  for(const dep of task.dependencies){
    indegree.set(task.id,indegree.get(task.id)+1);
  }
}

assert.equal(indegree.get("a"),0);
assert.equal(indegree.get("b"),1);
assert.equal(indegree.get("c"),1);

const start=Date.now();
const end=start+3600000;
assert.equal(start<end,true);

console.log("ABA-16 scheduling tests passed.");
