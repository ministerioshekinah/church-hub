const test = require('node:test');
const assert = require('node:assert/strict');
const {nextService, calendarFile} = require('../visit-calendar.js');
const {page} = require('./helpers.cjs');
const service = {day_en:'Sunday',day_es:'Domingo',service_time:'15:00:00',service_label_en:'Sunday Service',service_label_es:'Servicio Dominical',address:'2149 W Washington Blvd, Los Angeles, CA 90018'};

for (const [description,now,expected] of [
  ['winter Pacific time','2026-01-05T00:00:00Z','2026-01-11T23:00:00.000Z'],
  ['summer Pacific time','2026-07-01T12:00:00Z','2026-07-05T22:00:00.000Z'],
  ['spring clock change','2026-03-07T20:00:00Z','2026-03-08T22:00:00.000Z'],
  ['fall clock change','2026-10-26T21:00:00Z','2026-11-01T23:00:00.000Z'],
  ['Sunday before the service','2026-10-25T21:59:59Z','2026-10-25T22:00:00.000Z'],
  ['exact service start','2026-10-25T22:00:00Z','2026-10-25T22:00:00.000Z'],
  ['after service start','2026-10-25T22:00:01Z','2026-11-01T23:00:00.000Z'],
  ['UTC Monday is still Sunday in LA','2026-10-26T01:00:00Z','2026-11-01T23:00:00.000Z'],
  ['year boundary','2026-12-31T22:00:00Z','2027-01-03T23:00:00.000Z'],
  ['leap day week','2028-02-28T22:00:00Z','2028-03-05T23:00:00.000Z']
]) test(`Calendar date: ${description}`,()=>assert.equal(nextService(service,new Date(now))?.toISOString(),expected));

test('Calendar date: another bilingual weekday and midnight are supported',()=>{
  const date=nextService({...service,day_en:'Wednesday',day_es:'Miércoles',service_time:'00:00'},new Date('2026-10-26T21:00:00Z'));
  assert.equal(date.toISOString(),'2026-10-28T07:00:00.000Z');
  assert.equal(nextService({...service,day_en:'',day_es:' SÁBADO '},new Date('2026-10-26T21:00:00Z')).toISOString(),'2026-10-31T22:00:00.000Z');
});

test('Calendar date: DST gaps and repeated hours do not produce an invented time',()=>{
  assert.equal(nextService({...service,service_time:'02:30'},new Date('2026-03-07T20:00:00Z')),null);
  assert.equal(nextService({...service,service_time:'01:30'},new Date('2026-10-31T20:00:00Z')),null);
});

test('Calendar date: conflicting, custom and missing schedules are not guessed',()=>{
  for(const change of [{day_en:'Friday'}, {day_en:'Special Sunday'}, {day_en:'',day_es:''}, {service_time:''}, {service_time:'24:00'}, {service_time:'3 PM'}, {service_time:'15:00:00.5'}, {special_message_es:'No hay servicio este domingo.'}, {special_message_en:'Holiday schedule'}]){
    assert.equal(nextService({...service,...change},new Date('2026-10-26T21:00:00Z')),null,JSON.stringify(change));
  }
  assert.equal(nextService(service,new Date('invalid')),null);
});

test('Calendar file: one UTC event, stable identity, current address and no inferred duration',()=>{
  const now=new Date('2026-10-26T21:00:00Z');const file=calendarFile(service,'en',now);
  assert.equal(file.filename,'shekinah-service-2026-11-01.ics');
  assert.match(file.content,/DTSTART:20261101T230000Z\r\n/);
  assert.match(file.content,/DTSTAMP:20261026T210000Z\r\n/);
  assert.match(file.content,/UID:service-20261101T230000Z@mcshekinah\.org/);
  assert.match(file.content,/LOCATION:2149 W Washington Blvd\\, Los Angeles\\, CA 90018/);
  assert.equal((file.content.match(/BEGIN:VEVENT/g)||[]).length,1);
  assert.doesNotMatch(file.content,/DTEND|DURATION|RRULE|ATTENDEE|ORGANIZER|VALARM|METHOD/);
  assert.equal(file.content.endsWith('END:VCALENDAR\r\n'),true);
});

test('Calendar file: line injection is escaped and Unicode folds at 75 UTF-8 bytes',()=>{
  const payload='Misión; Jesús, 🙌 '.repeat(12)+'\r\nBEGIN:VEVENT\r\nURL:https://example.test\u0000\\';
  const file=calendarFile({...service,service_label_es:payload,address:payload},'es',new Date('2026-10-26T21:00:00Z'));
  for(const line of file.content.split('\r\n'))assert(Buffer.byteLength(line,'utf8')<=75);
  const unfolded=file.content.replace(/\r\n /g,'');
  assert.equal(unfolded.split('\r\n').filter(line=>line==='BEGIN:VEVENT').length,1);
  assert.match(unfolded,/\\nBEGIN:VEVENT\\nURL:https:\/\/example.test/);
  assert.match(unfolded,/Misión\\; Jesús\\, 🙌/);
  assert.doesNotMatch(file.content,/\u0000|\ufffd/);
});

test('Calendar file: Spanish reminder and unavailable address handling',()=>{
  const now=new Date('2026-10-26T21:00:00Z');
  const content=calendarFile(service,'es',now).content.replace(/\r\n /g,'');
  assert.match(content,/SUMMARY:Servicio Dominical · Shekinah/);
  assert.match(content,/no se actualiza automáticamente/);
  for(const address of ['',null,'x'.repeat(1001)])assert.equal(calendarFile({...service,address},'en',now),null);
});

test('Calendar UI: visible date follows language, clears on outage and suppresses a special notice',async()=>{
  const p=await page('index.html',{fetch:async url=>({ok:true,json:async()=>url.includes('service_settings')?[service]:[]})});
  const wrap=p.document.getElementById('visitCalendar');const date=p.document.getElementById('nextServiceDate');
  assert.equal(wrap.hidden,false);assert.match(date.textContent,/Sunday/);assert(date.getAttribute('datetime'));
  p.run("applyLanguage('es')");assert.match(date.textContent,/domingo/);
  p.run('renderServiceUnavailable()');assert.equal(wrap.hidden,true);assert.equal(date.hasAttribute('datetime'),false);
  p.run(`renderServiceSettings(${JSON.stringify({...service,special_message_en:'Please check the holiday schedule.'})})`);
  assert.equal(wrap.hidden,true);
});

test('Calendar UI: a failed optional calendar bundle leaves service information usable',async()=>{
  const p=await page('index.html',{boot:false});
  p.run(`window.SHEKINAH_VISIT_CALENDAR=undefined;renderServiceSettings(${JSON.stringify(service)})`);
  assert.equal(p.document.getElementById('visitCalendar').hidden,true);
  assert.equal(p.document.getElementById('visitServiceTime').textContent,'3:00 PM');
  assert.equal(p.document.getElementById('visitAddress').textContent,service.address);
});
