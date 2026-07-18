import { installGlobal } from "../src/index.js";
const runtime = installGlobal();
const diagnostic = runtime.diagnose().data;
document.querySelector("#cards").innerHTML = [
  ["State", diagnostic.state], ["Services", diagnostic.services],
  ["Routes", diagnostic.routes], ["Manifest blocks", runtime.getBlockManifest().data.length]
].map(([label,value]) => `<div class="card"><div>${label}</div><div class="value">${value}</div></div>`).join("");
document.querySelector("#output").textContent = JSON.stringify(diagnostic, null, 2);
