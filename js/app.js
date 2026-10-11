/* ======================================================================
   VOLTX — client-side app (no backend; everything simulated in-browser)
   ====================================================================== */
const BRAND_LOGO_SRC = 'assets/logo.png';
const INDIA_MAP_SRC = 'assets/india-map.jpg';

/* ---------------------------- STATE ---------------------------- */
const state = {
  loggedIn:false,
  isDemo:false,
  name:'User',
  email:'',
  phone:'',
  currentView:'dashboard',
  profileStep:0,
  profileComplete:false,
  verifyComplete:false,
  eligibilityChecked:false,
  aadhaarVerified:false,
  docs:[],
  otpPending:''
};

const STEP_DEFS = [
  { key:'personal', title:'Personal Details', hint:'Name, DOB, Gender, Contact', fields:[
      {label:'Full Name', type:'text', ph:'Enter your full name', val:'Priya Sharma', full:true},
      {label:'Date of Birth', type:'date', ph:'', val:'1998-04-12'},
      {label:'Gender', type:'select', options:['Female','Male','Other'], val:'Female'},
      {label:'Mobile Number', type:'tel', ph:'+91 98765 43210', val:'+91 98765 43210'},
      {label:'Email ID (Optional)', type:'email', ph:'you@example.com', val:'priya.sharma@example.com'},
      {label:'Marital Status', type:'select', options:['Unmarried','Married','Other'], val:'Unmarried'},
      {label:'Aadhaar Number', type:'text', ph:'XXXX XXXX XXXX', val:'XXXX XXXX 4821', full:true},
  ]},
  { key:'family', title:'Family Details', hint:'Income, Members, Occupation', fields:[
      {label:'Annual Family Income (₹)', type:'text', ph:'e.g. 240000', val:'2,40,000'},
      {label:'Number of Dependents', type:'text', ph:'e.g. 3', val:'3'},
      {label:'Occupation', type:'text', ph:'e.g. Farmer, Student, Self-employed', val:'Student'},
      {label:"Father's / Guardian's Occupation", type:'text', ph:'', val:'Daily wage worker'},
  ]},
  { key:'education', title:'Education Details', hint:'Qualification, Institute, Year', fields:[
      {label:'Highest Qualification', type:'select', options:['12th pass','Undergraduate','Postgraduate','Diploma'], val:'Undergraduate'},
      {label:'Institute / College Name', type:'text', ph:'', val:'Govt. Degree College'},
      {label:'Year of Completion', type:'text', ph:'e.g. 2026', val:'2027 (expected)'},
      {label:'Course', type:'text', ph:'e.g. B.Sc, B.Com', val:'B.Sc Computer Science'},
  ]},
  { key:'location', title:'Location Details', hint:'State, District, Address', fields:[
      {label:'State', type:'text', ph:'', val:'Uttar Pradesh'},
      {label:'District', type:'text', ph:'', val:'Lucknow'},
      {label:'Pincode', type:'text', ph:'', val:'226001'},
      {label:'Full Address', type:'text', ph:'', val:'House 12, Sector 4', full:true},
  ]},
  { key:'additional', title:'Additional Info', hint:'Category, Religion, Bank Details', fields:[
      {label:'Category', type:'select', options:['General','OBC','SC','ST'], val:'General'},
      {label:'Religion (Optional)', type:'text', ph:'', val:'Hindu'},
      {label:'Bank Account Number', type:'text', ph:'', val:'XXXXXXXX2314'},
      {label:'IFSC Code', type:'text', ph:'', val:'SBIN0001234'},
  ]},
];

function docTemplate(status){
  return [
    {key:'identity', name:'Identity & DOB', desc:'Aadhaar Card / Voter ID / PAN Card + Date of Birth', status: status==='demo'?'verified':'notuploaded'},
    {key:'income', name:'Income Certificate', desc:'Income certificate from competent authority.', status: status==='demo'?'pending':'notuploaded'},
    {key:'caste', name:'Caste / Category Certificate', desc:'SC / ST / OBC / General certificate (as applicable).', status: status==='demo'?'verified':'notuploaded'},
    {key:'domicile', name:'Domicile / Residence Proof', desc:'Domicile certificate / Residence proof (state specific).', status: status==='demo'?'missing':'notuploaded'},
    {key:'education', name:'Education / Student Proof', desc:'Marksheet / Degree / Bonafide certificate.', status: status==='demo'?'pending':'notuploaded'},
    {key:'disability', name:'Disability Certificate', desc:'Disability certificate (if applicable).', status:'notuploaded'},
    {key:'bank', name:'Bank Account / Passbook', desc:'Cancelled cheque / Passbook (front page).', status: status==='demo'?'verified':'notuploaded'},
    {key:'other', name:'Other Certificate', desc:'Other relevant certificates (as required by schemes).', status: status==='demo'?'expired':'notuploaded'},
  ];
}

const DOC_STATUS_META = {
  verified:{ badge:'badge-green', label:'Verified', action:'View Details', actionFn:'viewDoc' },
  pending:{ badge:'badge-amber', label:'Uploaded · Verification Pending', action:'Replace', actionFn:'replaceDoc' },
  missing:{ badge:'badge-red', label:'Missing', action:'Upload', actionFn:'uploadDoc' },
  notuploaded:{ badge:'badge-gray', label:'Not Uploaded', action:'Upload', actionFn:'uploadDoc' },
  expired:{ badge:'badge-red', label:'Expired', action:'Replace', actionFn:'replaceDoc' },
};

const SCHEMES = [
  { id:'edu', name:'Education Support Scheme', group:'eligible', match:92, cats:['central','scholarship'],
    desc:'Financial support for higher education (tuition fees, etc).',
    why:[ ['Age: 18–25','yes'], ['State / Residence: your state matches','yes'], ['Income: below scheme limit','yes'], ['Category: General matches','yes'], ['Education: 12th pass or higher','yes'] ],
    verified:['Verified','Aadhaar','Income','Education'],
    docs:['Aadhaar Card','Income Certificate','12th Marksheet','Bank Passbook'],
    officialLink:'https://scholarships.gov.in',
    visitCenter:'Submit original documents at your nearest Common Service Centre (CSC) or District Education Office for final verification.' },
  { id:'health', name:'Health Support Scheme', group:'eligible', match:92, cats:['central','health'],
    desc:'Health insurance & medical support for eligible families.',
    why:[ ['Family income under ₹3,00,000 slab','yes'], ['Residency proof matches','yes'], ['No active conflicting health scheme found','yes'] ],
    verified:['Verified','Aadhaar','Income'],
    docs:['Aadhaar Card','Income Certificate','Ration Card'],
    officialLink:'https://pmjay.gov.in',
    visitCenter:'Visit your nearest Ayushman Bharat empanelled hospital or CSC to link Aadhaar and generate your e-health card.' },
  { id:'housing', name:'Housing Assistance', group:'eligible', match:76, cats:['state','housing'],
    desc:'Support for affordable housing / home construction.',
    why:[ ['Income within housing scheme limit','yes'], ['No existing house ownership on record','yes'], ['Residence proof pending final check','no'] ],
    verified:['Aadhaar','Income'],
    docs:['Aadhaar Card','Income Certificate','Residence Proof','Bank Passbook'],
    officialLink:'https://pmaymis.gov.in',
    visitCenter:'Visit your Gram Panchayat / Municipal office in person with originals for a site verification visit.' },
  { id:'pension', name:'Old Age Pension Top-up', group:'eligible', match:81, cats:['state'],
    desc:'Monthly pension top-up for eligible dependent family members.',
    why:[ ['Household includes an eligible dependent','yes'], ['State residency confirmed','yes'] ],
    verified:['Aadhaar','Residence'],
    docs:['Aadhaar Card','Age Proof','Bank Passbook'],
    officialLink:'https://nsap.nic.in',
    visitCenter:'Visit the Tehsil / Block Development Office nearest you to complete biometric verification in person.' },
  { id:'skill', name:'Skill Development Program', group:'eligible', match:70, cats:['central','employment'],
    desc:'Free vocational training with a placement guarantee.',
    why:[ ['Age within 18–35 bracket','yes'], ['Currently unemployed / student','yes'] ],
    verified:['Aadhaar'],
    docs:['Aadhaar Card','Education Certificate'],
    officialLink:'https://www.skillindia.gov.in',
    visitCenter:'Visit your nearest PMKVY Skill Centre in person to enroll and begin your training batch.' },

  { id:'intern', name:'PM Internship Scheme', group:'not', cats:['central','employment'],
    reason:'Income above scheme limit', desc:'Your annual family income is higher than the allowed limit for this scheme.',
    officialLink:'https://pminternship.mca.gov.in' },
  { id:'senior', name:'Senior Citizen Health Scheme', group:'not', cats:['state','health'],
    reason:'Age requirement not met', desc:'This scheme is for people aged 60 and above.' },
  { id:'travel', name:'State Travel Concession', group:'not', cats:['state'],
    reason:"Residence/state requirement doesn't match", desc:'This scheme is only for residents of specific states.' },
  { id:'women', name:'Women Entrepreneurship Scheme', group:'not', cats:['central','loans'],
    reason:'Already receiving a conflicting benefit', desc:'You are already enrolled in a similar benefit under another scheme.' },
];

const ATTENTION_ITEMS = [
  { title:'Income Certificate', body:'Income certificate not verified. Required for multiple schemes.' },
  { title:'Residence Proof', body:'Residence proof missing. Needed for state and housing schemes.' },
  { title:'Scholarship Application', body:"Scheme-specific question unanswered. Please answer the additional questions in your profile." },
];

/* ---------------------------- UTIL ---------------------------- */
function $(sel,ctx){ return (ctx||document).querySelector(sel); }
function $all(sel,ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }

function toast(msg,type){
  type = type||'success';
  const c = $('#toastContainer');
  const el = document.createElement('div');
  el.className='toast';
  const iconSvg = type==='success'
    ? '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>'
    : '<svg class="icon icon-sm" viewBox="0 0 24 24" style="color:#9db3ff"><path d="M12 8v4M12 16h.01"/><circle cx="12" cy="12" r="9"/></svg>';
  el.innerHTML = iconSvg + '<span>'+msg+'</span>';
  c.appendChild(el);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(),300); }, 3200);
}

function animateCount(el, target, opts){
  opts = opts||{};
  const dur = opts.duration||1100;
  const suffix = opts.suffix||'';
  const format = opts.format;
  const start = performance.now();
  function step(now){
    const p = Math.min(1,(now-start)/dur);
    const eased = 1-Math.pow(1-p,3);
    const val = Math.round(target*eased);
    el.textContent = (format ? val.toLocaleString('en-IN') : val) + suffix;
    if(p<1) requestAnimationFrame(step);
    else el.textContent = (format ? target.toLocaleString('en-IN') : target) + suffix;
  }
  requestAnimationFrame(step);
}

function setBrandAssets(){
  const aiFab = $('#aiFab');
  if(aiFab) aiFab.style.backgroundImage = `url("${BRAND_LOGO_SRC}")`;
  const mapImg = document.getElementById('indiaMapImg');
  if(mapImg) mapImg.src = INDIA_MAP_SRC;
}

/* ---------------------------- LANDING NAV ---------------------------- */
function scrollToSection(id){
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}
$all('.l-nav a').forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    $all('.l-nav a').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    scrollToSection(a.dataset.lnav);
  });
});

/* count-up for landing stats, once visible */
const statObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      $all('.stat-num').forEach(el=>{
        const count = el.dataset.count;
        const suffix = el.dataset.suffix||'';
        if(count==='0' && suffix==='AI'){ el.textContent='AI'; return; }
        animateCount(el, parseInt(count,10), {suffix, duration:1300});
      });
      statObserver.disconnect();
    }
  });
},{threshold:.4});

function toggleCaptcha(el, btnId){
  if(el.classList.contains('checked')) return;
  const spin = document.createElement('div');
  spin.className='captcha-spin';
  el.innerHTML='';
  el.appendChild(spin);
  setTimeout(()=>{
    el.classList.add('checked');
    el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
    const btn = document.getElementById(btnId);
    if(btn) btn.disabled = false;
  }, 700);
}

/* ---------------------------- LOGIN MODAL ---------------------------- */
function resetCaptchas(){
  $all('.captcha-check').forEach(c=>{ c.classList.remove('checked'); c.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>'; });
  ['emailSubmitBtn','otpVerifyBtn','govSubmitBtn'].forEach(id=>{ const b=document.getElementById(id); if(b) b.disabled = true; });
}
function openLogin(tab){
  $('#loginModal').classList.remove('hidden');
  setLoginTab(tab||'email');
  resetCaptchas();
}
function closeLogin(){ $('#loginModal').classList.add('hidden'); }
function setLoginTab(tab){
  $all('.login-tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
  $all('.login-panel').forEach(p=>p.classList.toggle('active', p.dataset.panel===tab));
}

function submitEmailLogin(){
  const email = $('#emailInput').value.trim();
  if(!email){ toast('Please enter your email address.','info'); return; }
  const btn = $('#emailSubmitBtn');
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Signing in…';
  btn.disabled = true;
  setTimeout(()=>{
    btn.innerHTML = original; btn.disabled = false;
    state.name = email.split('@')[0].split('.').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
    state.email = email;
    loginSuccess(false);
  }, 900);
}

let resendInterval=null;
function sendOtp(){
  const phone = $('#phoneInput').value.trim();
  if(!phone){ toast('Please enter your mobile number.','info'); return; }
  const btn = $('#sendOtpBtn');
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Sending…';
  btn.disabled = true;
  setTimeout(()=>{
    btn.innerHTML = original; btn.disabled = false;
    $('#phoneStep1').classList.add('hidden');
    $('#phoneStep2').classList.remove('hidden');
    $all('.otp-boxes input').forEach(i=>i.value='');
    $('.otp-boxes input').focus();
    toast('OTP sent to '+phone,'success');
    startResendTimer();
  }, 900);
}
function startResendTimer(){
  let t = 30;
  const resendBtn = $('#resendBtn');
  resendBtn.disabled = true;
  $('#resendTimerText').classList.remove('hidden');
  clearInterval(resendInterval);
  resendInterval = setInterval(()=>{
    t--;
    $('#resendTimer').textContent = t+'s';
    if(t<=0){
      clearInterval(resendInterval);
      $('#resendTimerText').classList.add('hidden');
      resendBtn.disabled=false;
    }
  },1000);
}
function otpMove(el){
  el.value = el.value.replace(/[^0-9]/g,'');
  if(el.value && el.nextElementSibling) el.nextElementSibling.focus();
}
function verifyOtp(){
  const vals = $all('.otp-boxes input').map(i=>i.value);
  if(vals.some(v=>!v)){ toast('Please enter the complete 4-digit OTP.','info'); return; }
  state.name = 'Rahul Verma';
  state.phone = $('#phoneInput').value.trim();
  loginSuccess(false);
}
function startDemo(){
  state.isDemo = true;
  state.name = 'Priya Sharma';
  state.email = 'priya.sharma@example.com';
  loginSuccess(true);
}

function loginSuccess(isDemo){
  state.loggedIn = true;
  state.isDemo = !!isDemo;
  closeLogin();
  $('#landing').classList.add('hidden');
  $('#appShell').classList.remove('hidden');

  const initials = state.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  $('#userAvatar').textContent = initials;
  $('#userChipName').textContent = 'Hi, '+state.name.split(' ')[0];
  $('#settingsName').textContent = state.name;
  $('#settingsContact').textContent = state.email || state.phone || 'Signed in';

  if(isDemo){
    state.profileComplete = true;
    state.verifyComplete = true;
    state.eligibilityChecked = true;
    state.aadhaarVerified = true;
    state.docs = docTemplate('demo');
    $('#dashHeroTitle').textContent = 'Welcome back, '+state.name.split(' ')[0];
    $('#dashHeroSub').textContent = "You're likely eligible for 5 schemes. Here's your full picture, ready to explore.";
    $('#appsEmpty').classList.add('hidden');
    $('#appsList').classList.remove('hidden');
  } else {
    state.docs = docTemplate('new');
    $('#dashHeroTitle').textContent = 'Welcome, '+state.name.split(' ')[0];
    $('#dashHeroSub').textContent = 'Your profile is on its way — complete it to unlock every scheme you qualify for.';
  }
  renderDocs();
  updateDashboardStats();
  renderActivity();
  buildStepper();
  renderWizardStep();
  toast('Signed in successfully. Welcome to VoltX!','success');
  goView('dashboard');
}

function logout(){
  state.loggedIn=false; state.isDemo=false; state.profileComplete=false; state.verifyComplete=false;
  state.eligibilityChecked=false; state.aadhaarVerified=false; state.profileStep=0;
  $('#appShell').classList.add('hidden');
  $('#landing').classList.remove('hidden');
  $('#schemesResults').classList.add('hidden');
  $('#schemesChecking').classList.add('hidden');
  $('#schemesLocked').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
  toast('You have been logged out.','info');
}

/* ---------------------------- NAVIGATION ---------------------------- */
const VIEW_TITLES = {
  dashboard:['Dashboard','Welcome back'],
  schemes:['Find Schemes','Your eligibility results'],
  applications:['My Applications','Track every scheme you apply to'],
  profile:['Profile','Build and manage your citizen profile'],
  verify:['Verify Details','Confirm your identity and documents'],
  documents:['Documents','Manage your certificates & uploads'],
  idservices:['ID Services','Apply for or update your government IDs'],
  settings:['Settings','Account and preferences'],
};
function goView(name){
  state.currentView = name;
  $all('.view').forEach(v=>v.classList.add('hidden'));
  $('#view-'+name).classList.remove('hidden');
  $all('.sb-link').forEach(l=>l.classList.toggle('active', l.dataset.view===name));
  $('#topbarTitle').innerHTML = VIEW_TITLES[name][0] + '<span>'+VIEW_TITLES[name][1]+'</span>';
  closeAllDropdowns();

  if(name==='schemes'){
    if(state.eligibilityChecked){
      $('#schemesLocked').classList.add('hidden');
      $('#schemesChecking').classList.add('hidden');
      $('#schemesResults').classList.remove('hidden');
      renderSchemes();
      animateSchemeSummary();
    } else {
      $('#schemesResults').classList.add('hidden');
      $('#schemesChecking').classList.add('hidden');
      $('#schemesLocked').classList.remove('hidden');
    }
  }
  document.getElementById('content') && document.getElementById('content').scrollTo({top:0,behavior:'smooth'});
}
function goSchemesFiltered(category){
  goView('schemes');
  if(!state.eligibilityChecked) return;
  activeFilter = category;
  setTimeout(()=>{
    $all('#filterTabs .pill-tab').forEach(b=>b.classList.toggle('active', b.dataset.filter===category));
    renderSchemes();
  }, 50);
}

/* ---------------------------- DASHBOARD ---------------------------- */
function docsCompleteness(){
  const weights = {verified:1, pending:.6, missing:0, notuploaded:0, expired:.15};
  const total = state.docs.length || 1;
  const sum = state.docs.reduce((a,d)=>a+(weights[d.status]||0),0);
  return Math.round((sum/total)*100);
}
function updateDashboardStats(){
  const pct = docsCompleteness();
  animateCount($('#dashSchemesChecked'), state.eligibilityChecked?12:0);
  animateCount($('#dashEligible'), state.eligibilityChecked?5:0);
  const attentionCount = state.docs.filter(d=>d.status!=='verified').length;
  animateCount($('#dashAttention'), state.eligibilityChecked ? 3 : attentionCount);
  $('#dashDocsPct').textContent = pct+'%';
  $('#sbDocBadge').textContent = attentionCount;
  $('#sbFootText').innerHTML = state.isDemo ? 'More Schemes.<br>Better Future.' : 'Better Information.<br>Bigger Opportunities.';
}
function renderActivity(){
  const items = state.isDemo ? [
    {ic:'✓', bg:'var(--green-50)', col:'var(--green-600)', title:'Health Support Scheme marked eligible', time:'2 hours ago'},
    {ic:'↑', bg:'var(--blue-50)', col:'var(--blue-600)', title:'Income Certificate uploaded', time:'Yesterday'},
    {ic:'!', bg:'var(--amber-50)', col:'var(--amber-600)', title:'Residence proof still missing', time:'2 days ago'},
    {ic:'✓', bg:'var(--green-50)', col:'var(--green-600)', title:'Aadhaar identity verified', time:'4 days ago'},
  ] : [
    {ic:'👋', bg:'var(--blue-50)', col:'var(--blue-600)', title:'Welcome to VoltX — let\'s build your profile', time:'Just now'},
  ];
  $('#activityList').innerHTML = items.map(i=>`
    <div class="activity-item">
      <div class="activity-ic" style="background:${i.bg};color:${i.col};font-weight:800;">${i.ic}</div>
      <div><p class="a-title">${i.title}</p><p class="a-time">${i.time}</p></div>
    </div>`).join('');
}

/* ---------------------------- PROFILE WIZARD ---------------------------- */
function buildStepper(){
  $('#stepperList').innerHTML = STEP_DEFS.map((s,i)=>{
    const done = state.profileComplete || i < state.profileStep;
    const current = !state.profileComplete && i===state.profileStep;
    return `<div class="step-item ${done?'done':''} ${current?'current':''}">
      <div class="dot">${done?'✓':(i+1)}</div>
      <div><strong>${s.title}</strong><span>${s.hint}</span></div>
    </div>`;
  }).join('');
}
function renderWizardStep(){
  if(state.profileComplete){
    $('#profileWizard').classList.add('hidden');
    $('#profileDone').classList.remove('hidden');
    return;
  }
  $('#profileWizard').classList.remove('hidden');
  $('#profileDone').classList.add('hidden');
  const step = STEP_DEFS[state.profileStep];
  $('#wizardPanel').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div><h3>${step.title}</h3><p class="wsub">Tell us about ${step.key==='personal'?'yourself':step.key}</p></div>
      <span class="badge badge-blue">Step ${state.profileStep+1} of ${STEP_DEFS.length}</span>
    </div>
    <div class="wform">
      ${step.fields.map((f,i)=>`
        <div class="${f.full?'full':''}">
          <label class="f-label">${f.label}</label>
          ${f.type==='select'
            ? `<select class="field no-icon" data-fi="${i}">${f.options.map(o=>`<option ${o===f.val?'selected':''}>${o}</option>`).join('')}</select>`
            : `<input class="field no-icon" type="${f.type}" placeholder="${f.ph}" value="${f.val}" data-fi="${i}">`
          }
        </div>`).join('')}
    </div>
    <div class="wizard-actions">
      <button class="btn btn-outline" ${state.profileStep===0?'disabled':''} onclick="prevStep()"><svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back</button>
      <button class="btn btn-primary" onclick="nextStep()">${state.profileStep===STEP_DEFS.length-1?'Finish':'Next'} <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
    </div>
  `;
  const infoCopy = {
    personal:['Personal Info','Identity & basic verification'],
    family:['Family Details','Income & dependent members'],
    education:['Education Details','Eligibility for scholarships & loans'],
    location:['Location Details','State & district based schemes'],
    additional:['Additional Info','Category, religion, bank details'],
  };
  $('#infoPanel').innerHTML = `
    <h4>Why we need this</h4>
    <ul class="info-list">
      <li><div class="ic"><svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"/></svg></div><div><strong>${infoCopy[step.key][0]}</strong><span>${infoCopy[step.key][1]}</span></div></li>
      <li><div class="ic"><svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></div><div><strong>Better scheme matching</strong><span>These details help us match you with the right government schemes.</span></div></li>
    </ul>
    <div class="privacy-note"><svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg> Your data is encrypted, secure and used only for scheme eligibility checks.</div>
  `;
  buildStepper();
}
function collectStepValues(){
  const step = STEP_DEFS[state.profileStep];
  $all('[data-fi]').forEach(el=>{
    const i = parseInt(el.dataset.fi,10);
    step.fields[i].val = el.value;
  });
}
function nextStep(){
  collectStepValues();
  if(state.profileStep < STEP_DEFS.length-1){
    state.profileStep++;
    renderWizardStep();
  } else {
    state.profileComplete = true;
    const nameField = STEP_DEFS[0].fields.find(f=>f.label==='Full Name');
    if(nameField && nameField.val){
      state.name = nameField.val;
      $('#userChipName').textContent = 'Hi, '+state.name.split(' ')[0];
      $('#userAvatar').textContent = state.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      $('#settingsName').textContent = state.name;
      $('#dashHeroTitle').textContent = 'Welcome, '+state.name.split(' ')[0];
    }
    renderWizardStep();
    toast('Profile completed! Let\'s verify your documents next.','success');
  }
}
function prevStep(){
  if(state.profileStep>0){ collectStepValues(); state.profileStep--; renderWizardStep(); }
}
function reviewProfile(){
  state.profileComplete = false;
  state.profileStep = 0;
  renderWizardStep();
}

/* ---------------------------- VERIFY DETAILS ---------------------------- */
function verifyAadhaar(){
  if(!$('#aadhaarConsent').checked){ toast('Please give consent to verify with Aadhaar.','info'); return; }
  const btn = $('#aadhaarBtn');
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Verifying…';
  btn.disabled = true;
  setTimeout(()=>{
    state.aadhaarVerified = true;
    $('#aadhaarStatus').className='badge badge-green';
    $('#aadhaarStatus').textContent='Verified';
    btn.outerHTML = '<button class="btn btn-outline btn-sm" disabled style="opacity:.7;">✓ Identity Verified</button>';
    toast('Aadhaar verified successfully.','success');
    const doc = state.docs.find(d=>d.key==='identity');
    if(doc){ doc.status='verified'; renderDocs(); updateDashboardStats(); }
  }, 1100);
}

/* ---------------------------- ELIGIBILITY CHECK ---------------------------- */
function startEligibilityCheck(){
  if(state.eligibilityChecked) return;
  $('#schemesLocked').classList.add('hidden');
  $('#schemesResults').classList.add('hidden');
  $('#schemesChecking').classList.remove('hidden');
  const texts = [
    'Matching your profile with 500+ schemes…',
    'Checking income & category rules…',
    'Verifying location & residency match…',
    'Finalising your personalised results…'
  ];
  let pct = 0;
  const bar = $('#checkingBar'); const pctEl=$('#checkingPct'); const titleEl=$('#checkingTitle');
  const timer = setInterval(()=>{
    pct += Math.random()*18+8;
    if(pct>100) pct=100;
    bar.style.width = pct+'%';
    pctEl.textContent = Math.round(pct)+'%';
    titleEl.textContent = texts[Math.min(texts.length-1, Math.floor(pct/26))];
    if(pct>=100){
      clearInterval(timer);
      setTimeout(()=>{
        state.eligibilityChecked = true;
        state.profileComplete = true;
        state.verifyComplete = true;
        $('#schemesChecking').classList.add('hidden');
        $('#schemesResults').classList.remove('hidden');
        renderSchemes();
        animateSchemeSummary();
        updateDashboardStats();
        toast('Eligibility check complete — 5 schemes matched!','success');
      }, 450);
    }
  }, 220);
}
function animateSchemeSummary(){
  $all('#schemesResults .num[data-count]').forEach(el=>{
    animateCount(el, parseInt(el.dataset.count,10), {duration:1000});
  });
  const pct = 92;
  $('#matchDonut').style.background = `conic-gradient(#3457ff ${pct}%, #eef0f7 ${pct}%)`;
  animateCount($('#matchPctNum'), pct, {suffix:'%', duration:1200});
}

/* filters + search + render columns */
let activeFilter = 'all';
$('#filterTabs') && $('#filterTabs').addEventListener('click',(e)=>{
  const btn = e.target.closest('.pill-tab');
  if(!btn) return;
  $all('.pill-tab', $('#filterTabs')).forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.filter;
  renderSchemes();
});

function schemeCardHTML(s, idx){
  if(s.group==='eligible'){
    return `<div class="card scheme-card reveal" style="animation-delay:${idx*.04}s" onclick="toggleSchemeDetail('${s.id}')">
      <div class="sc-top"><h4>${s.name}</h4><span class="badge badge-green">Likely eligible</span></div>
      <div class="match-pct">${s.match}% profile match</div>
      <div class="progress"><span style="width:${s.match}%"></span></div>
      <p class="desc">${s.desc}</p>
      <button class="btn btn-primary btn-sm btn-block" onclick="event.stopPropagation();goView('applications');toast('Application started for ${s.name}.','success')">View eligibility &amp; apply</button>
      <div class="scheme-detail" id="detail-${s.id}">
        <strong style="font-size:12px;color:var(--text-700);">Why you match</strong>
        <div style="margin-top:6px;">
          ${s.why.map(w=>`<div class="match-row ${w[1]==='no'?'no':''}"><svg class="icon icon-sm" viewBox="0 0 24 24">${w[1]==='no'?'<path d="M18 6L6 18M6 6l12 12"/>':'<path d="M20 6L9 17l-5-5"/>'}</svg> ${w[0]}</div>`).join('')}
        </div>
        <div class="verify-chip-grid">
          ${s.verified.map(v=>`<div class="verify-chip"><svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> ${v}</div>`).join('')}
        </div>
        <strong style="font-size:12px;color:var(--text-700);display:block;margin-top:12px;">Documents required</strong>
        <div class="doc-required-list">${s.docs.map(d=>`<span class="doc-required-chip">${d}</span>`).join('')}</div>
        <div class="visit-center-box"><strong>📍 In-person step required</strong>${s.visitCenter}</div>
        <a href="${s.officialLink}" target="_blank" rel="noopener" class="gov-link-row" onclick="event.stopPropagation()">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/></svg>
          View this scheme on the official government website
        </a>
      </div>
    </div>`;
  }
  return `<div class="card scheme-card reveal" style="animation-delay:${idx*.04}s" onclick="toggleSchemeDetail('${s.id}')">
    <div class="sc-top"><h4>${s.name}</h4><span class="badge badge-red">Not eligible</span></div>
    <div class="reason">${s.reason}</div>
    <p class="desc" style="margin-bottom:2px;">${s.desc}</p>
    <div class="scheme-detail" id="detail-${s.id}">
      <p style="font-size:12px;color:var(--text-500);line-height:1.6;">Not eligible means you don't meet the current scheme criteria based on your available information. You can check again later if your profile changes.</p>
      <button class="btn btn-outline btn-sm" style="margin-top:10px;" onclick="event.stopPropagation();openChat();sendSuggested('Why am I not eligible for ${s.name}?')">Ask AI why</button>
      ${s.officialLink ? `<a href="${s.officialLink}" target="_blank" rel="noopener" class="gov-link-row" onclick="event.stopPropagation()"><svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/></svg> View this scheme on the official government website</a>` : ''}
    </div>
  </div>`;
}

function renderSchemes(){
  const q = ($('#schemeSearch')?.value||'').toLowerCase();
  const filtered = SCHEMES.filter(s=> (activeFilter==='all' || s.cats.includes(activeFilter)) && s.name.toLowerCase().includes(q) );
  const eligible = filtered.filter(s=>s.group==='eligible');
  const not = filtered.filter(s=>s.group==='not');

  $('#colEligible').innerHTML = eligible.map((s,i)=>schemeCardHTML(s,i)).join('') || `<p style="font-size:12.5px;color:var(--text-400);padding:14px;">No matching schemes in this category.</p>`;
  $('#colNot').innerHTML = not.map((s,i)=>schemeCardHTML(s,i)).join('') || `<p style="font-size:12.5px;color:var(--text-400);padding:14px;">No matching schemes in this category.</p>`;
  $('#cntEligible').textContent = eligible.length;
  $('#cntNot').textContent = not.length;

  $('#colAttention').innerHTML = ATTENTION_ITEMS.map((a,i)=>`
    <div class="card scheme-card reveal" style="animation-delay:${i*.04}s;cursor:default;">
      <div class="sc-top"><h4 style="font-size:13.8px;">${a.title}</h4><span class="badge badge-amber">Action needed</span></div>
      <p class="desc">${a.body}</p>
      <button class="btn btn-outline btn-sm btn-block" onclick="goView('documents')">Fix now</button>
    </div>`).join('');
  $('#cntAttention').textContent = ATTENTION_ITEMS.length;
}
function toggleSchemeDetail(id){
  const el = document.getElementById('detail-'+id);
  if(el) el.classList.toggle('open');
}

/* ---------------------------- DOCUMENTS ---------------------------- */
function renderDocs(){
  $('#docGrid').innerHTML = state.docs.map((d,i)=>{
    const meta = DOC_STATUS_META[d.status];
    return `<div class="card doc-card reveal" style="animation-delay:${i*.03}s">
      <div class="dc-top"><div class="ic"><svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></div><span class="badge ${meta.badge}">${meta.label}</span></div>
      <h4>${d.name}</h4>
      <p>${d.desc}</p>
      <button class="btn btn-outline btn-sm btn-block" onclick="${meta.actionFn}('${d.key}')">${meta.action}</button>
    </div>`;
  }).join('');
  const pct = docsCompleteness();
  $('#docsProgressBar').style.width = pct+'%';
  $('#docsPctText').textContent = pct+'%';
}
function viewDoc(key){ toast('Opening document preview…','info'); }
function uploadDoc(key){ triggerUpload(key); }
function replaceDoc(key){ triggerUpload(key); }
let pendingUploadKey = null;
function triggerUpload(key){
  pendingUploadKey = key||null;
  $('#fileInputHidden').value='';
  $('#fileInputHidden').click();
}
function handleGenericUpload(){
  const key = pendingUploadKey;
  setTimeout(()=>{
    if(key){
      const doc = state.docs.find(d=>d.key===key);
      if(doc){ doc.status='pending'; }
      toast('Document uploaded — verification pending.','success');
    } else {
      toast('Document uploaded successfully.','success');
    }
    renderDocs();
    updateDashboardStats();
    pendingUploadKey=null;
  }, 400);
}
function connectDigilocker(){
  const btn = $('#digilockerBtn');
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="spinner dark"></span> Connecting…';
  btn.disabled = true;
  setTimeout(()=>{
    btn.innerHTML = original; btn.disabled=false;
    let fixed = 0;
    state.docs.forEach(d=>{ if((d.status==='notuploaded'||d.status==='missing') && fixed<2){ d.status='verified'; fixed++; } });
    renderDocs();
    updateDashboardStats();
    toast('DigiLocker connected — '+fixed+' documents verified automatically.','success');
  }, 1300);
}

/* ---------------------------- DROPDOWNS / SWITCHES ---------------------------- */
function closeAllDropdowns(){ $all('.dropdown').forEach(d=>d.classList.add('hidden')); }
function toggleDropdown(id){
  const el = document.getElementById(id);
  const willOpen = el.classList.contains('hidden');
  closeAllDropdowns();
  if(willOpen) el.classList.remove('hidden');
}
document.addEventListener('click',(e)=>{
  if(!e.target.closest('.user-chip') && !e.target.closest('.icon-btn') && !e.target.closest('.dropdown')){
    closeAllDropdowns();
  }
});
function toggleSwitch(el){ el.classList.toggle('on'); }

/* ---------------------------- AI CHAT ---------------------------- */
let chatOpened = false;
function openChat(){
  $('#aiChat').classList.remove('hidden');
  if(!chatOpened){
    chatOpened = true;
    addMsg("Hi! I'm the VoltX AI assistant. I can help with scheme eligibility, missing documents, or your application status. What would you like to know?", 'bot');
  }
}
function toggleChat(){
  $('#aiChat').classList.contains('hidden') ? openChat() : $('#aiChat').classList.add('hidden');
}
function addMsg(text, who){
  const body = $('#chatBody');
  const div = document.createElement('div');
  div.className = 'msg '+who;
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}
function sendSuggested(text){
  $('#chatInput').value = text;
  sendChat();
}
function sendChat(){
  const input = $('#chatInput');
  const text = input.value.trim();
  if(!text) return;
  addMsg(text,'user');
  input.value='';
  const body = $('#chatBody');
  const typingEl = document.createElement('div');
  typingEl.className='msg bot';
  typingEl.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  body.appendChild(typingEl);
  body.scrollTop = body.scrollHeight;
  setTimeout(()=>{
    typingEl.remove();
    addMsg(botAnswer(text), 'bot');
  }, 750+Math.random()*500);
}
function botAnswer(raw){
  const t = raw.toLowerCase();
  if(t.includes('document') || t.includes('upload')){
    const missing = state.docs.filter(d=>d.status!=='verified').map(d=>d.name);
    if(missing.length===0) return "All your documents are verified — nice work! You're in great shape for every matching scheme.";
    return "Based on your profile, these documents still need attention: "+missing.join(', ')+". You can upload or replace them from the Documents tab.";
  }
  if(t.includes('education support')){
    return "The Education Support Scheme covers tuition fees for eligible students. You currently show a 92% profile match — mainly based on your age, income and education level. Your income certificate is still awaiting verification, so keep that updated.";
  }
  if(t.includes('health support') || (t.includes('health') && t.includes('scheme'))){
    return "The Health Support Scheme provides health insurance and medical support for eligible families. You match on income and residency — no action needed right now.";
  }
  if(t.includes('housing')){
    return "Housing Assistance supports affordable housing and home construction. You're at 76% match — your residence proof is still pending, which is holding back full confirmation.";
  }
  if(t.includes('aadhaar') || t.includes('otp')){
    return "To verify your Aadhaar: go to Verify Details, tick the consent checkbox, then tap 'Verify with OTP'. We'll confirm it instantly once you continue.";
  }
  if(t.includes('why') && (t.includes('not eligible') || t.includes('rejected'))){
    return "Schemes marked 'Not eligible' usually fail on one specific rule — often income limits, age brackets, or an overlapping benefit you already receive. Tap 'See full criteria' on the scheme card for the exact reason.";
  }
  if(t.includes('eligible') || t.includes('eligibility')){
    return "You're currently likely eligible for 5 schemes, including the Education Support Scheme and Health Support Scheme. Open Find Schemes to see the full breakdown and what's needed for the rest.";
  }
  if(t.includes('application') || t.includes('status') || t.includes('track')){
    return "You can track every scheme you've applied to under My Applications — it shows each one's stage from Applied to Disbursed.";
  }
  if(t.includes('income certificate')){
    return "Your Income Certificate is uploaded but still awaiting verification. Once it clears, it'll unlock a few schemes that currently show 'needs attention'.";
  }
  if(t.includes('hi') || t.includes('hello') || t.includes('hey')){
    return "Hello! Ask me about a specific scheme, a required document, or your application status and I'll do my best to help.";
  }
  return "I can help with scheme eligibility, required documents, or your application status. Try asking about a specific scheme by name, like \"Am I eligible for the Housing Assistance scheme?\"";
}

/* ---------------------------- GOVERNMENT DASHBOARD DATA ---------------------------- */
state.gov = { loggedIn:false, name:'', dept:'', applications:[] };
let govAppFilter = 'all';
let activeZone = null;

const APPLICATIONS_SEED = [
  {id:1, name:'Ananya Iyer', scheme:'Education Support Scheme', state:'Tamil Nadu', region:'south', date:'18 Sep 2026', income:'₹1,85,000', docs:'4/4', status:'pending'},
  {id:2, name:'Rohit Sharma', scheme:'Housing Assistance', state:'Maharashtra', region:'west', date:'18 Sep 2026', income:'₹2,40,000', docs:'3/4', status:'pending'},
  {id:3, name:'Fatima Sheikh', scheme:'Health Support Scheme', state:'West Bengal', region:'east', date:'17 Sep 2026', income:'₹1,10,000', docs:'4/4', status:'pending'},
  {id:4, name:'Karan Mehta', scheme:'Skill Development Program', state:'Gujarat', region:'west', date:'17 Sep 2026', income:'₹95,000', docs:'2/4', status:'pending'},
  {id:5, name:'Lakshmi Reddy', scheme:'Old Age Pension Top-up', state:'Andhra Pradesh', region:'south', date:'16 Sep 2026', income:'₹60,000', docs:'4/4', status:'pending'},
  {id:6, name:'Devendra Yadav', scheme:'PM Internship Scheme', state:'Uttar Pradesh', region:'central', date:'16 Sep 2026', income:'₹3,80,000', docs:'4/4', status:'pending'},
  {id:7, name:'Meera Joshi', scheme:'Old Age Pension Top-up', state:'Madhya Pradesh', region:'central', date:'19 Sep 2026', income:'₹55,000', docs:'4/4', status:'pending'},
  {id:8, name:'Iqbal Khan', scheme:'PM Internship Scheme', state:'Bihar', region:'east', date:'19 Sep 2026', income:'₹1,00,000', docs:'3/4', status:'pending'},
  {id:9, name:'Priya Nair', scheme:'Education Support Scheme', state:'Kerala', region:'south', date:'15 Sep 2026', income:'₹1,40,000', docs:'4/4', status:'approved'},
  {id:10, name:'Suresh Patil', scheme:'Housing Assistance', state:'Maharashtra', region:'west', date:'14 Sep 2026', income:'₹2,10,000', docs:'4/4', status:'approved'},
  {id:11, name:'Neha Verma', scheme:'Health Support Scheme', state:'Rajasthan', region:'north', date:'14 Sep 2026', income:'₹4,50,000', docs:'3/4', status:'rejected', reason:'Income above scheme limit'},
  {id:12, name:'Arjun Das', scheme:'Skill Development Program', state:'Assam', region:'northeast', date:'13 Sep 2026', income:'₹1,20,000', docs:'2/4', status:'rejected', reason:'Missing or unclear documents'},
];

const ZONES = [
  { key:'north', name:'North India', states:[
      {name:'Delhi', count:41200},{name:'Punjab', count:52300},{name:'Haryana', count:48900},
      {name:'Himachal Pradesh', count:18400},{name:'Jammu & Kashmir', count:22100},
      {name:'Uttarakhand', count:19800},{name:'Chandigarh', count:6100} ] },
  { key:'west', name:'West India', states:[
      {name:'Maharashtra', count:156800},{name:'Gujarat', count:89400},{name:'Rajasthan', count:97600},
      {name:'Goa', count:8900},{name:'Dadra & Nagar Haveli', count:3200} ] },
  { key:'south', name:'South India', states:[
      {name:'Tamil Nadu', count:112400},{name:'Karnataka', count:98700},{name:'Andhra Pradesh', count:86300},
      {name:'Telangana', count:71200},{name:'Kerala', count:64900},{name:'Puducherry', count:6200} ] },
  { key:'east', name:'East India', states:[
      {name:'West Bengal', count:104300},{name:'Odisha', count:68900},{name:'Jharkhand', count:41700},
      {name:'Bihar', count:89600} ] },
  { key:'central', name:'Central India', states:[
      {name:'Uttar Pradesh', count:198700},{name:'Madhya Pradesh', count:76400},{name:'Chhattisgarh', count:34200} ] },
  { key:'northeast', name:'Northeast India', states:[
      {name:'Assam', count:38200},{name:'Meghalaya', count:6800},{name:'Manipur', count:5100},
      {name:'Mizoram', count:3400},{name:'Nagaland', count:4200},{name:'Tripura', count:7600},
      {name:'Arunachal Pradesh', count:4900},{name:'Sikkim', count:2100} ] },
];

const SCHEME_USAGE = {
  national:[ {name:'Education Support Scheme', pct:32}, {name:'Health Support Scheme', pct:27}, {name:'Housing Assistance', pct:19}, {name:'Old Age Pension Top-up', pct:14}, {name:'Skill Development Program', pct:8} ],
  north:[ {name:'Housing Assistance', pct:36}, {name:'Health Support Scheme', pct:29}, {name:'Education Support Scheme', pct:21}, {name:'PM Internship Scheme', pct:14} ],
  west:[ {name:'Housing Assistance', pct:41}, {name:'Education Support Scheme', pct:26}, {name:'Skill Development Program', pct:19}, {name:'Health Support Scheme', pct:14} ],
  south:[ {name:'Education Support Scheme', pct:38}, {name:'Health Support Scheme', pct:33}, {name:'Old Age Pension Top-up', pct:17}, {name:'Housing Assistance', pct:12} ],
  east:[ {name:'Health Support Scheme', pct:35}, {name:'Education Support Scheme', pct:30}, {name:'PM Internship Scheme', pct:20}, {name:'Housing Assistance', pct:15} ],
  central:[ {name:'PM Internship Scheme', pct:30}, {name:'Old Age Pension Top-up', pct:28}, {name:'Education Support Scheme', pct:24}, {name:'Health Support Scheme', pct:18} ],
  northeast:[ {name:'Skill Development Program', pct:34}, {name:'Health Support Scheme', pct:28}, {name:'Education Support Scheme', pct:23}, {name:'Housing Assistance', pct:15} ],
};

const GOV_SCHEMES = [
  {name:'Education Support Scheme', category:'Scholarship', apps: 5400, active:true},
  {name:'Health Support Scheme', category:'Health', apps: 4700, active:true},
  {name:'Housing Assistance', category:'Housing', apps: 3200, active:true},
  {name:'Old Age Pension Top-up', category:'Welfare', apps: 2100, active:true},
  {name:'Skill Development Program', category:'Employment', apps: 1800, active:true},
  {name:'PM Internship Scheme', category:'Employment', apps: 2600, active:false},
];

function getAllStatesFlat(){
  let arr=[];
  ZONES.forEach(z=> z.states.forEach(s=> arr.push({...s, region:z.key, regionName:z.name})));
  return arr;
}

/* ---------------------------- GOVERNMENT LOGIN ---------------------------- */
function openGovLogin(){ $('#govLoginModal').classList.remove('hidden'); setGovTab('id'); resetCaptchas(); }
function closeGovLogin(){ $('#govLoginModal').classList.add('hidden'); }
function setGovTab(tab){
  $all('#govLoginModal .login-tab').forEach(t=>t.classList.toggle('active', t.dataset.gtab===tab));
  $all('#govLoginModal .login-panel').forEach(p=>p.classList.toggle('active', p.dataset.gpanel===tab));
}
function submitGovLogin(){
  const dept = $('#govDept').value;
  const id = $('#govIdInput').value.trim() || 'GOV-00000';
  const btn = event.currentTarget;
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Verifying…';
  btn.disabled = true;
  setTimeout(()=>{
    btn.innerHTML = original; btn.disabled = false;
    govLoginSuccess(false, dept, id);
  }, 900);
}
function startGovDemo(){ govLoginSuccess(true, 'Ministry of Rural Development', 'GOV-48213'); }

function govLoginSuccess(isDemo, dept, empId){
  state.gov.loggedIn = true;
  state.gov.isDemo = !!isDemo;
  state.gov.name = isDemo ? 'Arjun Verma' : ('Officer '+empId);
  state.gov.dept = dept;
  state.gov.applications = APPLICATIONS_SEED.map(a=>({...a}));
  closeGovLogin();
  $('#landing').classList.add('hidden');
  $('#govAppShell').classList.remove('hidden');

  const initials = state.gov.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  $('#govUserAvatar').textContent = initials;
  $('#govUserChipName').textContent = 'Hi, '+state.gov.name.split(' ')[0];
  $('#govHeroTitle').textContent = 'Welcome back, '+state.gov.name.split(' ')[0];
  $('#govSettingsName').textContent = state.gov.name;
  $('#govSettingsDept').textContent = dept;

  updateGovStats();
  renderGovDashboardPreview();
  renderGovSchemes();
  goGovView('dashboard');
  toast('Signed in to VoltX Gov.','success');
}
function govLogout(){
  state.gov.loggedIn = false;
  $('#govAppShell').classList.add('hidden');
  $('#landing').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
  toast('You have been logged out.','info');
}

/* ---------------------------- GOVERNMENT NAVIGATION ---------------------------- */
const GOV_VIEW_TITLES = {
  dashboard:['Overview','Department dashboard'],
  applications:['Applications','Review, approve or reject'],
  map:['Beneficiary Map','Regional distribution of enrollments'],
  schemes:['Schemes','Manage active government schemes'],
  settings:['Settings','Account and preferences'],
};
function goGovView(name){
  state.govView = name;
  $all('#govAppShell .view').forEach(v=>v.classList.add('hidden'));
  $('#gview-'+name).classList.remove('hidden');
  $all('#govAppShell .sb-link').forEach(l=>l.classList.toggle('active', l.dataset.gview===name));
  $('#govTopbarTitle').innerHTML = GOV_VIEW_TITLES[name][0] + '<span>'+GOV_VIEW_TITLES[name][1]+'</span>';
  closeAllDropdowns();
  if(name==='applications') renderApplications();
  if(name==='map'){ renderZones(); animateMapStats(); }
  if(name==='schemes') renderGovSchemes();
  $('#govContent').scrollTo({top:0,behavior:'smooth'});
}

/* ---------------------------- APPLICATIONS QUEUE ---------------------------- */
function appStatusBadge(status){
  if(status==='approved') return '<span class="badge badge-green">Approved</span>';
  if(status==='rejected') return '<span class="badge badge-red">Rejected</span>';
  return '<span class="badge badge-amber">Pending</span>';
}
function appRowHTML(a,i){
  const initials = a.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  let actions;
  if(a.status==='pending'){
    actions = `<button class="icon-action approve" title="Approve" onclick="acceptApp(${a.id})"><svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></button>
      <button class="icon-action reject" title="Reject" onclick="openRejectModal(${a.id})"><svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`;
  } else if(a.status==='rejected'){
    actions = `<span style="font-size:11px;color:var(--text-400);max-width:150px;">${a.reason}</span>`;
  } else {
    actions = `<span style="font-size:11px;color:var(--text-400);">Disbursement queued</span>`;
  }
  return `<div class="card app-row reveal" style="animation-delay:${i*.03}s" id="approw-${a.id}">
    <div class="applicant-avatar">${initials}</div>
    <div><div class="name">${a.name}</div><div class="sub">${a.scheme}</div></div>
    <div><div class="lbl">State</div><div class="val">${a.state}</div></div>
    <div><div class="lbl">Income / Docs</div><div class="val">${a.income} · ${a.docs}</div></div>
    <div><div class="lbl">Applied</div><div class="val">${a.date}</div></div>
    <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;">${appStatusBadge(a.status)}<div class="app-actions">${actions}</div></div>
  </div>`;
}
function renderApplications(){
  const q = ($('#appSearch')?.value||'').toLowerCase();
  const filtered = state.gov.applications.filter(a =>
    (govAppFilter==='all' || a.status===govAppFilter) &&
    (a.name.toLowerCase().includes(q) || a.scheme.toLowerCase().includes(q) || a.state.toLowerCase().includes(q))
  );
  $('#appQueueList').innerHTML = filtered.map((a,i)=>appRowHTML(a,i)).join('') ||
    `<div class="card" style="padding:50px;text-align:center;color:var(--text-400);font-size:13.5px;">No applications match this filter.</div>`;
}
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('#appFilterTabs .pill-tab');
  if(!btn) return;
  $all('#appFilterTabs .pill-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  govAppFilter = btn.dataset.astatus;
  renderApplications();
});

function acceptApp(id){
  const a = state.gov.applications.find(x=>x.id===id);
  if(!a) return;
  a.status = 'approved';
  toast(a.name+"'s application was approved.",'success');
  renderApplications();
  renderGovDashboardPreview();
  updateGovStats();
}
let pendingRejectId = null;
function openRejectModal(id){
  pendingRejectId = id;
  $all('#reasonChips .reason-chip').forEach(c=>c.classList.remove('active'));
  $('#rejectReasonText').value='';
  $('#rejectModal').classList.remove('hidden');
}
function closeRejectModal(){ $('#rejectModal').classList.add('hidden'); pendingRejectId=null; }
document.addEventListener('click', (e)=>{
  const chip = e.target.closest('#reasonChips .reason-chip');
  if(!chip) return;
  $all('#reasonChips .reason-chip').forEach(c=>c.classList.remove('active'));
  chip.classList.add('active');
  $('#rejectReasonText').value = chip.dataset.reason;
});
function confirmReject(){
  const a = state.gov.applications.find(x=>x.id===pendingRejectId);
  if(!a){ closeRejectModal(); return; }
  const reason = $('#rejectReasonText').value.trim() || "Doesn't meet eligibility criteria";
  a.status='rejected';
  a.reason=reason;
  toast(a.name+"'s application was rejected.",'info');
  closeRejectModal();
  renderApplications();
  renderGovDashboardPreview();
  updateGovStats();
}

/* ---------------------------- GOV DASHBOARD OVERVIEW ---------------------------- */
function updateGovStats(){
  const apps = state.gov.applications;
  animateCount($('#govStatTotal'), apps.length);
  animateCount($('#govStatPending'), apps.filter(a=>a.status==='pending').length);
  animateCount($('#govStatApproved'), apps.filter(a=>a.status==='approved').length);
  animateCount($('#govStatRejected'), apps.filter(a=>a.status==='rejected').length);
  $('#sbAppBadge').textContent = apps.filter(a=>a.status==='pending').length;
}
function renderGovDashboardPreview(){
  const pendingList = state.gov.applications.filter(a=>a.status==='pending').slice(0,4);
  $('#govPreviewQueue').innerHTML = pendingList.map(a=>`
    <div class="activity-item">
      <div class="activity-ic" style="background:var(--amber-50);color:var(--amber-600);font-weight:800;">${a.name[0]}</div>
      <div style="flex:1;"><p class="a-title">${a.name} — ${a.scheme}</p><p class="a-time">${a.state} · ${a.date}</p></div>
      <div class="app-actions">
        <button class="icon-action approve" title="Approve" onclick="acceptApp(${a.id})"><svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></button>
        <button class="icon-action reject" title="Reject" onclick="openRejectModal(${a.id})"><svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
    </div>`).join('') || `<p style="color:var(--text-400);font-size:13px;padding:14px 0;">Nothing pending — you're all caught up.</p>`;

  const top5 = getAllStatesFlat().sort((a,b)=>b.count-a.count).slice(0,5);
  const max = top5[0]?.count || 1;
  $('#govPreviewRank').innerHTML = top5.map((s,i)=>`
    <div class="rank-row"><div class="rank-num">${i+1}</div><div class="rn">${s.name}</div>
      <div class="rank-bar-track"><div class="rank-bar-fill" style="width:${(s.count/max*100)}%"></div></div>
      <div class="rank-count">${s.count.toLocaleString('en-IN')}</div></div>`).join('');
}

/* ---------------------------- BENEFICIARY MAP / REGIONS ---------------------------- */
function renderZones(){
  $('#zoneGrid').innerHTML = ZONES.map((z,i)=>{
    const total = z.states.reduce((a,s)=>a+s.count,0);
    const top3 = [...z.states].sort((a,b)=>b.count-a.count).slice(0,3);
    return `<div class="card zone-card reveal ${activeZone===z.key?'active':''}" style="animation-delay:${i*.05}s" onclick="selectZone('${z.key}')">
      <div class="zn-top"><div class="zone-pin"><svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><span class="badge badge-gray">${z.states.length} states</span></div>
      <h4>${z.name}</h4>
      <div class="zn-count">${total.toLocaleString('en-IN')}</div>
      <div class="zn-label">beneficiaries enrolled</div>
      <div class="zn-states">${top3.map(s=>`<div class="zone-mini-row"><span>${s.name}</span><b>${s.count.toLocaleString('en-IN')}</b></div>`).join('')}</div>
    </div>`;
  }).join('');
  renderFullRank();
  renderRegionSchemes();
}
function selectZone(key){ activeZone = (activeZone===key) ? null : key; renderZones(); }
function renderFullRank(){
  const flat = activeZone ? getAllStatesFlat().filter(s=>s.region===activeZone) : getAllStatesFlat();
  const sorted = [...flat].sort((a,b)=>b.count-a.count).slice(0,10);
  const max = sorted[0]?.count || 1;
  $('#rankTitle').textContent = activeZone ? ('Top states in '+ZONES.find(z=>z.key===activeZone).name) : 'Top states nationwide';
  $('#fullRankList').innerHTML = sorted.map((s,i)=>`
    <div class="rank-row"><div class="rank-num">${i+1}</div><div class="rn">${s.name}</div>
      <div class="rank-bar-track"><div class="rank-bar-fill" data-target="${(s.count/max*100)}" style="width:0%"></div></div>
      <div class="rank-count">${s.count.toLocaleString('en-IN')}</div></div>`).join('');
  setTimeout(()=>{ $all('#fullRankList .rank-bar-fill').forEach(el=>{ el.style.width = el.dataset.target+'%'; }); }, 60);
}
function renderRegionSchemes(){
  const usage = activeZone ? SCHEME_USAGE[activeZone] : SCHEME_USAGE.national;
  $('#regionSchemeList').innerHTML = usage.map(u=>`
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:var(--navy-900);margin-bottom:6px;"><span>${u.name}</span><span>${u.pct}%</span></div>
      <div class="progress thin green"><span style="width:${u.pct}%"></span></div>
    </div>`).join('');
}
function animateGrowth(el, target){
  const start = performance.now(); const dur=1200;
  function step(now){
    const p = Math.min(1,(now-start)/dur);
    const eased = 1-Math.pow(1-p,3);
    el.textContent = '+'+Math.round(target*eased)+'%';
    if(p<1) requestAnimationFrame(step); else el.textContent='+'+target+'%';
  }
  requestAnimationFrame(step);
}
function animateMapStats(){
  const total = getAllStatesFlat().reduce((a,s)=>a+s.count,0);
  animateCount($('#mapTotalBenef'), total, {duration:1400, format:true});
  const zoneTotals = ZONES.map(z=>({name:z.name, total:z.states.reduce((a,s)=>a+s.count,0)}));
  const top = zoneTotals.sort((a,b)=>b.total-a.total)[0];
  $('#mapTopRegionName').textContent = top.name.replace(' India','');
  $('#mapTopRegionCount').textContent = top.total.toLocaleString('en-IN')+' beneficiaries';
  animateGrowth($('#mapGrowth'), 18);
}

/* ---------------------------- SCHEMES MANAGEMENT ---------------------------- */
function renderGovSchemes(){
  $('#govSchemesList').innerHTML = GOV_SCHEMES.map(s=>`
    <div class="settings-row">
      <div><strong>${s.name}</strong><span>${s.category} · ${s.apps.toLocaleString('en-IN')} applications to date</span></div>
      <div style="display:flex;align-items:center;gap:14px;">
        <button class="switch ${s.active?'on':''}" onclick="toggleSwitch(this)"></button>
        <button class="btn btn-outline btn-sm" onclick="toast('Scheme editor coming soon.','info')">Manage</button>
      </div>
    </div>`).join('');
}

/* ---------------------------- ID SERVICES ---------------------------- */
const ID_FLOW_META = {
  'pan':{ title:'Apply for PAN Card', sub:'Fill in your details to start a new PAN card application via NSDL / Protean e-Gov.', brand:'PAN Card', color:'#7c4dee',
    icon:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/>',
    extraLabel:"Father's Name", extraDefault:'Rakesh Sharma',
    docs:['Aadhaar Card','Passport Photo','Address Proof'],
    visit:'Once processed, visit your nearest NSDL/PAN Kendra with original documents for biometric verification and photo capture.',
    statusId:'panStatus' },
  'aadhaar-new':{ title:'Apply for Aadhaar Card', sub:'New Aadhaar enrollment via UIDAI.', brand:'Aadhaar Card', color:'var(--blue-600)',
    icon:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"/>',
    extraLabel:'Gender', extraDefault:'Female',
    docs:['Birth Certificate','Address Proof','Passport Photo'],
    visit:'You must visit your nearest Aadhaar Seva Kendra in person for mandatory biometric capture (fingerprints, iris scan, photo).',
    statusId:'aadhaarNewStatus' },
  'aadhaar-update':{ title:'Update Aadhaar Card', sub:'Update your address, mobile number or demographic details.', brand:'Aadhaar Update', color:'#0e9d63',
    icon:'<path d="M21 12a9 9 0 1 1-6.219-8.56"/><path d="M22 4L12 14.01l-3-3"/>',
    extraLabel:'What do you want to update?', extraDefault:'Address', extraOptions:['Address','Mobile Number','Name spelling','Date of Birth'],
    docs:['Existing Aadhaar Copy','New Address / Mobile Proof'],
    visit:'Address and mobile updates can often complete online via e-KYC. Name or date-of-birth corrections require an in-person visit to an Aadhaar Seva Kendra with original proof.',
    statusId:'aadhaarUpdateStatus' },
  'water':{ title:'Water Connection ID', sub:'Apply for a new municipal water connection or update an existing one.', brand:'Water ID', color:'#2b8fd1',
    icon:'<path d="M12 2s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    extraLabel:'Connection Type', extraDefault:'New Connection', extraOptions:['New Connection','Update Existing Connection'],
    docs:['Aadhaar Card','Property Tax Receipt','Address Proof'],
    visit:'Visit your Municipal Water Department office with proof of residence — an inspector will schedule a site visit for meter installation.',
    statusId:'waterStatus' },
};
let currentIdFlow = null;
const idApplications = [];

function openIdFlow(type){
  currentIdFlow = type;
  const m = ID_FLOW_META[type];
  $('#idFlowTitle').textContent = m.title;
  $('#idFlowSub').textContent = m.sub;
  $('#idFlowBrandName').textContent = m.brand;
  $('#idFlowIconWrap').style.background = m.color;
  $('#idFlowIcon').innerHTML = m.icon;
  if(m.extraOptions){
    $('#idExtraFieldRow').innerHTML = `<label class="f-label">${m.extraLabel}</label><select class="field no-icon" id="idExtraField">${m.extraOptions.map(o=>`<option ${o===m.extraDefault?'selected':''}>${o}</option>`).join('')}</select>`;
  } else {
    $('#idExtraFieldRow').innerHTML = `<label class="f-label">${m.extraLabel}</label><input type="text" class="field no-icon" id="idExtraField" value="${m.extraDefault}">`;
  }
  $('#idFlowForm').classList.remove('hidden');
  $('#idFlowSuccess').classList.add('hidden');
  $('#captchaCheckId').classList.remove('checked');
  $('#captchaCheckId').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
  $('#idSubmitBtn').disabled = true;
  $('#idFlowModal').classList.remove('hidden');
}
function closeIdFlow(){ $('#idFlowModal').classList.add('hidden'); }
function submitIdFlow(){
  const m = ID_FLOW_META[currentIdFlow];
  const ref = 'VX-'+currentIdFlow.toUpperCase().slice(0,3)+'-'+Math.floor(100000+Math.random()*899999);
  $('#idFlowForm').classList.add('hidden');
  $('#idFlowSuccess').classList.remove('hidden');
  $('#idRefNumber').textContent = ref;
  $('#idFlowDocsList').innerHTML = m.docs.map(d=>`<span class="doc-required-chip">${d}</span>`).join('');
  $('#idFlowVisitBox').innerHTML = `<strong>📍 In-person step required</strong>${m.visit}`;
  const statusEl = document.getElementById(m.statusId);
  if(statusEl){ statusEl.textContent='In progress'; statusEl.className='badge badge-amber'; }
  idApplications.push({ ref, name:m.brand, date:'Just now' });
  renderIdApps();
  toast(m.brand+' application submitted — reference '+ref,'success');
}
function renderIdApps(){
  if(idApplications.length===0) return;
  $('#idAppsList').innerHTML = idApplications.slice().reverse().map(a=>`
    <div class="card app-row reveal" style="grid-template-columns:auto 1.4fr 1fr 1fr;padding:14px 18px;">
      <div class="applicant-avatar" style="background:var(--blue-50);color:var(--blue-600);">ID</div>
      <div><div class="name">${a.name}</div><div class="sub">Ref: ${a.ref}</div></div>
      <div><div class="lbl">Status</div><div class="val">In progress</div></div>
      <div><div class="lbl">Submitted</div><div class="val">${a.date}</div></div>
    </div>`).join('');
}

/* ---------------------------- INIT ---------------------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  setBrandAssets();
  $all('.reveal').forEach(el=>{ statObserverAttach(el); });
  const heroStats = document.querySelector('.stats-inner');
  if(heroStats) statObserver.observe(heroStats);
  buildStepper();
});
function statObserverAttach(){ /* landing reveal handled by CSS animation on load; no-op reserved for future use */ }
