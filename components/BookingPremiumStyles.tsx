export default function BookingPremiumStyles() {
  return <style jsx global>{`
.booking-premium,.booking-ci-premium{max-width:1440px;margin:0 auto;padding-bottom:30px}
.booking-hero,.booking-ci-top{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:18px;padding:24px 26px;border-radius:24px;color:#fff;background:radial-gradient(circle at 90% 10%,rgba(255,255,255,.16),transparent 28%),linear-gradient(125deg,#071326 0%,#172554 52%,#4338ca 100%);box-shadow:0 20px 50px rgba(30,41,59,.16);position:relative;overflow:hidden}
.booking-hero:after,.booking-ci-top:after{content:"";position:absolute;width:220px;height:220px;border-radius:50%;right:-75px;bottom:-120px;background:rgba(125,211,252,.14);filter:blur(2px)}
.booking-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:800;letter-spacing:1.4px;color:#93c5fd;text-transform:uppercase}
.booking-hero h1,.booking-ci-top h1{margin:7px 0 5px;font-size:32px;letter-spacing:-.8px}
.booking-hero p,.booking-ci-top p{margin:0;color:#cbd5e1;font-size:12px;line-height:1.55}
.booking-refresh,.booking-back-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:11px 15px;background:rgba(255,255,255,.1);color:#fff;font-weight:800;cursor:pointer;position:relative;z-index:1}
.booking-refresh:hover,.booking-back-btn:hover{background:rgba(255,255,255,.17)}
.booking-refresh:disabled{opacity:.65;cursor:wait}
.booking-flow-card,.booking-list-card,.booking-ci-shell{background:rgba(255,255,255,.94);border:1px solid rgba(255,255,255,.9);border-radius:22px;box-shadow:0 14px 40px rgba(30,41,59,.08);backdrop-filter:blur(10px)}
.booking-flow-card{padding:17px 18px;margin-bottom:14px}
.booking-flow-title{font-size:11px;font-weight:900;letter-spacing:.8px;color:#344054;margin:0 0 13px;text-transform:uppercase}
.booking-flow-title span{margin-left:8px;padding:4px 7px;border-radius:999px;background:#dcfce7;color:#15803d;font-size:8px}
.booking-flow{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
.booking-flow-step{position:relative;display:flex;align-items:center;gap:8px;min-width:0;padding:9px;border-radius:13px;background:linear-gradient(180deg,#f8fafc,#f1f5f9);border:1px solid #edf0f6}
.booking-flow-icon{width:30px;height:30px;display:grid;place-items:center;border-radius:9px;flex:none;background:linear-gradient(135deg,#dbeafe,#ede9fe);color:#4338ca}
.booking-flow-step b{display:block;font-size:9px;color:#344054;white-space:nowrap}
.booking-flow-step small{display:block;margin-top:2px;font-size:7px;color:#98a2b3;white-space:nowrap}
.booking-flow-arrow{position:absolute;right:-10px;color:#94a3b8;z-index:2}
.booking-notice,.booking-ci-notice{display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:13px;margin-bottom:14px;background:#ecfdf3;border:1px solid #bbf7d0;color:#166534;font-size:12px;font-weight:700}
.booking-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-bottom:14px}
.booking-stats button{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #e6eaf3;border-radius:13px;padding:11px 13px;background:#fff;color:#667085;cursor:pointer;font-size:11px;font-weight:700;box-shadow:0 5px 18px rgba(30,41,59,.04)}
.booking-stats button b{min-width:24px;height:24px;display:grid;place-items:center;border-radius:8px;background:#f1f5f9;color:#475467;font-size:10px}
.booking-stats button.active{border-color:#c7d2fe;background:linear-gradient(135deg,#eef2ff,#fff);color:#3730a3;box-shadow:0 8px 22px rgba(79,70,229,.10)}
.booking-stats button.active b{background:#4338ca;color:#fff}
.booking-list-card{overflow:hidden}
.booking-list-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1px solid #eef1f6}
.booking-list-head h2{margin:0;font-size:16px;color:#172033}
.booking-list-head p{margin:4px 0 0;color:#98a2b3;font-size:10px}
.booking-live-dot{display:inline-flex;align-items:center;gap:6px;font-size:8px;font-weight:900;color:#15803d;letter-spacing:.8px}
.booking-live-dot i{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px #dcfce7}
.booking-table-wrap{overflow-x:auto}
.booking-table{width:100%;border-collapse:collapse;min-width:850px}
.booking-table th{padding:11px 14px;text-align:left;background:#f8faff;color:#98a2b3;font-size:8px;letter-spacing:.7px}
.booking-table td{padding:13px 14px;border-top:1px solid #eef1f6;color:#475467;font-size:11px;vertical-align:middle}
.booking-guest{display:flex;align-items:center;gap:9px}
.booking-guest>span{width:34px;height:34px;display:grid;place-items:center;border-radius:11px;background:linear-gradient(135deg,#dbeafe,#ede9fe);color:#4338ca}
.booking-guest b{display:block;color:#172033;font-size:11px}
.booking-guest small,.booking-property{display:block;margin-top:3px;color:#98a2b3;font-size:9px}
.booking-room{display:block;color:#312e81;font-size:12px}
.booking-status-pill{display:inline-flex;padding:6px 9px;border-radius:999px;font-size:8px;font-weight:900;letter-spacing:.3px}
.booking-status-pill.pending{background:#fef3c7;color:#b45309}.booking-status-pill.confirmed{background:#e0e7ff;color:#4338ca}.booking-status-pill.completed{background:#dcfce7;color:#15803d}.booking-status-pill.cancelled{background:#fee2e2;color:#b91c1c}
.booking-actions{display:flex;gap:6px;align-items:center}
.booking-actions button,.ci-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;border:0;border-radius:9px;padding:8px 10px;color:#fff;font-size:8px;font-weight:900;cursor:pointer}
.approve-btn{background:linear-gradient(135deg,#16a34a,#059669);box-shadow:0 5px 12px rgba(16,185,129,.18)}
.deny-btn{background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 5px 12px rgba(239,68,68,.14)}
.ci-btn{background:linear-gradient(135deg,#2563eb,#4f46e5);box-shadow:0 6px 15px rgba(79,70,229,.22)}
.deny-small-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;border:0;border-radius:8px;padding:7px 8px;background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 4px 10px rgba(239,68,68,.14);color:#fff;font-size:7px;font-weight:900;cursor:pointer}
.completed-label,.denied-label{display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:900}.completed-label{color:#15803d}.denied-label{color:#b91c1c}
.booking-empty,.booking-ci-loading{min-height:210px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#667085;font-size:12px}.booking-empty span{font-size:10px;color:#98a2b3}
.spin{animation:bookingSpin .9s linear infinite}@keyframes bookingSpin{to{transform:rotate(360deg)}}
.booking-ci-top{margin-bottom:16px}
.booking-ci-notice.success{background:#ecfdf3;color:#166534}
.booking-ci-shell{overflow:hidden}
.booking-ci-banner{display:flex;align-items:center;gap:12px;padding:18px 20px;background:linear-gradient(100deg,#f8fafc,#eef2ff);border-bottom:1px solid #e8ecf5}
.booking-ci-banner-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:13px;background:#dcfce7;color:#15803d}
.booking-ci-banner span{display:block;color:#4338ca;font-size:8px;font-weight:900;letter-spacing:1px}.booking-ci-banner b{display:block;margin-top:3px;color:#172033;font-size:20px}.booking-ci-banner small{display:block;margin-top:2px;color:#98a2b3;font-size:9px}
.booking-ci-state{margin-left:auto;padding:8px 11px;border-radius:999px;background:#dcfce7;color:#15803d;font-size:8px;font-weight:900}
.booking-ci-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:14px;padding:16px}
.booking-ci-card{border:1px solid #e9edf4;border-radius:17px;padding:17px;background:#fff}
.booking-ci-summary{background:linear-gradient(145deg,#f8fafc,#eef2ff)}
.booking-ci-card-head{display:flex;align-items:center;gap:9px;margin-bottom:15px}.booking-ci-card-head h2{margin:0;font-size:14px;color:#172033}.booking-ci-card-head p{margin:3px 0 0;font-size:9px;color:#98a2b3}
.ci-card-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#dbeafe;color:#2563eb}.ci-card-icon.room{background:#ede9fe;color:#6d28d9}
.booking-fields{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.booking-fields label>span{display:block;margin-bottom:6px;color:#475467;font-size:9px;font-weight:800}
.ci-input{display:flex;align-items:center;gap:7px;border:1px solid #dce2ed;border-radius:11px;background:#fff;padding:0 10px;min-height:43px;transition:.18s}
.ci-input:focus-within{border-color:#818cf8;box-shadow:0 0 0 3px #eef2ff}
.ci-input svg{color:#94a3b8;flex:none}.ci-input input{width:100%;border:0;outline:0;background:transparent;color:#172033;font-size:12px;padding:10px 0;min-width:0}.ci-input em{font-style:normal;color:#98a2b3;font-size:9px}
.ci-room-preview{display:flex;align-items:center;justify-content:space-between;padding:14px;border-radius:13px;background:#fff;border:1px solid #e4e8f2;margin-bottom:11px}
.ci-room-preview small{display:block;color:#98a2b3;font-size:8px;font-weight:800}.ci-room-preview strong{display:block;margin-top:3px;color:#312e81;font-size:23px}.ci-room-preview>span{padding:6px 8px;border-radius:999px;background:#e0e7ff;color:#4338ca;font-size:8px;font-weight:900}
.ci-summary-row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #e7ebf3;font-size:10px}.ci-summary-row span{color:#98a2b3}.ci-summary-row b{color:#344054;text-align:right}
.ci-status-transition{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;padding:11px 8px;border-radius:11px;background:#fff;font-size:8px;font-weight:900;color:#64748b}.available-dot,.occupied-dot{width:8px;height:8px;border-radius:50%}.available-dot{background:#22c55e}.occupied-dot{background:#ef4444}.ci-status-transition b{color:#b91c1c}
.booking-ci-footer{display:flex;justify-content:flex-end;gap:9px;padding:14px 16px;background:#fbfcfe;border-top:1px solid #edf0f5}
.booking-cancel-btn{display:inline-flex;align-items:center;justify-content:center;padding:11px 20px;border:1px solid #dce2ed;border-radius:11px;background:#fff;color:#667085;font-size:10px;font-weight:800}
.booking-save-ci{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:190px;padding:12px 18px;border:0;border-radius:11px;background:linear-gradient(100deg,#2563eb,#4f46e5,#7c3aed);color:#fff;font-size:10px;font-weight:900;box-shadow:0 9px 22px rgba(79,70,229,.24);cursor:pointer}.booking-save-ci:disabled{opacity:.7;cursor:wait}
.booking-ci-error-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:50%;background:#fee2e2;color:#b91c1c;font-size:30px}
@media(max-width:900px){.booking-flow{grid-template-columns:repeat(3,minmax(0,1fr))}.booking-flow-arrow{display:none}.booking-ci-grid{grid-template-columns:1fr}.booking-ci-summary{order:2}}
@media(max-width:640px){.booking-premium,.booking-ci-premium{padding-bottom:20px}.booking-hero,.booking-ci-top{align-items:flex-start;flex-direction:column;padding:19px;border-radius:18px}.booking-hero h1,.booking-ci-top h1{font-size:25px}.booking-refresh,.booking-back-btn{width:100%}.booking-flow-card{padding:13px}.booking-flow{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.booking-flow-step{padding:8px}.booking-flow-step b{font-size:8px}.booking-flow-step small{font-size:6px}.booking-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.booking-stats button:last-child{grid-column:span 2}.booking-list-head{padding:15px}.booking-table{min-width:780px}.booking-ci-grid{padding:11px}.booking-fields{grid-template-columns:1fr}.booking-ci-banner{padding:15px}.booking-ci-banner b{font-size:18px}.booking-ci-state{font-size:7px}.booking-ci-footer{display:grid;grid-template-columns:1fr 1.5fr}.booking-cancel-btn,.booking-save-ci{width:100%}}
@media(max-width:390px){.booking-flow{grid-template-columns:1fr}.booking-stats{grid-template-columns:1fr}.booking-stats button:last-child{grid-column:auto}.booking-ci-card{padding:13px}}
`}</style>;
}
