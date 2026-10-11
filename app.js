(function () {
'use strict';
var KEY = 'soft-sky-v1', CACHE = 'soft-sky-weather-v1';
var PAGE_NAMES = {now:'Now',hourly:'Next 24 hours',week:'Seven days',details:'Conditions',sun:'Sun & sky'};
var DEFAULTS = {cities:[],selected:null,pages:['now','hourly','week','details','sun'],enabled:{now:true,hourly:true,week:true,details:true,sun:true},rotate:true,seconds:20,rotateCities:false,appearance:'auto',palette:'sky',large:false,animation:true,transitions:true,refresh:15};
var prefs = copy(DEFAULTS), weather = null, pageIndex = 0, hourGroup = 0, paused = false, overlayOpen = false, generation = 0, searchGeneration = 0, rotationTimer, refreshTimer, searchTimer, lastFocus, storageOK = true, pending = false, transitionTimer, renderVersion = 0, displayedPage = null;
function $(id){return document.getElementById(id);}
function copy(value){return JSON.parse(JSON.stringify(value));}
function el(tag, cls, text){var n=document.createElement(tag);if(cls){n.className=cls;}if(text!==undefined){n.textContent=text;}return n;}
function clear(n){while(n.firstChild){n.removeChild(n.firstChild);}}
function button(text, fn, cls){var b=el('button',cls,text);b.type='button';b.onclick=fn;return b;}
function num(v){return typeof v==='number'&&isFinite(v);}
function fmt(v, suffix, digits){return num(v)?v.toFixed(digits||0)+(suffix||''):'—';}
function pad(n){return n<10?'0'+n:String(n);}
function city(){var i;for(i=0;i<prefs.cities.length;i++){if(prefs.cities[i].id===prefs.selected){return prefs.cities[i];}}return null;}
function validCity(c){return c&&typeof c.id==='number'&&typeof c.name==='string'&&num(c.latitude)&&num(c.longitude)&&c.latitude>=-90&&c.latitude<=90&&c.longitude>=-180&&c.longitude<=180;}
function read(key){try{return JSON.parse(localStorage.getItem(key));}catch(e){storageOK=false;return null;}}
function write(key,data){try{localStorage.setItem(key,JSON.stringify(data));}catch(e){storageOK=false;}}
function save(){write(KEY,prefs);}
function load(){var p=read(KEY),k,keys=['rotate','rotateCities','large','animation','transitions'];if(!p){return;}if(p.cities instanceof Array){prefs.cities=p.cities.filter(validCity).slice(0,12);}prefs.selected=p.selected;if(!city()){prefs.selected=prefs.cities.length?prefs.cities[0].id:null;}for(k=0;k<keys.length;k++){if(typeof p[keys[k]]==='boolean'){prefs[keys[k]]=p[keys[k]];}}if([10,20,30,60].indexOf(p.seconds)>=0){prefs.seconds=p.seconds;}if([10,15,30].indexOf(p.refresh)>=0){prefs.refresh=p.refresh;}if(['auto','light','dark'].indexOf(p.appearance)>=0){prefs.appearance=p.appearance;}if(['sky','rose','sage'].indexOf(p.palette)>=0){prefs.palette=p.palette;}if(p.pages instanceof Array && p.pages.length===5 && p.pages.filter(function(x,i,a){return PAGE_NAMES[x]&&a.indexOf(x)===i;}).length===5){prefs.pages=p.pages;}if(p.enabled){for(k in PAGE_NAMES){if(PAGE_NAMES.hasOwnProperty(k)&&typeof p.enabled[k]==='boolean'){prefs.enabled[k]=p.enabled[k];}}}if(!enabledPages().length){prefs.enabled.now=true;}}
function enabledPages(){return prefs.pages.filter(function(p){return prefs.enabled[p];});}
/* Older Safari can report completion through readystatechange or load.
   Use both, once only; retry transient failures without changing HTTPS. */
function request(url, cb){
 var attempt=0,finished=false,lastAttempt=0;
 function send(){
  var x=new XMLHttpRequest(),settled=false,id=++lastAttempt;attempt++;
  function done(error,data,retryable){
   if(settled||finished||id!==lastAttempt){return;}settled=true;
   if(error&&retryable&&attempt<2){setTimeout(send,1200);return;}
   finished=true;cb(error,data);
  }
  function complete(){
   if(x.readyState!==4&&x.readyState!==undefined){return;}
   if(x.status>=200&&x.status<300){
    var parsed;try{parsed=JSON.parse(x.responseText);}catch(e){done('The service returned unreadable data. Please retry.');return;}
    done(null,parsed,false);
   }else if(x.status){done('Weather service returned HTTP '+x.status+'. Please retry.',null,x.status>=500);}
  }
  x.open('GET',url,true);x.timeout=45000;
  x.onreadystatechange=complete;x.onload=function(){complete();if(!settled&&x.status===0){done('The browser could not complete the request (network or browser security). Open Connection help in Settings.',null,true);}};
  x.onerror=function(){done('The browser could not complete the request (network or browser security). Open Connection help in Settings.',null,true);};
  x.ontimeout=function(){done('The service did not respond within 45 seconds. Please retry.',null,true);};
  try{x.send();}catch(e){done('Safari could not start the request. Open Connection help in Settings.',null,false);}
 }
 send();
}
function weatherURL(c){return 'https://api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(c.latitude)+'&longitude='+encodeURIComponent(c.longitude)+'&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=8&timeformat=unixtime&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,weather_code,visibility,uv_index,is_day,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration,precipitation_probability_max,uv_index_max';}
function acceptable(d){return d&&d.current&&num(d.current.time)&&d.hourly&&d.hourly.time instanceof Array&&d.daily&&d.daily.time instanceof Array&&num(d.utc_offset_seconds);}
function cacheGet(c){var a=read(CACHE);return a&&a.id===c.id&&num(a.saved)&&acceptable(a.data)?a:null;}
function status(message,retry){clear($('status'));$('status').appendChild(el('span','',message||''));if(retry){$('status').appendChild(button('Retry',function(){fetchWeather();}));}}
function fetchWeather(){var c=city(),token=++generation;if(!c){return;}pending=true;status(weather?'Updating the sky…':'Looking at the sky…');request(weatherURL(c),function(err,d){if(token!==generation){return;}pending=false;if(err||!acceptable(d)){status((err||'Weather data is incomplete.')+(weather?' Showing the last saved forecast.':''),true);if(!weather){render();}return;}if(typeof d.timezone==='string'){c.timezone=d.timezone;save();}weather={id:c.id,data:d,saved:Date.now()};write(CACHE,weather);status(storageOK?'':'Preferences cannot be saved in this browser session.');render();});}
function selectCity(c){prefs.selected=c.id;save();generation++;pending=true;weather=cacheGet(c);pageIndex=0;hourGroup=0;closeDialog();render();ensureTimezone(c);fetchWeather();resetTimers();}
function timezoneOffset(zone,timestamp){
 var table=window.SOFT_SKY_TIMEZONES,rule,i;
 if(!table||!zone||timestamp<table.start||timestamp>=table.end||!Object.prototype.hasOwnProperty.call(table.zones,zone)){return null;}
 rule=table.rules[table.zones[zone]];
 for(i=rule.length-1;i>=0;i--){if(timestamp>=rule[i][0]){return rule[i][1];}}
 return null;
}
function currentOffset(timestamp){
 var c=city(),zone=c&&c.timezone,offset;
 if(!zone&&weather){zone=weather.data.timezone;}
 offset=timezoneOffset(zone,timestamp);
 return num(offset)?offset:(weather?weather.data.utc_offset_seconds:null);
}
function ensureTimezone(c){
 if(c.timezone){clock();return;}
 request('https://geocoding-api.open-meteo.com/v1/get?id='+encodeURIComponent(c.id),function(error,result){
  if(error||!result){return;}
  var item=result.results instanceof Array?result.results[0]:result;
  if(item&&item.id===c.id&&typeof item.timezone==='string'){c.timezone=item.timezone;save();if(city()&&city().id===c.id){clock();}}
 });
}
function localDate(timestamp){var offset=currentOffset(timestamp);return new Date((timestamp+(num(offset)?offset:0))*1000);}
function time(timestamp){if(!num(timestamp)){return '—';}var d=localDate(timestamp);return pad(d.getUTCHours())+':'+pad(d.getUTCMinutes());}
function weekday(timestamp){return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][localDate(timestamp).getUTCDay()];}
function clock(){var c=city(),d;if(!c||!num(currentOffset(Date.now()/1000))){$('clock').textContent='--:--';$('date').textContent=c?'TIME ZONE UNAVAILABLE':'WELCOME HOME';return;}d=localDate(Date.now()/1000);$('clock').textContent=pad(d.getUTCHours())+':'+pad(d.getUTCMinutes());$('date').textContent=weekday(Date.now()/1000).toUpperCase()+' '+pad(d.getUTCDate())+' '+['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()]+' '+d.getUTCFullYear();$('updated').textContent=weather?'Updated '+time(weather.saved/1000)+(Date.now()-weather.saved>prefs.refresh*60000+60000?' · STALE':''):'Waiting for weather · City clock is available';}
function condition(code,day){if(code===0){return {name:day?'Clear sky':'Clear night',icon:day?'sun':'moon'};}if(code===1||code===2){return {name:'Partly cloudy',icon:day?'partly':'night-cloud'};}if(code===3){return {name:'Overcast',icon:'cloud'};}if(code===45||code===48){return {name:'Misty skies',icon:'fog'};}if([71,73,75,77,85,86].indexOf(code)>=0){return {name:'Snow',icon:'snow'};}if(code>=95){return {name:'Thunderstorms',icon:'storm'};}if([51,53,55,56,57].indexOf(code)>=0){return {name:'Drizzle',icon:'rain'};}if([61,63,65,66,67,80,81,82].indexOf(code)>=0){return {name:'Rain showers',icon:'rain'};}return {name:'Conditions unavailable',icon:'cloud'};}
function art(icon,cls){var img=el('img',cls);img.src='assets/'+icon+'.svg';img.alt='';return img;}
function valueAt(obj,key,index){return obj&&obj[key] instanceof Array?obj[key][index]:null;}
function hourIndex(){var times=weather.data.hourly.time,now=Date.now()/1000,i;for(i=times.length-1;i>=0;i--){if(times[i]<=now){return i;}}return 0;}
function dayIndex(){var a=weather.data.daily.time,n=Date.now()/1000,i;for(i=a.length-1;i>=0;i--){if(a[i]<=n){return i;}}return 0;}
function isDay(){var d=weather.data,di=dayIndex(),rise=valueAt(d.daily,'sunrise',di),set=valueAt(d.daily,'sunset',di),now=Date.now()/1000;return num(rise)&&num(set)?now>=rise&&now<set:d.current.is_day===1;}
function theme(){var cls='sky palette-'+prefs.palette;if(prefs.appearance==='dark'||(prefs.appearance==='auto'&&weather&&!isDay())){cls+=' night';}if(weather&&weather.data.current.weather_code>=51){cls+=' rainy';}if(prefs.large){cls+=' large';}if(prefs.animation){cls+=' animate';}$('app').className=cls;}
/* The sun's height follows daylight progress, not a looping animation.
   This is a decorative time arc, not an astronomical azimuth calculation. */
function solarPosition(now,rise,set){
 if(!num(now)||!num(rise)||!num(set)||set<=rise){return null;}
 var t=Math.max(0,Math.min(1,(now-rise)/(set-rise)));
 return {progress:t,x:35+250*t,y:150-105*Math.sin(Math.PI*t),day:now>=rise&&now<set};
}
function svgNode(tag,attrs){
 var n=document.createElementNS('http://www.w3.org/2000/svg',tag),k;
 for(k in attrs){if(attrs.hasOwnProperty(k)){n.setAttribute(k,attrs[k]);}}
 return n;
}
function heroScene(co){
 var frame=el('div','hero-art sky-scene');
 var sky=svgNode('svg',{viewBox:'0 0 320 240','class':'hero-orbit','aria-hidden':'true'});
 var disc=svgNode('circle',{id:'hero-sun',cx:160,cy:70,r:43,fill:'#f5d773'});
 sky.appendChild(svgNode('circle',{id:'hero-halo',cx:160,cy:70,r:55,fill:'#fff0b7',opacity:'.28'}));
 sky.appendChild(disc);frame.appendChild(sky);
 var moon=art('moon','hero-moon');moon.id='hero-moon';frame.appendChild(moon);
 if(co.icon!=='sun'&&co.icon!=='moon'){
  var cloudIcon=co.icon==='partly'||co.icon==='night-cloud'?'cloud':co.icon;
  frame.appendChild(art(cloudIcon,'hero-cloud hero-cloud-front'));
  if(cloudIcon==='cloud'){frame.appendChild(art('cloud','hero-cloud hero-cloud-back'));}
 }
 return frame;
}
function updateSky(){
 if(!weather){return;}
 var d=weather.data.daily,i=dayIndex(),rise=valueAt(d,'sunrise',i),set=valueAt(d,'sunset',i),now=Date.now()/1000;
 var pos=solarPosition(now,rise,set),sun=$('hero-sun'),halo=$('hero-halo'),moon=$('hero-moon'),marker=$('sun-marker'),remaining=$('daylight-remaining');
 var day=pos?pos.day:isDay();
 if(sun){sun.setAttribute('visibility',day?'visible':'hidden');sun.setAttribute('cx',pos?pos.x:160);sun.setAttribute('cy',pos?pos.y:70);}
 if(halo){halo.setAttribute('visibility',day?'visible':'hidden');halo.setAttribute('cx',pos?pos.x:160);halo.setAttribute('cy',pos?pos.y:70);}
 if(moon){moon.hidden=day;}
 if(marker&&pos){marker.setAttribute('cx',40+520*pos.progress);marker.setAttribute('cy',205-670*pos.progress*(1-pos.progress));marker.setAttribute('fill',day?'#f5ce6c':'#c4d2e8');}
 if(remaining){remaining.textContent=num(set)&&num(rise)?duration(Math.max(0,set-Math.max(rise,now))):'—';}
}
function connectionHelp(){
 openDialog('Connection help');var box=$('dialog-content');
 box.appendChild(el('p','','If this page opens but city search or weather fails, Safari may be unable to verify the weather service’s HTTPS certificate. WPA Wi-Fi and HTTPS certificate trust are separate.'));
 box.appendChild(el('p','','Check that the iPad’s date and time are correct. Then open the tests below. Text or JSON means the service can be reached; a certificate or secure-connection warning identifies a problem outside the page’s JavaScript.'));
 [['Test city search','https://geocoding-api.open-meteo.com/v1/search?name=London&count=1'],['Test weather','https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m']].forEach(function(a){var link=el('a','connection-link',a[0]);link.href=a[1];link.target='_blank';link.rel='noopener noreferrer';box.appendChild(link);});
 box.appendChild(el('p','note','These tests use public example locations, not your saved city. Do not bypass certificate warnings or switch to HTTP. A certificate-trust failure needs a verified device trust update or a weather relay with a certificate the iPad already trusts.'));
 box.appendChild(button('Back to settings',settings,'primary'));
}
function metric(label,text){var m=el('div','metric');m.appendChild(el('span','label',label));m.appendChild(el('strong','',text));return m;}
function heading(title,sub){$('main').appendChild(el('h1','page-heading',title));$('main').appendChild(el('p','subtitle',sub));}
function renderNow(){var d=weather.data,c=d.current,di=dayIndex(),h=hourIndex(),co=condition(c.weather_code,isDay()),s=el('section','now'),hero=el('div','hero-copy'),temp=el('div','temperature',fmt(c.temperature_2m));temp.appendChild(el('sup','','°'));hero.appendChild(el('p','eyebrow','RIGHT HERE, RIGHT NOW'));hero.appendChild(temp);hero.appendChild(el('h1','condition',co.name));s.appendChild(hero);s.appendChild(heroScene(co));var m=el('div','metrics');m.appendChild(metric('Feels like',fmt(c.apparent_temperature,'°')));m.appendChild(metric('High / Low',fmt(valueAt(d.daily,'temperature_2m_max',di),'°')+' / '+fmt(valueAt(d.daily,'temperature_2m_min',di),'°')));m.appendChild(metric('Rain this hour',fmt(valueAt(d.hourly,'precipitation_probability',h),'%')));m.appendChild(metric('Wind',fmt(c.wind_speed_10m,' mph')));s.appendChild(m);$('main').appendChild(s);}
function renderHourly(){var d=weather.data.hourly,start=hourIndex()+1+hourGroup*6,i,j,row=el('div','hour-grid');heading('A little look ahead','Next 24 hours · '+(hourGroup*6+1)+'–'+(hourGroup*6+6)+' hours ahead');for(i=0;i<6;i++){j=start+i;var n=el('div','hour'),co=condition(valueAt(d,'weather_code',j),valueAt(d,'is_day',j)===1);n.appendChild(el('span','',time(d.time[j])));var image=art(co.icon);image.alt=co.name;n.appendChild(image);n.appendChild(el('strong','',fmt(valueAt(d,'temperature_2m',j),'°')));n.appendChild(el('span','rain',fmt(valueAt(d,'precipitation_probability',j),'% rain')));n.appendChild(el('span','muted',fmt(valueAt(d,'wind_speed_10m',j),' mph')));row.appendChild(n);}$('main').appendChild(row);var groups=el('div','hour-pages');for(i=0;i<4;i++){(function(g){var b=button((g*6+1)+'–'+(g*6+6)+'h',function(){hourGroup=g;render();resetRotation();},g===hourGroup?'selected':'');b.setAttribute('aria-label','Show hours '+(g*6+1)+' through '+(g*6+6));groups.appendChild(b);}(i));}$('main').appendChild(groups);}
function renderWeek(){var d=weather.data.daily,start=dayIndex(),i,t=el('table','forecast');t.setAttribute('aria-label','Seven-day forecast');heading('The week ahead','A small forecast for your next big plans.');for(i=start;i<Math.min(start+7,d.time.length);i++){var r=el('tr'),co=condition(valueAt(d,'weather_code',i),true),desc=el('td');r.appendChild(el('td','',i===start?'Today':weekday(d.time[i])));var image=art(co.icon);image.alt=co.name;desc.appendChild(image);desc.appendChild(el('span','condition-name',co.name));r.appendChild(desc);r.appendChild(el('td','',fmt(valueAt(d,'temperature_2m_max',i),'°')+' / '+fmt(valueAt(d,'temperature_2m_min',i),'°')));r.appendChild(el('td','rain',fmt(valueAt(d,'precipitation_probability_max',i),'%')));t.appendChild(r);}$('main').appendChild(t);}
function direction(v){return num(v)?['N','NE','E','SE','S','SW','W','NW'][Math.round(v/45)%8]:'—';}
function renderDetails(){var d=weather.data,c=d.current,h=hourIndex(),items=[['Humidity',fmt(c.relative_humidity_2m,'%')],['Wind · '+direction(c.wind_direction_10m),fmt(c.wind_speed_10m,' mph')],['Wind gusts',fmt(c.wind_gusts_10m,' mph')],['Precipitation · current interval',fmt(c.precipitation,' in',2)],['Surface pressure',fmt(num(c.surface_pressure)?c.surface_pressure*0.029529983:null,' inHg',2)],['Visibility',fmt(num(valueAt(d.hourly,'visibility',h))?valueAt(d.hourly,'visibility',h)/1609.344:null,' mi',1)],['Dew point',fmt(valueAt(d.hourly,'dew_point_2m',h),'°F')],['UV index',fmt(valueAt(d.hourly,'uv_index',h),'',1)],['Cloud cover',fmt(c.cloud_cover,'%')]],box=el('div','details');heading('The finer details','A closer look at the air around you.');items.forEach(function(pair){var n=el('div','detail');n.appendChild(el('span','label',pair[0]));n.appendChild(el('strong','',pair[1]));box.appendChild(n);});$('main').appendChild(box);}
function duration(s){return num(s)?Math.floor(s/3600)+'h '+Math.floor((s%3600)/60)+'m':'—';}
function renderSun(){var d=weather.data.daily,i=dayIndex(),rise=valueAt(d,'sunrise',i),set=valueAt(d,'sunset',i),day=valueAt(d,'daylight_duration',i),panel=el('div','sun-panel'),times=el('div','sun-times'),m=el('div','metrics');heading('Sunshine & little moments','Follow the light, from first glow to last.');var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 600 230');svg.setAttribute('class','sun-path');svg.setAttribute('role','img');svg.setAttribute('aria-label','Sun path from sunrise to sunset');function shape(tag,attrs){var n=document.createElementNS('http://www.w3.org/2000/svg',tag),k;for(k in attrs){if(attrs.hasOwnProperty(k)){n.setAttribute(k,attrs[k]);}}svg.appendChild(n);return n;}shape('path',{d:'M40 205 Q300 -130 560 205',fill:'none',stroke:'#9caebd','stroke-width':'2','stroke-dasharray':'6 8'});shape('path',{d:'M20 205 H580',stroke:'#a9b8c4','stroke-width':'2'});if(num(rise)&&num(set)&&set>rise){var t=Math.max(0,Math.min(1,(Date.now()/1000-rise)/(set-rise))),x=40+520*t,y=205-670*t*(1-t);shape('circle',{id:'sun-marker',cx:x,cy:y,r:22,fill:isDay()?'#f5ce6c':'#c4d2e8'});}panel.appendChild(svg);[['Sunrise',rise],['Sunset',set]].forEach(function(a){var n=el('div','',a[0]);n.appendChild(el('strong','',time(a[1])));times.appendChild(n);});panel.appendChild(times);$('main').appendChild(panel);m.appendChild(metric('Daylight',duration(day)));var remaining=metric('Daylight remaining',num(set)&&num(rise)?duration(Math.max(0,set-Math.max(rise,Date.now()/1000))):'—');remaining.lastChild.id='daylight-remaining';m.appendChild(remaining);m.appendChild(metric('Daily max UV',fmt(valueAt(d,'uv_index_max',i),'',1)));$('main').appendChild(m);}
function render(){
 var c=city(),key=(c?c.id:'none')+':'+enabledPages()[pageIndex]+':'+hourGroup,version=++renderVersion;
 clearTimeout(transitionTimer);
 if(prefs.transitions&&weather&&displayedPage!==null&&displayedPage!==key&&!overlayOpen){
  $('main').className='page-leaving';
  transitionTimer=setTimeout(function(){
   if(version!==renderVersion){return;}
   renderContent();displayedPage=key;$('main').className='page-arriving';updateSky();
  },180);
 }else{
  $('main').className='';renderContent();displayedPage=key;updateSky();
 }
}
function renderContent(){var c=city(),pages=enabledPages(),name;theme();if(c){$('city-name').textContent=c.name;$('city-region').textContent=[c.admin1,c.country].filter(Boolean).join(' · ').toUpperCase();}clock();clear($('dots'));pages.forEach(function(p,i){var b=button('',function(){pageIndex=i;hourGroup=0;render();resetRotation();},i===pageIndex?'active':'');b.setAttribute('aria-label',PAGE_NAMES[p]);b.setAttribute('aria-current',i===pageIndex?'page':'false');$('dots').appendChild(b);});$('pause').textContent=paused||!prefs.rotate?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused||!prefs.rotate?'Resume rotation':'Pause rotation');$('previous').disabled=!weather;$('next').disabled=!weather;$('pause').disabled=!c;if(!c){return;}clear($('main'));if(!weather){var empty=el('section','empty');empty.appendChild(art('partly'));empty.appendChild(el('h2','',pending?'Gathering your forecast…':'The sky is out of reach'));empty.appendChild(el('p','',pending?'Just a moment.':'The city is saved, but the forecast has not loaded. Retry below or open Connection help.'));if(!pending){empty.appendChild(button('Try again',fetchWeather,'primary'));empty.appendChild(button('Connection help',connectionHelp));}$('main').appendChild(empty);return;}if(pageIndex>=pages.length){pageIndex=0;}name=pages[pageIndex];$('page-label').textContent=PAGE_NAMES[name].toUpperCase();({now:renderNow,hourly:renderHourly,week:renderWeek,details:renderDetails,sun:renderSun})[name]();}
function step(delta){if(!weather){return;}var pages=enabledPages();if(pages[pageIndex]==='hourly'&&hourGroup+delta>=0&&hourGroup+delta<=3){hourGroup+=delta;render();return;}var next=pageIndex+delta;if(next>=pages.length&&prefs.rotateCities&&prefs.cities.length>1){var ix=prefs.cities.indexOf(city());selectCity(prefs.cities[(ix+1)%prefs.cities.length]);return;}pageIndex=(next+pages.length)%pages.length;hourGroup=pages[pageIndex]==='hourly'&&delta<0?3:0;render();}
function resetRotation(){clearInterval(rotationTimer);rotationTimer=setInterval(function(){if(prefs.rotate&&!paused&&!overlayOpen&&!document.hidden){step(1);}},prefs.seconds*1000);}
function resetTimers(){resetRotation();clearInterval(refreshTimer);refreshTimer=setInterval(function(){if(!document.hidden){fetchWeather();}},prefs.refresh*60000);}
function openDialog(title){if(!overlayOpen){lastFocus=document.activeElement;}overlayOpen=true;$('dialog-title').textContent=title;clear($('dialog-content'));$('overlay').hidden=false;$('main').setAttribute('aria-hidden','true');$('close').focus();}
function closeDialog(){searchGeneration++;clearTimeout(searchTimer);overlayOpen=false;$('overlay').hidden=true;$('main').removeAttribute('aria-hidden');resetRotation();if(lastFocus&&document.documentElement.contains(lastFocus)){lastFocus.focus();}}
function search(){openDialog('Find your little corner');var box=$('dialog-content'),input=el('input','search-input'),results=el('div','results'),hint=el('p','note','Search a city anywhere in the world. No GPS needed.');input.type='search';input.placeholder='City name';input.setAttribute('aria-label','Search cities');input.autocomplete='off';input.maxLength=100;box.appendChild(input);box.appendChild(hint);box.appendChild(results);if(prefs.cities.length){prefs.cities.forEach(function(c){results.appendChild(button(c.name+' · '+(c.admin1||c.country||''),function(){selectCity(c);}));});}input.oninput=function(){var q=input.value.replace(/^\s+|\s+$/g,''),token=++searchGeneration;clearTimeout(searchTimer);if(q.length<2){clear(results);hint.textContent='Enter at least two characters.';return;}hint.textContent='Searching…';searchTimer=setTimeout(function(){request('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(q)+'&count=10&language=en&format=json',function(err,d){if(token!==searchGeneration||!overlayOpen){return;}clear(results);if(err){hint.textContent=err+' Edit your search to retry.';return;}var matches=d&&d.results instanceof Array?d.results.filter(validCity):[];hint.textContent=matches.length?'Choose your city below.':'No cities found. Try a nearby city or another spelling.';matches.forEach(function(c){var b=button(c.name,function(){var existing=prefs.cities.filter(function(s){return s.id===c.id;})[0];if(!existing){if(prefs.cities.length>=12){hint.textContent='You can save up to 12 cities. Remove one in Settings first.';return;}existing={id:c.id,name:c.name,latitude:c.latitude,longitude:c.longitude,admin1:c.admin1||'',country:c.country||'',timezone:typeof c.timezone==='string'?c.timezone:''};prefs.cities.push(existing);}if(typeof c.timezone==='string'){existing.timezone=c.timezone;}selectCity(existing);});b.appendChild(el('small','',[c.admin1,c.country].filter(Boolean).join(' · ')));results.appendChild(b);});});},350);};input.focus();}
function settings(){openDialog('Make it yours');var box=$('dialog-content');function title(t){box.appendChild(el('h3','section-title',t));}function select(label,key,options){var row=el('div','setting'),lab=el('label','',label),s=el('select');s.id='setting-'+key;lab.htmlFor=s.id;options.forEach(function(o){var n=el('option','',o[1]);n.value=o[0];n.selected=String(prefs[key])===String(o[0]);s.appendChild(n);});s.onchange=function(){prefs[key]=typeof DEFAULTS[key]==='number'?Number(s.value):s.value;save();theme();resetTimers();};row.appendChild(lab);row.appendChild(s);box.appendChild(row);}function toggle(label,key){var row=el('div','setting'),lab=el('label','',label),b=el('input');b.type='checkbox';b.id='setting-'+key;b.checked=prefs[key];lab.htmlFor=b.id;b.onchange=function(){prefs[key]=b.checked;save();theme();resetTimers();};row.appendChild(lab);row.appendChild(b);box.appendChild(row);}title('Your display');toggle('Automatically rotate pages','rotate');select('Time on each page','seconds',[[10,'10 seconds'],[20,'20 seconds'],[30,'30 seconds'],[60,'60 seconds']]);select('Appearance','appearance',[['auto','Follow sunrise & sunset'],['light','Always light'],['dark','Always dark']]);select('Accent palette','palette',[['sky','Soft sky'],['rose','Rose quartz'],['sage','Sea glass']]);toggle('Large text','large');toggle('Fade between pages','transitions');toggle('Drifting clouds','animation');select('Refresh weather','refresh',[[10,'Every 10 minutes'],[15,'Every 15 minutes'],[30,'Every 30 minutes']]);title('Pages · choose & reorder');prefs.pages.forEach(function(p,i){var row=el('div','order-row'),label=el('span'),check=el('input'),actions=el('span','order-actions');check.type='checkbox';check.checked=prefs.enabled[p];check.setAttribute('aria-label','Enable '+PAGE_NAMES[p]);check.onchange=function(){if(!check.checked&&enabledPages().length===1){check.checked=true;return;}prefs.enabled[p]=check.checked;pageIndex=0;hourGroup=0;save();};label.appendChild(check);label.appendChild(document.createTextNode(PAGE_NAMES[p]));row.appendChild(label);addMove(actions,prefs.pages,i,function(){save();settings();},PAGE_NAMES[p]);row.appendChild(actions);box.appendChild(row);});box.appendChild(el('p','note','Hourly shows four groups of six hours before the next page. At least one page stays on.'));title('Saved cities');toggle('Rotate cities after all pages','rotateCities');prefs.cities.forEach(function(c,i){var row=el('div','order-row'),name=el('span','',c.name),actions=el('span','order-actions');row.appendChild(name);addMove(actions,prefs.cities,i,function(){save();settings();},c.name);var remove=button('×',function(){prefs.cities.splice(i,1);if(prefs.selected===c.id){generation++;weather=null;prefs.selected=prefs.cities.length?prefs.cities[0].id:null;if(city()){weather=cacheGet(city());fetchWeather();}}save();if(!city()){window.location.reload();return;}settings();});remove.setAttribute('aria-label','Remove '+c.name);actions.appendChild(remove);row.appendChild(actions);box.appendChild(row);});box.appendChild(button('+ Add a city',search,'primary'));box.appendChild(el('p','note','All temperatures are °F. Wind uses mph, precipitation inches, visibility miles, and pressure inHg. Time is always 24-hour and local to the selected city.'));title('Connection');box.appendChild(button('Connection help',connectionHelp,'primary'));title('Just on this device');box.appendChild(el('p','note','Your cities and settings stay in this browser. City searches and weather requests go to Open-Meteo, which receives your IP address. No GPS, accounts, ads, or analytics. '+(!storageOK?'Browser storage is unavailable; changes will last only for this session.':'')));box.appendChild(button('Reset local preferences',function(){if(window.confirm('Remove saved cities, settings, and cached weather from this browser?')){try{localStorage.removeItem(KEY);localStorage.removeItem(CACHE);}catch(e){}window.location.reload();}},'danger'));}
function addMove(parent,list,index,done,label){[-1,1].forEach(function(dir){var b=button(dir===-1?'↑':'↓',function(){var other=index+dir,temp=list[index];list[index]=list[other];list[other]=temp;done();});b.disabled=index+dir<0||index+dir>=list.length;b.setAttribute('aria-label','Move '+label+(dir===-1?' up':' down'));parent.appendChild(b);});}
$('start').onclick=search;$('city-button').onclick=search;$('settings-button').onclick=settings;$('close').onclick=function(){closeDialog();render();};$('previous').onclick=function(){step(-1);resetRotation();};$('next').onclick=function(){step(1);resetRotation();};$('pause').onclick=function(){if(!prefs.rotate){prefs.rotate=true;paused=false;save();}else{paused=!paused;}render();resetRotation();};$('overlay').onclick=function(e){if(e.target===$('overlay')){closeDialog();render();}};
document.addEventListener('keydown',function(e){if(!overlayOpen){return;}if(e.keyCode===27){closeDialog();render();}if(e.keyCode===9){var nodes=$('overlay').querySelectorAll('button:not([disabled]),input,select,a[href]'),first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
document.addEventListener('visibilitychange',function(){if(!document.hidden){clock();if(city()&&(!weather||Date.now()-weather.saved>=prefs.refresh*60000)){fetchWeather();}resetRotation();}});
load();if(city()){weather=cacheGet(city());pending=true;render();ensureTimezone(city());fetchWeather();}else{theme();}resetTimers();setInterval(function(){clock();theme();updateSky();},10000);
}());
