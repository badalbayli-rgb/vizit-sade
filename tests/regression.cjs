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
  console.log(`${count} regression groups passed`);
}
integration().catch(error => { console.error(error); process.exitCode = 1; });
