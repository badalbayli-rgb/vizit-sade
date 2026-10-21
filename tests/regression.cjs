const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../vizit-sade.js'), 'utf8');
class FixedDate extends Date { static now() { return new Date('2026-10-21T12:00:00+03:00').getTime(); } }
const context = vm.createContext({ console, Date:FixedDate, state: { aoePreviousFixed: {} } });
const declarations = [...source.matchAll(/^  (?:async )?function (\w+)\(/gm)].map(match => {
  const end = source.indexOf('\n  }', match.index);
  return source.slice(match.index, end + 4);
});
const cleanStart = source.indexOf('  const clean =');
const normEnd = source.indexOf('\n', source.indexOf('  const norm =', cleanStart));
vm.runInContext(source.slice(cleanStart, normEnd) + '\n' + declarations.join('\n'), context);
vm.runInContext(source.slice(source.indexOf('  const VISIT_LAB_ROWS'), source.indexOf('  function latestTumorMarkerText')) +
  source.slice(source.indexOf('  const LAB_NORMAL_RANGES'), source.indexOf('  function labNumericValue')), context);
const run = code => vm.runInContext(code, context);
const originalApiJson = run('apiJson');
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }
test('Infusion names retain volume and Oksapar units while metronidazole brands collapse', () => {
  for (const [name, expected] of [
    ['TURKFLEKS DENGELİ ELEKTROLİT 1000 ML SOLÜSYONU PVC (SETSİZ)', 'DENGELİ 1000'],
    ['TURKOFLEKS DENGELİ ELEKTROLİT 500ML', 'DENGELİ 500'],
    ['DENGELİ ELEKTROLİT 500 ML (İZOLEN) SETSİZ', 'DENGELİ 500'],
    ['SER. %0,5 METRONİDAZOL IV 100 ML TORBA(SETSİZ)', 'METRONİDAZOL'],
    ['SER. %5 METRONIDAZOL', 'METRONİDAZOL'],
    ['TURKFLEKS %0,5 METRONİDAZOL I.V. ENJEKSIYONLUK COZELTI', 'METRONİDAZOL'],
    ['OKSAPAR 4000 Anti-Xa IU/0,4 ML ENJEKTÖR', 'OKSAPAR 4000'],
    ['OKSAPAR 6000 Anti-Xa IU/0,6 ML ENJEKTÖR', 'OKSAPAR 6000'],
    ['PROGAS 40 MG IV FLAKON', 'PROGAS']]) {
    context.drug = name; assert.equal(run('aoeDrugName(drug)'), expected);
  }
});
test('Isotonic saline names retain the requested bag volume', () => {
  for (const [name, expected] of [
    ['SER. %0,9 İZOTONİK NACL 500ML SETLİ', 'İZOTONİK 500'],
    ['SER. %0,9 İZOTONİK NACL 100 ML', 'İZOTONİK 100'],
    ['İZOTONİK 100 ML SODYUM KLORÜR ÇÖZELTİSİ %0.9 PVC SETLİ', 'İZOTONİK 100']]) {
    context.drug=name; assert.equal(run('aoeDrugName(drug)'), expected);
  }
});
test('Metronidazole infusion bags stay in visit orders without relaxing transfer validation', () => {
  context.order = {stok:{adi:'SER. %0,5 METRONİDAZOL IV 100 ML TORBA(SETSİZ)'},doz:'3x1',turu:1};
  assert.equal(run('isMedicineDisplayOrderRaw(order)'), true);
  assert.equal(run('isMedicineOrderRaw(order)'), false);
  for (const row of [{...context.order,turu:2}, {...context.order,stokTuru:'Sarf'},
    {stok:{adi:'KOLOSTOMİ TORBA'},doz:'3x1',turu:1}]) {
    context.excluded = row; assert.equal(run('isMedicineDisplayOrderRaw(excluded)'), false);
  }
});
test('FONET hyphenated CA names survive grouped reports into the tumor footer', () => {
  context.report = {data:[{children:[
    {tetkikAdi:'CA-125',sonuc:'33.1',sonucTarihi:'20.10.2026'},
    {tetkikAdi:'CA-15-3',sonuc:'12.3',sonucTarihi:'20.10.2026'},
    {tetkikAdi:'CA-19-9',sonuc:'4.5',sonucTarihi:'20.10.2026'}]}]};
  const footer = run('latestTumorMarkerText(summarizeLabs(flattenLabDetailRows(report)).labs, true)');
  assert.ok(footer.includes('CA19-9:4.5')); assert.ok(footer.includes('CA15-3:12.3'));
  assert.ok(footer.includes('CA125:33.1'));
  assert.equal(run('normalizeLabName("CA 19-9")'), 'CA199');
  assert.equal(run('normalizeLabName("Kalsiyum (Ca)")'), 'Ca');
});
test('Consultation excerpts use recommendation headings, spelling variants, and double-star markers', () => {
  for (const [text, expected] of [
    ['Öykü ve muayene. Öneriler: Takip önerilir.', 'Takip önerilir.'],
    ['Öykü\nÖNERİLER:\n1. Kontrol\n2. Rekons', '1. Kontrol\n2. Rekons'],
    ['Öykü Önerilr: Kontrol', 'Kontrol'], ['Öykü\n**Tedavi ve takip', 'Tedavi ve takip'],
    ['Öykü\n**Öneriler:**\nTakip', 'Takip'], ['İşaret yok: Tam not', 'İşaret yok: Tam not'],
    ['Öykü\nÖneriler:', '']]) {
    context.note = text; assert.equal(run('aoeConsultAnswerExcerpt(note)'), expected);
  }
});
test('Tumor marker footer always lists four requested markers, dates, and zero values', () => {
  context.labs = {CA199:[{value:4,date:'10.10.2026'},{value:8,date:'20.10.2026'}], CEA:[{value:0,date:'21.10.2026'}]};
  assert.equal(run('latestTumorMarkerText(labs, true)'), 'CA19-9:8 (20.10) CA15-3:— CA125:— CEA:0 (21.10)');
  assert.equal(run('latestTumorMarkerText({})'), '');
  for (const output of [run('visitLabTableHtml(labs)'), run('aoeWordLabTable(labs)')]) {
    for (const label of ['CA19-9', 'CA15-3', 'CA125', 'CEA']) assert.ok(output.includes(label));
  }
});
test('Readiness shows exact failed sections and excludes paused patients from scan progress', () => {
  run(`state.patients=[{key:'active',birimSevkId:1,oda:'TEST',lastFailedLabels:['Lab'],sectionErrors:{Lab:'Lab: HTTP 503'}},
    {key:'paused',birimSevkId:2}]; state.pausedKeys=['paused']; state.metrics={processed:1}; state.bootstrapComplete=true; state.busy=false;`);
  assert.equal(run('aoeReadiness().failureSummary'), 'Lab: 1');
  assert.ok(run('aoeReadiness().failureDetails').includes('HTTP 503'));
  assert.equal(run('aoeReadiness().total'), 1);
  run(`state.patients[0].lastFailedLabels=[]`);
  assert.equal(run('aoeReadiness().ready'), true);
});

test('Requested imaging names and existing imaging remain allowed', () => {
  for (const exam of ['Yüzeyel doku USG', 'BT Boyun kontrastlı', 'Boyun BT (kontrastlı)',
    'Perkütan safra kesesi drenajı', 'Perkütan kolesistostomi', 'BT Pankreas dinamik kontrastlı',
    'Rektoskopi', 'Sigmoidoskopi', 'Sigmoideoskopi', 'Sigmmoideskopi', 'Karotis renkli Doppler US',
    'Alt ekstremite venöz RDUS', 'Hepatobilier USG', 'Hepatobiliyer ultrasonografi', 'Hepatobiliyer US',
    'Toraks BT', 'Alt abdomen BT', 'MRCP', 'ERCP', 'EUS', 'PTK', 'Kolonoskopi']) {
    context.item = {exam}; assert.equal(run('aoeAllowedImaging(item)'), true, exam);
  }
  for (const exam of ['Boyun BT kontrastsız', 'PA akciğer grafisi', 'Beyin BT']) {
    context.item = {exam}; assert.equal(run('aoeAllowedImaging(item)'), false, exam);
  }
});
test('Drainage preserves cholangiography after SONUÇ and pancreatic CT preserves full report', () => {
  const report = 'Bulgular\nSONUÇ:\nKolanjiografide;\nKoledok distalde oklüde izlendi.';
  for (const exam of ['Perkütan safra kesesi drenajı', 'BT pankreas dinamik kontrastlı']) {
    context.item = {exam, reportText:report}; assert.equal(run('aoeImagingReport(item)'), report);
  }
  context.item = {exam:'Toraks BT', reportText:'Bulgular\nSONUÇ: özet'};
  assert.equal(run('aoeImagingReport(item)'), 'Bulgular');
});
test('Blood counts, abbreviations, Turkish names, and unrelated words', () => {
  for (const [text, amount, expected] of [
    ['1 ES 2 TDP 3 TS', '', '1 ES, 2 TDP, 3 TS'],
    ['Eritrosit süspansiyonu', 1, '1 ES'], ['Taze donmuş plazma', 2, '2 TDP'],
    ['Trombosit süspansiyonu', 3, '3 TS'], ['Aferez trombosit', 2, '2 TS'],
    ['2 ünite eritrosit süspansiyonu', '', '2 ES'], ['ES: 2', '', '2 ES'],
    ['Trombosit süspansiyonu 300 ml', 1, '1 TS'], ['ES', '', 'ES'],
    ['SERUM FİZYOLOJİK', '', ''], ['TESTS', '', ''], ['Suspansiyon antibiyotik', '', ''],
    ['Trombosit sayımı', '', ''], ['Eritrosit sedimentasyon hızı', '', ''], ['ES istenmedi', '', '']]) {
    context.text = text; context.amount = amount;
    assert.equal(run('aoeBloodPreparationLabel(text, amount)'), expected, text);
  }
});

const row = (id, visit, unit, start, end, exit) => ({ id, hastaGelis:{id:visit, hasta:{id:99}}, birim:{adi:unit}, sevkTarihi:start, cikisTarihi:end, cikisSekli:{adi:exit || ''} });
const chain = [row(1, 10, 'Acil Genel Cerrahi', '10.10.2026 10:00', '10.10.2026 13:00', 'Nakil'),
  row(2, 11, 'Ameliyathane', '10.10.2026 13:00', '10.10.2026 17:00', 'Nakil'),
  row(3, 12, 'Yoğun Bakım', '10.10.2026 17:00', '15.10.2026 10:00', 'Nakil'),
  row(4, 13, 'Genel Cerrahi 1', '15.10.2026 10:00')];
context.patient = {hastaId:99, hastaGelisId:13, birimSevkId:4};
test('First admission spans emergency, operating theatre, ICU and current ward across visits', () => {
  context.rows = [...chain, chain[1], row(0, 1, 'Yoğun Bakım', '01.09.2026 10:00')];
  assert.equal(run('continuousAdmissionRows(patient, rows).length'), 4);
  assert.equal(run('admissionRowStart(continuousAdmissionRows(patient, rows)[0])'), '10.10.2026 10:00');
});
test('Discharged previous admission and another patient cannot join current admission', () => {
  context.rows = [chain[3], row(3, 12, 'Yoğun Bakım', '14.10.2026 17:00', '15.10.2026 09:00', 'Eve çıkış'),
    {...chain[0], hastaGelis:{id:10, hasta:{id:100}}}];
  assert.equal(run('continuousAdmissionRows(patient, rows).length'), 1);
});
test('Same-visit inpatient chain is retained even with missing transfer end times', () => {
  context.rows = chain.map(x => ({...x, hastaGelis:{id:13}, cikisTarihi:''}));
  assert.equal(run('continuousAdmissionRows(patient, rows).length'), 4);
});
test('Empty clinic objects on outpatient consultations are not admission movements', () => {
  context.rows = [...chain, {id:9, sevkTipi:1, klinik:{}, hastaGelis:{id:13},
    birim:{adi:'Genel Cerrahi Kons.(15:00 - 08:00)'}, sevkTarihi:'09.10.2026 10:00'}];
  assert.equal(run('continuousAdmissionRows(patient, rows).length'), 4);
});
test('An unrelated operation does not hide an older ICU interval ending at ward transfer', () => {
  context.rows = [chain[3], row(3,12,'Yoğun Bakım','10.10.2026 10:00','15.10.2026 10:00','Nakil'),
    row(9,99,'Ameliyathane','11.10.2026 10:00','11.10.2026 12:00')];
  assert.equal(run('admissionRowStart(continuousAdmissionRows(patient, rows)[0])'), '10.10.2026 10:00');
});
test('Consultations before ward transfer remain visible when admission has not been resolved', () => {
  context.patient = {yatis:'21.10.2026 10:29', consults:[
    {unit:'Kardiyoloji', date:'20.10.2026 10:00', answer:'Yanıt'},
    {unit:'Nefroloji', date:'06.10.2026 10:00', answer:'Yanıt'},
    {unit:'Eski', date:'01.09.2026 10:00', answer:'Yanıt'}]};
  assert.equal(run('aoeRecentConsults(patient).length'), 2);
  assert.equal(run('aoeFollowEvents(patient).filter(x=>x.group===0).length'), 2);
});
test('Resolved first admission excludes earlier stays while retaining pre-transfer consultations', () => {
  context.patient = {yatis:'03.10.2026 04:15', admissionHistoryResolved:true, consults:[
    {unit:'Kardiyoloji', date:'20.10.2026 10:00', answer:'Yanıt'},
    {unit:'Nefroloji', date:'06.10.2026 10:00', answer:'Yanıt'},
    {unit:'Önceki yatış', date:'01.10.2026 10:00', answer:'Yanıt'}]};
  assert.equal(run('aoeRecentConsults(patient).length'), 2);
});
test('Consultation displays select the latest ten after applying admission and date filters', () => {
  context.patient = {yatis:'03.10.2026', admissionHistoryResolved:true, consults:[
    ...Array.from({length:15}, (_,i)=>({id:i+1, unit:'Kons '+(i+1), answer:'Yanıt', date:`${String(i+4).padStart(2,'0')}.10.2026`})),
    {id:99, date:'01.10.2026'}, {id:100, date:'01.09.2026'}]};
  const before = JSON.stringify(context.patient.consults);
  assert.equal(run('aoeRecentConsults(patient).length'), 10);
  assert.equal(run('aoeRecentConsults(patient)[0].id'), 15);
  assert.equal(run('aoeRecentConsults(patient)[9].id'), 6);
  assert.equal(run('aoeFollowEvents(patient).filter(x=>x.group===0).length'), 10);
  assert.equal(run('latestConsults(patient.consults).length'), 10);
  assert.equal(JSON.stringify(context.patient.consults), before);
});
test('Clinic order adds GC6 in second place and preserves remaining priorities', () => {
  const names = ['Acil Genel Cerrahi', 'Genel Cerrahi 6', 'Genel Cerrahi 1', 'Genel Cerrahi 2',
    'Gastroenterolojik ve Onkolojik Cerrahi', 'Genel Cerrahi 3', 'Genel Cerrahi 4', 'Diğer Klinik', 'Yoğun Bakım'];
  context.names = names;
  assert.equal(run('JSON.stringify(names.slice().reverse().sort((a,b)=>aoeClinicPriority(a)-aoeClinicPriority(b)))'), JSON.stringify(names));
});

test('Historical blood orders and drainage appear in follow-up; clinical prose is separate', () => {
  context.patient = { yatis:'10.10.2026', orderHistoryRows:[
    {stok:{adi:'Eritrosit süspansiyonu'}, miktar:1, istemTarihi:'11.10.2026'},
    {stok:{adi:'Taze donmuş plazma'}, miktar:2, istemTarihi:'09.10.2026'}],
    radiology:[{exam:'Perkütan safra kesesi drenajı', date:'12.10.2026'}],
    clinicalHistory:[{text:'Hastanın genel durumu iyi.', date:'13.10.2026'}] };
  const labels = JSON.parse(run('JSON.stringify(aoeFollowEvents(patient).map(x=>x.label))'));
  assert.deepEqual(labels, ['Perkütan safra kesesi drenajı', '1 ES']);
});

// Isolate presentation from unrelated patient-summary calculations.
run(`extractCardMeta = () => ({}); aoeConsultFacts = () => ({});
aoeSurgeryInfo = () => ({}); compactDietInfo = () => ({});
aoeLiveFixed = p => ({name:'Test', admission:aoeDate(p.yatis)});
doctorInitials = () => ''; latestVitalLine = () => '';
visitLabTableHtml = () => ''; aoeWordLabTable = () => '';`);
test('Confirmed first admission replaces imported stale admission without unlocking diagnosis', () => {
  run(`state.aoePreviousFixed = {'hasta:99': {admission:'15.10.2026', diagnosis:'Korunan tanı'}}`);
  context.patient = {hastaId:99, yatis:'10.10.2026', admissionHistoryResolved:true};
  assert.equal(run('aoeFixedFor(patient).admission'), '10.10.2026');
  assert.equal(run('aoeFixedFor(patient).diagnosis'), 'Korunan tanı');
});
test('HTML and Word put bold clinical heading above Order and outside Takip', () => {
  context.patient = {yatis:'10.10.2026', clinicalHistory:[{date:'12.10.2026', text:'BENZERSIZ_KLINIK_NOT'}]};
  const html = run('aoePatientHtml(patient)');
  const xml = run('aoeWordPatient(patient)');
  for (const text of [html, xml]) {
    assert.ok(text.indexOf('Klinik İzlem:') < text.indexOf('Order:'));
    assert.ok(text.indexOf('BENZERSIZ_KLINIK_NOT') < text.indexOf('Order:'));
    assert.equal(text.split('BENZERSIZ_KLINIK_NOT').length - 1, 1);
    assert.ok(!text.slice(text.indexOf('Takip:')).includes('BENZERSIZ_KLINIK_NOT'));
  }
  assert.ok(html.includes('<b>Klinik İzlem:</b>'));
  assert.match(xml, /<w:b\/>[^]*?Klinik İzlem:/);
});
test('HTML and Word exports retain pre-transfer consultation answers and follow-up entries', () => {
  context.patient = {yatis:'03.10.2026', admissionHistoryResolved:true, consults:[
    {unit:'Nefroloji', date:'06.10.2026 10:00', answer:'KORUNAN_KONSULTASYON_YANITI'},
    {unit:'Önceki yatış', date:'01.10.2026', answer:'DISLANAN_ESKI_YATIS'}]};
  for (const text of [run('aoePatientHtml(patient)'), run('aoeWordPatient(patient)')]) {
    assert.ok(text.includes('KORUNAN_KONSULTASYON_YANITI'));
    assert.ok(text.includes('Nefroloji kons'));
    assert.ok(!text.includes('DISLANAN_ESKI_YATIS'));
  }
});
async function integration() {
  context.AbortController = AbortController;
  context.URLSearchParams = URLSearchParams;
  context.window = {location:{origin:'http://example.test'},setTimeout,clearTimeout};
  let calls = 0;
  context.fetch = async () => { calls++; return calls === 1
    ? {ok:false,status:503} : {ok:true,text:async()=>'{"data":[]}'}; };
  await originalApiJson('/read');
  assert.equal(calls, 2);
  calls = 0;
  context.fetch = async () => { calls++; return {ok:false,status:403}; };
  await assert.rejects(originalApiJson('/read'), /HTTP 403/);
  assert.equal(calls, 1);
  context.fetch = async (url, options) => new Promise((resolve,reject) => options.signal.addEventListener('abort',()=>{
    const error = new Error('aborted'); error.name='AbortError'; reject(error);
  }));
  await assert.rejects(originalApiJson('/read',{}, {timeoutMs:5}), /zaman aşımı/);
  count++; console.log('PASS Read queries retry transient errors, reject permission errors, and abort timed-out requests');
  const labRequests = [];
  context.apiJson = async (url, options) => {
    labRequests.push({url,options});
    const filter = JSON.parse(options.filter)[0];
    if (url.endsWith('getLisRaporHastaInfoList')) {
      const records=Array.from({length:121}, (_,i)=>({lisKabulId:i+1}));
      return {data:records.slice(options.start, options.start+options.limit), total:121};
    }
    if (url.endsWith('getLisHastaTupInfo')) return {data:[{barkodNo:filter.value}]};
    if (url.endsWith('getLisRaporDetay')) return {data:Array.isArray(filter.value) && filter.value.map(String).includes('121')
      ? ['CA-125','CA-15-3','CA-19-9','CEA'].map((tetkikAdi,i)=>({tetkikAdi,sonuc:String(12+i),sonucTarihi:'01.10.2026'}))
      : [{tetkikAdi:'AFP',sonuc:'2',sonucTarihi:'21.10.2026'}]};
    throw Error('Unexpected lab request');
  };
  context.patient = {hastaId:99,hastaGelisId:13};
  await run('fetchLabs(patient)');
  assert.equal(context.patient.labs.CA199[0].value, '14');
  assert.equal(context.patient.labs.CA125[0].date, '01.10.2026');
  assert.ok(labRequests.some(x=>x.url.endsWith('getLisRaporHastaInfoList') && x.options.start===100));
  count++; console.log('PASS Older CA results beyond 100 acceptances are fetched even when a recent AFP exists');
  context.apiJson = async()=>({data:Array.from({length:100},(_,i)=>({lisKabulId:i+1})),total:200});
  await assert.rejects(run('fetchLabAcceptances("hastaId",99)'), /tekrar döndürdü/);
  count++; console.log('PASS Repeated lab history pages report incomplete scanning instead of looping');
  context.rows = chain;
  context.patient = {hastaId:99, hastaGelisId:13, birimSevkId:4, errors:[]};
  run(`apiJson = async (url, options) => {
    const scope = JSON.parse(options.filter)[0].property;
    if (scope !== 'hastaGelis.hasta.id') throw Error('Unsupported field');
    return {data:rows};
  }`);
  await run('fetchAdmissionHistory(patient)');
  assert.equal(context.patient.yatis, '10.10.2026 10:00');
  assert.equal(context.patient.admissionHistoryResolved, true);
  assert.equal(context.patient.errors.length, 0);
  count++; console.log('PASS Admission fetch tolerates unsupported fallback fields');
  run(`apiJson = async (url, options) => {
    if (url !== '/Hasta/HastaGecmis/getSevkList') throw Error('Unexpected fallback');
    const filters = JSON.parse(options.filter);
    if (filters[1].property !== 'tumHastane' || filters[1].value !== 1) throw Error('Missing FONET filter');
    return {data:rows, success:'true', total:rows.length};
  }`);
  context.patient = {hastaId:99, hastaGelisId:13, birimSevkId:4, errors:[]};
  await run('fetchAdmissionHistory(patient)');
  assert.equal(context.patient.yatis, '10.10.2026 10:00');
  assert.equal(context.patient.errors.length, 0);
  count++; console.log('PASS Uses the live FONET history endpoint and filters');

  context.patient = {hastaId:99, hastaGelisId:13, birimSevkId:4, yatis:'21.10.2026', errors:[]};
  run(`apiJson = async () => ({data:[], success:'true'})`);
  await run('fetchAdmissionHistory(patient)');
  assert.equal(context.patient.admissionHistoryResolved, undefined);
  assert.ok(context.patient.errors[0].includes('İlk yatış doğrulanamadı'));
  count++; console.log('PASS Empty admission response is reported instead of silently treated as success');

  context.patient = {hastaGelisId:13, admissionHistory:[{hastaGelis:{id:12}},{hastaGelis:{id:13}}]};
  run(`consultAnswerText = x => x.answer || '';
    apiJson = async url => ({data:url.includes('/12/')
      ? [{id:1, birimSevk:{sevkTarihi:'06.10.2026', birim:{adi:'Nefroloji'}}, answer:'Önceki geliş yanıtı'}]
      : [{id:1, birimSevk:{sevkTarihi:'06.10.2026', birim:{adi:'Nefroloji'}}},
          ...Array.from({length:55}, (_,i)=>({id:i+2, birimSevk:{sevkTarihi:'20.10.2026', birim:{adi:'Kons'}}}))]})`);
  await run('fetchConsults(patient)');
  assert.equal(context.patient.consults.length, 56);
  assert.equal(context.patient.consults.find(x=>x.id===1).answer, 'Önceki geliş yanıtı');
  count++; console.log('PASS All episode visits are queried, duplicate answers retained, and 50-row truncation removed');
  run(`state.active=true; state.patientRefreshAt={}; state.endpointFailures={}; state.metrics={cycles:3,requests:0,errors:0};
    notifyChanges=()=>{}; scheduleRender=()=>{};
    fetchOrders=async()=>{}; fetchLabs=async()=>{throw Error('HTTP 503')};`);
  context.patient = {key:'retry-test',lastFailedLabels:['Lab','Order'],sectionErrors:{Lab:'Lab: eski hata',Order:'Order: eski hata'}};
  await run(`refreshPatientDetails(patient, false, true, ['Order'])`);
  assert.deepEqual(Array.from(context.patient.lastFailedLabels), ['Lab']);
  await run(`refreshPatientDetails(patient, false, true, ['Lab'])`);
  assert.equal(context.patient.sectionErrors.Lab, 'Lab: HTTP 503');
  run(`fetchLabs=async()=>{}`);
  await run(`refreshPatientDetails(patient, false, true, ['Lab'])`);
  assert.equal(context.patient.lastFailedLabels.length, 0);
  assert.equal(context.patient.errors.length, 0);
  count++; console.log('PASS Partial retries preserve unresolved sections and clear only successfully recovered errors');
  console.log(`${count} regression groups passed`);
}
integration().catch(error => { console.error(error); process.exitCode = 1; });
