// test_pk_reference.js — 用「跟 index.html 無關的另一套程式」驗算 PK 引擎（2026-10-19 新增）
//
// 目的：施工期間每次改動後，確認核心計算仍與教科書解法一致，而不是只跟自己上一版比。
//   A. predictConc（疊加法解析解）vs 本檔自寫的 RK4 數值積分（一室、多次間歇輸注）
//   B. fitCLV 兩點聯合擬合 vs Sawchuk-Zaske 閉式解（tdm-calculator skill 的 vancomycin 兩點法）
//   C. 單點擬合的行為（V 固定為族群值）只檢查方向與合理範圍
//   D. 資訊性輸出（不判定 PASS/FAIL）：穩態病人只記錄最後兩劑、卻沒勾「已達穩態」時，
//      擬合 CL 偏差多少——這是施工計畫 L-05 的量化依據。
//
// Run: node test_pk_reference.js
const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function ok(cond, label, detail){ if(cond){ pass++; } else { fail++; console.log('FAIL:', label, detail||''); } }
const rel = (a,b)=>Math.abs(a-b)/Math.abs(b);

// ---- 獨立參考實作：RK4 積分 dA/dt = R(t) − (CL/V)·A ----
function rk4Conc(tEnd, doses, CL, V, h){
  h = h || 0.002;
  const ke = CL/V;
  const rate = t => doses.reduce((s,d)=> s + ((t>=d.tHr && t<d.tHr+d.infHr) ? d.doseMg/d.infHr : 0), 0);
  let A = 0, t = 0;
  const n = Math.round(tEnd/h);
  for(let i=0;i<n;i++){
    const k1 = rate(t) - ke*A;
    const k2 = rate(t+h/2) - ke*(A+h/2*k1);
    const k3 = rate(t+h/2) - ke*(A+h/2*k2);
    const k4 = rate(t+h) - ke*(A+h*k3);
    A += h/6*(k1+2*k2+2*k3+k4); t += h;
  }
  return A/V;
}

(async()=>{
  const { exports: X } = await loadHarness();

  // 情境：vancomycin 1000 mg q12h、輸注 1 h、真實 CL 3 L/h、V 50 L，共 10 劑
  const CL=3, V=50, tau=12, inf=1, D=1000;
  const doses=[]; for(let i=0;i<10;i++) doses.push({tHr:i*tau, doseMg:D, infHr:inf});

  // A. 解析解 vs 數值積分（避開輸注起訖的不連續點）
  [0.5, 0.99, 2, 6, 11.9, 108.5, 109.5, 111, 119.9].forEach(t=>{
    const a = X.predictConc(t, doses, CL, V), r = rk4Conc(t, doses, CL, V);
    ok(rel(a, r) < 1e-3, `A predictConc vs RK4 @${t}h`, `tool=${a.toFixed(4)} ref=${r.toFixed(4)}`);
  });

  // B. 第 10 劑區間內兩點：輸注結束後 1 h、下一劑前 0.1 h
  const t1 = 110, t2 = 119.9;
  const c1 = X.predictConc(t1, doses, CL, V), c2 = X.predictConc(t2, doses, CL, V);
  const ke = Math.log(c1/c2)/(t2-t1);
  const cmax = c1*Math.exp(ke*(t1-109));
  const cmin = cmax*Math.exp(-ke*(tau-inf));
  const Vsz = (D/inf)*(1-Math.exp(-ke*inf))/(ke*(cmax - cmin*Math.exp(-ke*inf)));
  const CLsz = ke*Vsz;
  ok(rel(CLsz, CL) < 0.01 && rel(Vsz, V) < 0.01, 'B0 Sawchuk-Zaske 閉式解能還原真值（驗證參考實作本身）', `CL=${CLsz.toFixed(3)} V=${Vsz.toFixed(2)}`);

  const prior = {CLpop:2.0, Vpop:45, sigma:0.12, omegaCL:0.30, omegaV:0.25}; // 刻意偏離真值的先驗
  const fitFull = X.fitCLV(doses, [{tHr:t1,conc:c1},{tHr:t2,conc:c2}], prior);
  ok(rel(fitFull.CL, CLsz) < 0.02, 'B1 完整給藥史＋兩點：擬合 CL 與 SZ 差 <2%', `fit=${fitFull.CL.toFixed(3)} SZ=${CLsz.toFixed(3)}`);
  ok(rel(fitFull.V, Vsz) < 0.03, 'B2 完整給藥史＋兩點：擬合 V 與 SZ 差 <3%', `fit=${fitFull.V.toFixed(2)} SZ=${Vsz.toFixed(2)}`);

  const lastTwo = doses.slice(8).map(d=>({...d}));
  const primed = X.primePriorDoses(lastTwo, prior.CLpop, prior.Vpop, {tau, doseMg:D, infHr:inf}).doses;
  const fitPrimed = X.fitCLV(primed, [{tHr:t1,conc:c1},{tHr:t2,conc:c2}], prior);
  ok(rel(fitPrimed.CL, CLsz) < 0.02, 'B3 只記最後兩劑＋勾已達穩態：擬合 CL 與 SZ 差 <2%', `fit=${fitPrimed.CL.toFixed(3)}`);

  // C. 單點（trough）：V 固定族群值，CL 應落在先驗與真值之間或附近
  const fit1 = X.fitCLV(doses, [{tHr:t2,conc:c2}], prior);
  ok(fit1.mode==='single-level' && fit1.V===prior.Vpop, 'C1 單點模式固定 V');
  ok(fit1.CL > prior.CLpop && fit1.CL < CL*1.15, 'C2 單點 CL 往真值方向修正、未過衝', `fit=${fit1.CL.toFixed(3)}`);

  // D. 資訊性：只記最後兩劑、沒勾已達穩態
  const fitNoPrime = X.fitCLV(lastTwo, [{tHr:t1,conc:c1},{tHr:t2,conc:c2}], prior);
  const pct = (fitNoPrime.CL/CLsz - 1)*100;
  console.log(`INFO D 穩態病人只記最後兩劑且未勾「已達穩態」：擬合 CL ${fitNoPrime.CL.toFixed(2)}（真值 ${CLsz.toFixed(2)}，偏差 ${pct.toFixed(0)}%），AUC 會高估約 ${((CLsz/fitNoPrime.CL-1)*100).toFixed(0)}%`);

  // E. Cockcroft-Gault 手算對照：70 歲女性、55 kg、SCr 1.0
  const cg = X.cockcroftGault(70, 55, 1.0, 'F');
  ok(Math.abs(cg - (140-70)*55/(72*1.0)*0.85) < 1e-9, 'E1 Cockcroft-Gault 與手算一致', cg.toFixed(2));

  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
