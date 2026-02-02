// utils/suppressKnownWarnings.js
// 依存・ランタイム由来の既知の警告のみ抑制（API エントリで require して使用）
// - DEP0169: url.parse() → 依存パッケージ内で発生（自コードでは未使用）

let installed = false;

function install() {
  if (installed) return;
  installed = true;

  const defaultListeners = process.listeners("warning");
  process.removeAllListeners("warning");

  process.on("warning", (w) => {
    const code = w.code || "";
    const msg = typeof w.message === "string" ? w.message : "";
    // DEP0169: url.parse() は依存パッケージ内で発生するため抑制
    if (code === "DEP0169" || (w.name === "DeprecationWarning" && msg.includes("url.parse()"))) {
      return;
    }
    // それ以外は従来どおり出力（元のリスナーを再現）
    for (const fn of defaultListeners) {
      fn(w);
    }
  });
}

install();
