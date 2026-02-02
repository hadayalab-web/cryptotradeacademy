// utils/suppressKnownWarnings.js
// 依存・ランタイム由来の既知の警告を抑制（API エントリで require して使用）
// - DEP0169: url.parse() → 依存パッケージ内で発生
// - ExperimentalWarning: vm.USE_MAIN_CONTEXT_DEFAULT_LOADER → Node/Vercel ランタイム

let installed = false;

function install() {
  if (installed) return;
  installed = true;
  process.on("warning", (w) => {
    const msg = typeof w.message === "string" ? w.message : "";
    if (w.name === "DeprecationWarning" && msg.includes("url.parse()")) return;
    if (w.name === "ExperimentalWarning" && msg.includes("USE_MAIN_CONTEXT_DEFAULT_LOADER")) return;
    console.warn(w.name || "Warning", w.message || w);
  });
}

install();
