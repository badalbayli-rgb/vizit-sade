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
const run = code => vm.runInContext(code, context);
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }

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
  console.log(`${count} regression groups passed`);
}
integration().catch(error => { console.error(error); process.exitCode = 1; });
