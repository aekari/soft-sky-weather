(function () {
'use strict';
var KEY = 'soft-sky-v1', CACHE = 'soft-sky-weather-v1';
var PAGE_NAMES = {now:'Now',hourly:'Next 24 hours',week:'Seven days',details:'Conditions',sun:'Sun & sky',moon:'Moon'};
var DEFAULTS = {cities:[{id:4140963,name:"Washington, DC",admin1:"District of Columbia",country:"United States",latitude:38.89511,longitude:-77.03637,timezone:"America/New_York"}],selected:4140963,orderVersion:2,pages:['now','details','sun','moon','week','hourly'],enabled:{now:true,hourly:true,week:true,details:true,sun:true,moon:false},rotate:true,seconds:20,rotateCities:false,appearance:'auto',palette:'sky',scene:'mountain',large:false,animation:true,transitions:true,refresh:15};
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
function load(){var p=read(KEY),k,keys=['rotate','rotateCities','large','transitions'];if(!p){return;}if(p.cities instanceof Array){prefs.cities=p.cities.filter(validCity).slice(0,12);if(!prefs.cities.length){prefs.cities=copy(DEFAULTS.cities);}}prefs.selected=p.selected;if(!city()){prefs.selected=prefs.cities.length?prefs.cities[0].id:null;}for(k=0;k<keys.length;k++){if(typeof p[keys[k]]==='boolean'){prefs[keys[k]]=p[keys[k]];}}if([10,20,30,60].indexOf(p.seconds)>=0){prefs.seconds=p.seconds;}if([10,15,30].indexOf(p.refresh)>=0){prefs.refresh=p.refresh;}if(['auto','light','dark'].indexOf(p.appearance)>=0){prefs.appearance=p.appearance;}if(['sky','rose','sage'].indexOf(p.palette)>=0){prefs.palette=p.palette;}if(['mountain','tropical','city','winter'].indexOf(p.scene)>=0){prefs.scene=p.scene;}if(p.pages instanceof Array && (p.pages.length===5||p.pages.length===6) && p.pages.filter(function(x,i,a){return PAGE_NAMES[x]&&a.indexOf(x)===i;}).length===p.pages.length){prefs.pages=p.orderVersion!==2&&p.pages.join(',')==='now,hourly,week,details,sun'?copy(DEFAULTS.pages):p.pages.slice(0);if(prefs.pages.indexOf('moon')<0){prefs.pages.splice(prefs.pages.indexOf('sun')+1,0,'moon');}}if(p.enabled){for(k in PAGE_NAMES){if(PAGE_NAMES.hasOwnProperty(k)&&typeof p.enabled[k]==='boolean'){prefs.enabled[k]=p.enabled[k];}}}if(!enabledPages().length){prefs.enabled.now=true;}}
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
  /* A fresh URL avoids reusing a failed cached CORS response. Accept is a
     CORS-safelisted header; no custom headers or credentials are added. */
  var fresh=attempt>1&&url.indexOf('https://api.open-meteo.com/v1/forecast?')===0;
  x.open('GET',fresh?url+'&_softsky='+Date.now():url,true);x.timeout=45000;
  if(fresh){x.setRequestHeader('Accept','application/json');}
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
function selectCity(c){moonDrawnAt=0;prefs.selected=c.id;save();generation++;pending=true;weather=cacheGet(c);pageIndex=0;hourGroup=0;closeDialog();render();ensureTimezone(c);fetchWeather();resetTimers();}
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
function time(timestamp){if(!num(timestamp)){return '—';}var d=localDate(timestamp),h=d.getUTCHours();return (h%12||12)+':'+pad(d.getUTCMinutes())+(h<12?' AM':' PM');}
function hourlyTime(timestamp){if(!num(timestamp)){return '—';}var d=localDate(timestamp),h=d.getUTCHours(),m=d.getUTCMinutes();return (h%12||12)+(m?':'+pad(m):'')+(h<12?' AM':' PM');}
function weekday(timestamp){return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][localDate(timestamp).getUTCDay()];}
function clock(){var c=city(),d;if(!c||!num(currentOffset(Date.now()/1000))){$('clock').textContent='--:--';$('date').textContent=c?'TIME ZONE UNAVAILABLE':'WELCOME HOME';return;}d=localDate(Date.now()/1000);$('clock').textContent=time(Date.now()/1000);$('date').textContent=weekday(Date.now()/1000).toUpperCase()+' '+pad(d.getUTCDate())+' '+['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()]+' '+d.getUTCFullYear();$('updated').textContent=weather?'Updated '+time(weather.saved/1000)+(Date.now()-weather.saved>prefs.refresh*60000+60000?' · STALE':''):'Waiting for weather · City clock is available';}
function condition(code,day){if(code===0){return {name:day?'Clear sky':'Clear night',icon:day?'sun':'moon'};}if(code===1||code===2){return {name:'Partly cloudy',icon:day?'partly':'night-cloud'};}if(code===3){return {name:'Overcast',icon:'cloud'};}if(code===45||code===48){return {name:'Misty skies',icon:'fog'};}if([71,73,75,77,85,86].indexOf(code)>=0){return {name:'Snow',icon:'snow'};}if(code>=95){return {name:'Thunderstorms',icon:'storm'};}if([51,53,55,56,57].indexOf(code)>=0){return {name:'Drizzle',icon:'rain'};}if([61,63,65,66,67,80,81,82].indexOf(code)>=0){return {name:'Rain showers',icon:'rain'};}return {name:'Conditions unavailable',icon:'cloud'};}
function art(icon,cls){var img=el('img',cls);img.setAttribute('data-weather-icon',icon);img.src='assets/'+(document.getElementById('app').className.indexOf('night')<0?'contrast/':'')+icon+'.svg';img.alt='';return img;}
function valueAt(obj,key,index){return obj&&obj[key] instanceof Array?obj[key][index]:null;}
function hourIndex(){var times=weather.data.hourly.time,now=Date.now()/1000,i;for(i=times.length-1;i>=0;i--){if(times[i]<=now){return i;}}return 0;}
function dayIndex(){var a=weather.data.daily.time,n=Date.now()/1000,i;for(i=a.length-1;i>=0;i--){if(a[i]<=n){return i;}}return 0;}
function isDay(){var d=weather.data,di=dayIndex(),rise=valueAt(d.daily,'sunrise',di),set=valueAt(d.daily,'sunset',di),now=Date.now()/1000;return num(rise)&&num(set)?now>=rise&&now<set:d.current.is_day===1;}
/* Blend colors over the city's solar day; gradients themselves do not animate
   reliably in iOS 9, so each clock tick supplies a small color step. */
function skyColors(now,rise,set,palette){
 var day=palette==='rose'?[[212,199,234],[242,224,228],[255,240,216]]:palette==='sage'?[[186,219,217],[227,233,219],[255,240,216]]:[[167,211,243],[223,231,243],[255,240,216]],
 night=[[20,36,62],[41,59,90],[86,96,117]],warm=[[151,151,195],[236,180,179],[255,214,167]],span=set-rise,points,i,j,t,out=[];
 if(!num(rise)||!num(set)||span<=0){return null;}
 points=[[rise-3600,night],[rise,warm],[rise+span*.2,day],[rise+span*.55,day],[set,warm],[set+3600,night]];
 if(now<=points[0][0]||now>=points[5][0]){return night;}
 for(i=1;i<points.length;i++){if(now<=points[i][0]){t=(now-points[i-1][0])/(points[i][0]-points[i-1][0]);t=t*t*(3-2*t);for(j=0;j<3;j++){out.push(points[i-1][1][j].map(function(v,k){return Math.round(v+(points[i][1][j][k]-v)*t);}));}return out;}}
 return night;
}
/* Persistent illustrated scenery. Only opacity/position changes between ticks. */
var sceneName = '', moonDrawnAt = 0;
function smooth(v){v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);}
function sceneWeights(altitude){
 var warm=smooth((altitude+12)/10),day=smooth((altitude+2)/22);
 return {night:1-warm, sunset:warm*(1-day), day:day};
}
function effectiveScene(name,month){return name==='winter'&&month!==11?'mountain':name;}
function lunarState(timestamp){
 var m=window.SunCalc.getMoonIllumination(new Date(timestamp*1000));
 var names=['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'];
 m.name=names[Math.round(m.phase*8)%8];return m;
}
/* Outline the lit part of a sphere, including a curved terminator. */
function moonOutline(fraction,waxing){
 var points=[],i,y,x,side=waxing?1:-1,k=1-2*Math.max(0,Math.min(1,fraction));
 for(i=0;i<=64;i++){y=-35+70*i/64;x=Math.sqrt(Math.max(0,1225-y*y));points.push((50+side*x)+','+(50+y));}
 for(i=64;i>=0;i--){y=-35+70*i/64;x=Math.sqrt(Math.max(0,1225-y*y));points.push((50+side*k*x)+','+(50+y));}
 return 'M'+points.join(' L')+' Z';
}
function initMoon(){
 var svg=svgNode('svg',{viewBox:'0 0 100 100','aria-hidden':'true'}),defs=svgNode('defs',{}),clip=svgNode('clipPath',{id:'lunar-clip'});
 clip.appendChild(svgNode('path',{id:'lunar-shape',d:''}));defs.appendChild(clip);svg.appendChild(defs);
 svg.appendChild(svgNode('circle',{cx:50,cy:50,r:35,fill:'#273553'}));
 var image=svgNode('image',{x:0,y:0,width:100,height:100,'clip-path':'url(#lunar-clip)'});
 image.setAttributeNS('http://www.w3.org/1999/xlink','href','assets/layers/moon-disk.png');svg.appendChild(image);$('scene-moon').appendChild(svg);
}
function celestialIsDay(alt,appearance){return appearance==='light'||(appearance!=='dark'&&alt>=-0.833);}
function sceneryOptions(month){var options=[['mountain','Mountain forest'],['tropical','Tropical coast'],['city','City skyline']];if(month===11){options.push(['winter','Christmas']);}return options;}
var celestialDay=null,celestialTimer,celestialVersion=0;
function setCelestial(daylight,cover){
 var sun=$('scene-sun'),moon=$('scene-moon-wrap'),incoming=daylight?sun:moon,outgoing=daylight?moon:sun,version;
 if(celestialDay===null){sun.hidden=!daylight;moon.hidden=daylight;sun.style.opacity=daylight?1-cover*.75:0;moon.style.opacity=daylight?0:1-cover*.65;celestialDay=daylight;return;}
 if(celestialDay!==daylight){
  celestialDay=daylight;version=++celestialVersion;clearTimeout(celestialTimer);
  sun.style.opacity=0;moon.style.opacity=0;
  celestialTimer=setTimeout(function(){if(version!==celestialVersion){return;}outgoing.hidden=true;incoming.hidden=false;incoming.style.opacity=0;void incoming.offsetWidth;incoming.style.opacity=daylight?1-cover*.75:1-cover*.65;},650);
 }else{incoming.style.opacity=daylight?1-cover*.75:1-cover*.65;}
}
function updateLandscape(){
 var now=Date.now()/1000,c=city(),date=new Date(now*1000),alt=c?window.SunCalc.getPosition(date,c.latitude,c.longitude).altitude*180/Math.PI:35;
 var weights=sceneWeights(alt),name=effectiveScene(prefs.scene,localDate(now).getUTCMonth()),m,cover=weather&&num(weather.data.current.cloud_cover)?weather.data.current.cloud_cover/100:0.2;
 if(prefs.appearance==='light'){weights={night:0,sunset:0,day:1};}
 if(prefs.appearance==='dark'){weights={night:1,sunset:0,day:0};}
 if(sceneName!==name){['night','sunset','day'].forEach(function(p){$('scene-'+p).src='assets/scenes/'+name+'-'+p+'.png';});sceneName=name;}
 $('scene-day').style.opacity=weights.day;
 $('scene-sunset').style.opacity=weights.day<1?weights.sunset/(1-weights.day):0;
 $('scene-stars').style.opacity=weights.night*(1-cover*.9);
 $('scene-clouds').style.opacity=.15+cover*.8;
 ['far','front'].forEach(function(depth){
  $('cloud-'+depth+'-day').style.opacity=weights.day;
  $('cloud-'+depth+'-sunset').style.opacity=weights.sunset;
  $('cloud-'+depth+'-night').style.opacity=weights.night;
 });
 var daylight=celestialIsDay(alt,prefs.appearance);
 setCelestial(daylight,cover);
 if(c){
  var times=window.SunCalc.getTimes(date,c.latitude,c.longitude),pos=solarPosition(now,times.sunrise.valueOf()/1000,times.sunset.valueOf()/1000);
  if(pos){$('scene-sun').style.left=(55+pos.progress*24)+'%';$('scene-sun').style.top=(36-20*Math.sin(Math.PI*pos.progress))+'%';}
 }
 if(!moonDrawnAt||now-moonDrawnAt>60){
  m=lunarState(now);$('lunar-shape').setAttribute('d',moonOutline(m.fraction,m.phase<.5));
  $('scene-moon').style.webkitTransform=$('scene-moon').style.transform=c&&c.latitude<0?'rotate(180deg)':'none';
  $('scene-moon-wrap').setAttribute('data-phase',m.name);document.querySelector('.moon-haze').style.opacity=.12+.88*m.fraction;moonDrawnAt=now;
 }
 if($('moon-phase-label')){$('moon-phase-label').textContent=lunarState(now).name;}
 if($('moon-lit-label')){$('moon-lit-label').textContent=Math.round(lunarState(now).fraction*100)+'% lit';}
 return weights;
}

function theme(){
 var weights=updateLandscape(),cls='sky scene-'+sceneName;
 if(weights.night>.45){cls+=' night';}
 if(prefs.large){cls+=' large';}cls+=' animate';
 $('app').className=cls;
 var icons=document.querySelectorAll('[data-weather-icon]'),i;for(i=0;i<icons.length;i++){icons[i].src='assets/'+(weights.night>.45?'':'contrast/')+icons[i].getAttribute('data-weather-icon')+'.svg';}
}
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
 var frame=el('div','hero-art condition-scene');
 if(['rain','snow','storm','fog'].indexOf(co.icon)>=0){frame.appendChild(art(co.icon,'condition-weather'));}
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
function connectionCheckLink(){var link=el('a','connection-link','Connection check');link.href='diagnostics.html?v=8';return link;}
function connectionHelp(){
 openDialog('Connection help');var box=$('dialog-content');
 var diagnosticLink=el('a','connection-link','Run an in-page connection check');diagnosticLink.href='diagnostics.html?v=8';box.appendChild(diagnosticLink);box.appendChild(el('p','','This check compares the website, city search, and weather requests. A network error can have several causes; it does not mean your Wi-Fi settings need changing. All requests use HTTPS.'));
 box.appendChild(el('p','','Check that the iPad’s date and time are correct. Then open the tests below. Text or JSON means the service can be reached; a certificate or secure-connection warning identifies a problem outside the page’s JavaScript.'));
 [['Test city search','https://geocoding-api.open-meteo.com/v1/search?name=London&count=1'],['Test weather','https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m']].forEach(function(a){var link=el('a','connection-link',a[0]);link.href=a[1];link.target='_blank';link.rel='noopener noreferrer';box.appendChild(link);});
 box.appendChild(el('p','note','These tests use public example locations, not your saved city. Do not bypass certificate warnings or switch to HTTP. A certificate-trust failure needs a verified device trust update or a weather relay with a certificate the iPad already trusts.'));
 box.appendChild(button('Back to settings',settings,'primary'));
}
function metric(label,text){var m=el('div','metric');m.appendChild(el('span','label',label));m.appendChild(el('strong','',text));return m;}
function heading(title,sub){$('main').appendChild(el('h1','page-heading',title));$('main').appendChild(el('p','subtitle',sub));}
function renderNow(){var d=weather.data,c=d.current,di=dayIndex(),h=hourIndex(),co=condition(c.weather_code,isDay()),s=el('section','now'),hero=el('div','hero-copy'),temp=el('div','temperature',fmt(c.temperature_2m));temp.appendChild(el('sup','','°'));hero.appendChild(el('p','eyebrow','RIGHT HERE, RIGHT NOW'));hero.appendChild(temp);hero.appendChild(el('h1','condition',co.name));s.appendChild(hero);s.appendChild(heroScene(co));var m=el('div','metrics');m.appendChild(metric('Feels like',fmt(c.apparent_temperature,'°')));m.appendChild(metric('High / Low',fmt(valueAt(d.daily,'temperature_2m_max',di),'°')+' / '+fmt(valueAt(d.daily,'temperature_2m_min',di),'°')));m.appendChild(metric('Rain this hour',fmt(valueAt(d.hourly,'precipitation_probability',h),'%')));m.appendChild(metric('Wind',fmt(c.wind_speed_10m,' mph')));s.appendChild(m);$('main').appendChild(s);}
function renderHourly(){var d=weather.data.hourly,start=hourIndex()+1+hourGroup*6,i,j,row=el('div','hour-grid');heading('Hourly Forecast','Next 24 hours · '+(hourGroup*6+1)+'–'+(hourGroup*6+6)+' hours ahead');for(i=0;i<6;i++){j=start+i;var n=el('div','hour'),co=condition(valueAt(d,'weather_code',j),valueAt(d,'is_day',j)===1);n.appendChild(el('span','',hourlyTime(d.time[j])));var image=art(co.icon);image.alt=co.name;n.appendChild(image);n.appendChild(el('strong','',fmt(valueAt(d,'temperature_2m',j),'°')));n.appendChild(el('span','rain',fmt(valueAt(d,'precipitation_probability',j),'% rain')));n.appendChild(el('span','muted',fmt(valueAt(d,'wind_speed_10m',j),' mph')));row.appendChild(n);}$('main').appendChild(row);var groups=el('div','hour-pages');for(i=0;i<4;i++){(function(g){var b=button((g*6+1)+'–'+(g*6+6)+'h',function(){hourGroup=g;render();resetRotation();},g===hourGroup?'selected':'');b.setAttribute('aria-label','Show hours '+(g*6+1)+' through '+(g*6+6));groups.appendChild(b);}(i));}$('main').appendChild(groups);}
function renderWeek(){var d=weather.data.daily,start=dayIndex(),i,t=el('table','forecast');t.setAttribute('aria-label','Seven-day forecast');heading('The week ahead','A small forecast for your next big plans.');for(i=start;i<Math.min(start+7,d.time.length);i++){var r=el('tr'),co=condition(valueAt(d,'weather_code',i),true),desc=el('td');r.appendChild(el('td','',i===start?'Today':weekday(d.time[i])));var image=art(co.icon);image.alt=co.name;desc.appendChild(image);desc.appendChild(el('span','condition-name',co.name));r.appendChild(desc);r.appendChild(el('td','',fmt(valueAt(d,'temperature_2m_max',i),'°')+' / '+fmt(valueAt(d,'temperature_2m_min',i),'°')));r.appendChild(el('td','rain',fmt(valueAt(d,'precipitation_probability_max',i),'%')));t.appendChild(r);}$('main').appendChild(t);}
function direction(v){return num(v)?['N','NE','E','SE','S','SW','W','NW'][Math.round(v/45)%8]:'—';}
function renderDetails(){var d=weather.data,c=d.current,h=hourIndex(),items=[['Humidity',fmt(c.relative_humidity_2m,'%')],['Wind · '+direction(c.wind_direction_10m),fmt(c.wind_speed_10m,' mph')],['Wind gusts',fmt(c.wind_gusts_10m,' mph')],['Precipitation · current interval',fmt(c.precipitation,' in',2)],['Surface pressure',fmt(num(c.surface_pressure)?c.surface_pressure*0.029529983:null,' inHg',2)],['Visibility',fmt(num(valueAt(d.hourly,'visibility',h))?valueAt(d.hourly,'visibility',h)/1609.344:null,' mi',1)],['Dew point',fmt(valueAt(d.hourly,'dew_point_2m',h),'°F')],['UV index',fmt(valueAt(d.hourly,'uv_index',h),'',1)],['Cloud cover',fmt(c.cloud_cover,'%')]],box=el('div','details');heading('The finer details','A closer look at the air around you.');items.forEach(function(pair){var n=el('div','detail');n.appendChild(el('span','label',pair[0]));n.appendChild(el('strong','',pair[1]));box.appendChild(n);});$('main').appendChild(box);}
function duration(s){return num(s)?Math.floor(s/3600)+'h '+Math.floor((s%3600)/60)+'m':'—';}
/* Approximate tropical longitude, using the same compact lunar model as SunCalc. */
function moonSign(timestamp){
 var d=timestamp/86400+2440587.5-2451545,rad=Math.PI/180;
 var longitude=((218.316+13.176396*d+6.289*Math.sin((134.963+13.064993*d)*rad))%360+360)%360;
 var names=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
 var index=Math.floor(longitude/30),degree=longitude%30;
 return {name:names[index],nearBoundary:degree<2||degree>28};
}
function nextMoonPhase(now,target){
 /* Locate the next illumination extremum. The signed phase value can turn
    briefly near conjunction, so it is not a monotonic root-finding target. */
 function value(t){var f=lunarState(t).fraction;return target===0?f:-f;}
 var left=now-21600,mid=now,right,i,lo,hi,m1,m2,j,event;
 for(i=1;i<=140;i++){
  right=now+i*21600;
  if(value(mid)<=value(left)&&value(mid)<=value(right)){
   lo=left;hi=right;
   for(j=0;j<24;j++){m1=lo+(hi-lo)/3;m2=hi-(hi-lo)/3;if(value(m1)<value(m2)){hi=m2;}else{lo=m1;}}
   event=(lo+hi)/2;if(event>now+1){return event;}
  }
  left=mid;mid=right;
 }
 return null;
}
function cityDayKey(timestamp){var d=localDate(timestamp);return d.getUTCFullYear()+'-'+d.getUTCMonth()+'-'+d.getUTCDate();}
function moonEvents(now,c){
 var result={rise:null,set:null},today=cityDayKey(now),base=Math.floor(now/86400)*86400,i,t,key;
 for(i=-1;i<=1;i++){
  t=window.SunCalc.getMoonTimes(new Date((base+i*86400)*1000),c.latitude,c.longitude,true);
  for(key in result){if(result.hasOwnProperty(key)&&t[key]&&isFinite(t[key].valueOf())&&cityDayKey(t[key].valueOf()/1000)===today){result[key]=t[key].valueOf()/1000;}}
 }
 return result;
}
function moonDate(timestamp){if(!num(timestamp)){return '—';}var d=localDate(timestamp);return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]+' '+d.getUTCDate();}
var moonPageUpdated=0;
function renderMoon(){
 moonPageUpdated=Date.now();
 var now=Date.now()/1000,c=city(),m=lunarState(now),sign=moonSign(now),box=el('section','moon-page'),hero=el('div','moon-summary'),picture=el('div','moon-portrait'),copyBox=el('div','moon-copy'),grid=el('div','moon-facts');
 heading('The moon','');
 var halo=el('img','moon-page-haze');halo.src='assets/layers/moon-halo.png';halo.alt='';picture.appendChild(halo);
 var svg=svgNode('svg',{viewBox:'0 0 100 100',role:'img','aria-label':m.name+', '+Math.round(m.fraction*100)+' percent illuminated'});
 svg.appendChild(svgNode('circle',{cx:50,cy:50,r:35,fill:'#344363'}));
 svg.appendChild(svgNode('path',{d:moonOutline(m.fraction,m.phase<.5),fill:'#fff3d7'}));
 if(c.latitude<0){svg.style.webkitTransform=svg.style.transform='rotate(180deg)';}picture.appendChild(svg);hero.appendChild(picture);
 copyBox.appendChild(el('h2','moon-phase-title',m.name));hero.appendChild(copyBox);box.appendChild(hero);
 function fact(label,value,extra){var n=metric(label,value);if(extra){n.appendChild(el('span','moon-fact-extra',extra));}grid.appendChild(n);}
 fact('Illuminated',Math.round(m.fraction*100)+'%');fact('Moon in',sign.name,'Tropical zodiac · approximate'+(sign.nearBoundary?' · near a sign change':''));
 var full=nextMoonPhase(now,.5),fresh=nextMoonPhase(now,0);
 fact('Next full moon',moonDate(full),'About '+time(full));fact('Next new moon',moonDate(fresh),'About '+time(fresh));
 box.appendChild(grid);box.appendChild(el('p','moon-note','Estimated times · local to '+c.name));$('main').appendChild(box);
}

function renderSun(){var d=weather.data.daily,i=dayIndex(),rise=valueAt(d,'sunrise',i),set=valueAt(d,'sunset',i),day=valueAt(d,'daylight_duration',i),panel=el('div','sun-panel'),times=el('div','sun-times'),m=el('div','metrics sun-metrics');heading('The sun','Follow the light, from first glow to last.');var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 600 230');svg.setAttribute('class','sun-path');svg.setAttribute('role','img');svg.setAttribute('aria-label','Sun path from sunrise to sunset');function shape(tag,attrs){var n=document.createElementNS('http://www.w3.org/2000/svg',tag),k;for(k in attrs){if(attrs.hasOwnProperty(k)){n.setAttribute(k,attrs[k]);}}svg.appendChild(n);return n;}shape('path',{d:'M40 205 Q300 -130 560 205',fill:'none',stroke:'#9caebd','stroke-width':'2','stroke-dasharray':'6 8'});shape('path',{d:'M20 205 H580',stroke:'#a9b8c4','stroke-width':'2'});if(num(rise)&&num(set)&&set>rise){var t=Math.max(0,Math.min(1,(Date.now()/1000-rise)/(set-rise))),x=40+520*t,y=205-670*t*(1-t);shape('circle',{id:'sun-marker',cx:x,cy:y,r:22,fill:isDay()?'#f5ce6c':'#c4d2e8'});}panel.appendChild(svg);[['Sunrise',rise],['Sunset',set]].forEach(function(a){var n=el('div','',a[0]);n.appendChild(el('strong','',time(a[1])));times.appendChild(n);});panel.appendChild(times);$('main').appendChild(panel);m.appendChild(metric('Daylight',duration(day)));var remaining=metric('Daylight remaining',num(set)&&num(rise)?duration(Math.max(0,set-Math.max(rise,Date.now()/1000))):'—');remaining.lastChild.id='daylight-remaining';m.appendChild(remaining);$('main').appendChild(m);}
var outgoingPage=null;
function removeOutgoing(){if(outgoingPage&&outgoingPage.parentNode){outgoingPage.parentNode.removeChild(outgoingPage);}outgoingPage=null;}
function render(){
 var c=city(),key=(c?c.id:'none')+':'+enabledPages()[pageIndex]+':'+hourGroup,version=++renderVersion,main=$('main'),old,i,nodes;
 clearTimeout(transitionTimer);removeOutgoing();main.className='';
 if(prefs.transitions&&weather&&displayedPage!==null&&displayedPage!==key&&!overlayOpen){
  old=main.cloneNode(true);old.removeAttribute('id');old.className='page-outgoing';old.setAttribute('aria-hidden','true');
  nodes=old.querySelectorAll('[id]');for(i=0;i<nodes.length;i++){nodes[i].removeAttribute('id');}
  nodes=old.querySelectorAll('button,input,select,a');for(i=0;i<nodes.length;i++){nodes[i].setAttribute('tabindex','-1');}
  old.style.top=main.offsetTop+'px';old.style.left=main.offsetLeft+'px';old.style.width=main.offsetWidth+'px';
  $('app').appendChild(old);outgoingPage=old;
  renderContent();displayedPage=key;updateSky();
  main.className='page-preparing';
  /* Commit both starting opacities before a simultaneous dissolve. */
  old.offsetWidth;main.offsetWidth;
  main.className='page-arriving';old.style.opacity='0';
  transitionTimer=setTimeout(function(){if(version===renderVersion){removeOutgoing();}},850);
 }else{renderContent();displayedPage=key;updateSky();}
}
function renderContent(){var c=city(),pages=enabledPages(),name;$('navigation').hidden=!c;theme();if(c){$('city-name').textContent=c.name;$('city-region').textContent=[c.admin1,c.country].filter(Boolean).join(' · ').toUpperCase();}clock();clear($('dots'));pages.forEach(function(p,i){var b=button('',function(){pageIndex=i;hourGroup=0;render();resetRotation();},i===pageIndex?'active':'');b.setAttribute('aria-label',PAGE_NAMES[p]);b.setAttribute('aria-current',i===pageIndex?'page':'false');$('dots').appendChild(b);});$('pause').textContent='';$('pause').className=paused||!prefs.rotate?'rotation-play':'rotation-pause';$('pause').setAttribute('aria-label',paused||!prefs.rotate?'Resume rotation':'Pause rotation');$('previous').disabled=!weather;$('next').disabled=!weather;$('pause').disabled=!c;if(!c){return;}clear($('main'));if(!weather){var empty=el('section','empty');empty.appendChild(art('partly'));empty.appendChild(el('h2','',pending?'Gathering your forecast…':'The sky is out of reach'));empty.appendChild(el('p','',pending?'Just a moment.':'The city is saved, but the forecast has not loaded. Retry below or open Connection help.'));if(!pending){empty.appendChild(button('Try again',fetchWeather,'primary'));empty.appendChild(button('Connection help',connectionHelp));}$('main').appendChild(empty);return;}if(pageIndex>=pages.length){pageIndex=0;}name=pages[pageIndex];$('page-label').textContent=PAGE_NAMES[name].toUpperCase();({now:renderNow,hourly:renderHourly,week:renderWeek,details:renderDetails,sun:renderSun,moon:renderMoon})[name]();}
function step(delta){if(!weather){return;}var pages=enabledPages(),next=pageIndex+delta;if(next>=pages.length&&prefs.rotateCities&&prefs.cities.length>1){var ix=prefs.cities.indexOf(city());selectCity(prefs.cities[(ix+1)%prefs.cities.length]);return;}pageIndex=(next+pages.length)%pages.length;hourGroup=0;render();}
function resetRotation(){clearInterval(rotationTimer);rotationTimer=setInterval(function(){if(prefs.rotate&&!paused&&!overlayOpen&&!document.hidden){step(1);}},prefs.seconds*1000);}
function resetTimers(){resetRotation();clearInterval(refreshTimer);refreshTimer=setInterval(function(){if(!document.hidden){fetchWeather();}},prefs.refresh*60000);}
function openDialog(title){if(!overlayOpen){lastFocus=document.activeElement;}overlayOpen=true;$('dialog-title').textContent=title;clear($('dialog-content'));$('overlay').hidden=false;$('overlay').scrollTop=0;$('main').setAttribute('aria-hidden','true');$('close').focus();}
function closeDialog(){searchGeneration++;clearTimeout(searchTimer);overlayOpen=false;$('overlay').hidden=true;$('main').removeAttribute('aria-hidden');resetRotation();if(lastFocus&&document.documentElement.contains(lastFocus)){lastFocus.focus();}}
function search(){openDialog('Find your little corner');var box=$('dialog-content'),input=el('input','search-input'),results=el('div','results'),hint=el('p','note','Search a city anywhere in the world. No GPS needed.');input.type='search';input.placeholder='City name';input.setAttribute('aria-label','Search cities');input.autocomplete='off';input.maxLength=100;box.appendChild(input);box.appendChild(hint);box.appendChild(connectionCheckLink());box.appendChild(results);if(prefs.cities.length){prefs.cities.forEach(function(c){results.appendChild(button(c.name+' · '+(c.admin1||c.country||''),function(){selectCity(c);}));});}input.oninput=function(){var q=input.value.replace(/^\s+|\s+$/g,''),token=++searchGeneration;clearTimeout(searchTimer);if(q.length<2){clear(results);hint.textContent='Enter at least two characters.';return;}hint.textContent='Searching…';searchTimer=setTimeout(function(){request('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(q)+'&count=10&language=en&format=json',function(err,d){if(token!==searchGeneration||!overlayOpen){return;}clear(results);if(err){hint.textContent=err+' Edit your search to retry.';return;}var matches=d&&d.results instanceof Array?d.results.filter(validCity):[];hint.textContent=matches.length?'Choose your city below.':'No cities found. Try a nearby city or another spelling.';matches.forEach(function(c){var b=button(c.name,function(){var existing=prefs.cities.filter(function(s){return s.id===c.id;})[0];if(!existing){if(prefs.cities.length>=12){hint.textContent='You can save up to 12 cities. Remove one in Settings first.';return;}existing={id:c.id,name:c.name,latitude:c.latitude,longitude:c.longitude,admin1:c.admin1||'',country:c.country||'',timezone:typeof c.timezone==='string'?c.timezone:''};prefs.cities.push(existing);}if(typeof c.timezone==='string'){existing.timezone=c.timezone;}selectCity(existing);});b.appendChild(el('small','',[c.admin1,c.country].filter(Boolean).join(' · ')));results.appendChild(b);});});},350);};input.focus();}
function settings(){openDialog('Make it yours');var box=$('dialog-content');box.appendChild(connectionCheckLink());function title(t){box.appendChild(el('h3','section-title',t));}function select(label,key,options){var row=el('div','setting'),lab=el('label','',label),s=el('select');s.id='setting-'+key;lab.htmlFor=s.id;options.forEach(function(o){var n=el('option','',o[1]);n.value=o[0];n.selected=String(prefs[key])===String(o[0]);s.appendChild(n);});s.onchange=function(){prefs[key]=typeof DEFAULTS[key]==='number'?Number(s.value):s.value;save();theme();resetTimers();};row.appendChild(lab);row.appendChild(s);box.appendChild(row);}function toggle(label,key){var row=el('div','setting'),lab=el('label','',label),b=el('input');b.type='checkbox';b.id='setting-'+key;b.checked=prefs[key];lab.htmlFor=b.id;b.onchange=function(){prefs[key]=b.checked;save();theme();resetTimers();};row.appendChild(lab);row.appendChild(b);box.appendChild(row);}title('Your display');toggle('Automatically rotate pages','rotate');select('Time on each page','seconds',[[10,'10 seconds'],[20,'20 seconds'],[30,'30 seconds'],[60,'60 seconds']]);select('Appearance','appearance',[['auto','Follow sunrise & sunset'],['light','Always light'],['dark','Always dark']]);select('Scenery','scene',sceneryOptions(localDate(Date.now()/1000).getUTCMonth()));toggle('Large text','large');toggle('Fade between pages','transitions');select('Refresh weather','refresh',[[10,'Every 10 minutes'],[15,'Every 15 minutes'],[30,'Every 30 minutes']]);title('Pages · choose & reorder');prefs.pages.forEach(function(p,i){var row=el('div','order-row'),label=el('span'),check=el('input'),actions=el('span','order-actions');check.type='checkbox';check.checked=prefs.enabled[p];check.setAttribute('aria-label','Enable '+PAGE_NAMES[p]);check.onchange=function(){if(!check.checked&&enabledPages().length===1){check.checked=true;return;}prefs.enabled[p]=check.checked;pageIndex=0;hourGroup=0;save();};label.appendChild(check);label.appendChild(document.createTextNode(PAGE_NAMES[p]));row.appendChild(label);addMove(actions,prefs.pages,i,function(){save();},PAGE_NAMES[p]);row.appendChild(actions);box.appendChild(row);});box.appendChild(el('p','note','Hourly Forecast opens at 1–6 hours. Its four buttons show later hours on demand. At least one page stays on.'));title('Saved cities');toggle('Rotate cities after all pages','rotateCities');prefs.cities.forEach(function(c,i){var row=el('div','order-row'),name=el('span','',c.name),actions=el('span','order-actions');row.appendChild(name);addMove(actions,prefs.cities,i,function(){save();},c.name);var remove=button('×',function(){prefs.cities.splice(i,1);if(prefs.selected===c.id){generation++;weather=null;prefs.selected=prefs.cities.length?prefs.cities[0].id:null;if(city()){weather=cacheGet(city());fetchWeather();}}save();if(!city()){window.location.reload();return;}settings();});remove.setAttribute('aria-label','Remove '+c.name);actions.appendChild(remove);row.appendChild(actions);box.appendChild(row);});box.appendChild(button('+ Add a city',search,'primary'));box.appendChild(el('p','note','All temperatures are °F. Wind uses mph, precipitation inches, visibility miles, and pressure inHg. Times are local to the selected city. All times use 12-hour AM/PM.'));title('Connection');box.appendChild(button('Connection help',connectionHelp,'primary'));title('Just on this device');box.appendChild(el('p','note','Your cities and settings stay in this browser. City searches and weather requests go to Open-Meteo, which receives your IP address. No GPS, accounts, ads, or analytics. '+(!storageOK?'Browser storage is unavailable; changes will last only for this session.':'')));box.appendChild(button('Reset local preferences',function(){if(window.confirm('Remove saved cities, settings, and cached weather from this browser?')){try{localStorage.removeItem(KEY);localStorage.removeItem(CACHE);}catch(e){}window.location.reload();}},'danger'));}
function addMove(parent,list,index,done,label){
 var item=list[index];
 [-1,1].forEach(function(dir){
  var b=button(dir===-1?'↑':'↓',function(){
   var current=list.indexOf(item),other=current+dir,row=parent.parentNode,sibling=dir<0?row.previousSibling:row.nextSibling;
   var active=list===prefs.pages?enabledPages()[pageIndex]:null;
   if(other<0||other>=list.length||!sibling){return;}
   list[current]=list[other];list[other]=item;
   /* Move existing rows: preserve focus, scroll position and native touch scrolling. */
   var dialog=document.querySelector('.dialog'),scroll=dialog.scrollTop,outer=$('overlay').scrollTop;
   if(dir<0){row.parentNode.insertBefore(row,sibling);}else{row.parentNode.insertBefore(sibling,row);}
   var controls=row.parentNode.querySelectorAll('.order-actions button'),i;
   for(i=0;i<controls.length;i++){if(controls[i].refreshMoveState){controls[i].refreshMoveState();}}
   if(active){pageIndex=enabledPages().indexOf(active);}
   done();if(!b.disabled){b.focus();}dialog.offsetHeight;dialog.scrollTop=scroll;$('overlay').scrollTop=outer;
  });
  b.refreshMoveState=function(){var ix=list.indexOf(item);b.disabled=ix+dir<0||ix+dir>=list.length;};b.refreshMoveState();
  b.setAttribute('aria-label','Move '+label+(dir===-1?' up':' down'));parent.appendChild(b);
 });
}
$('start').onclick=search;$('city-button').onclick=search;$('settings-button').onclick=settings;$('close').onclick=function(){closeDialog();render();};$('previous').onclick=function(){step(-1);resetRotation();};$('next').onclick=function(){step(1);resetRotation();};$('pause').onclick=function(){if(!prefs.rotate){prefs.rotate=true;paused=false;save();}else{paused=!paused;}render();resetRotation();};$('overlay').onclick=function(e){if(e.target===$('overlay')){closeDialog();render();}};
document.addEventListener('keydown',function(e){if(!overlayOpen){return;}if(e.keyCode===27){closeDialog();render();}if(e.keyCode===9){var nodes=$('overlay').querySelectorAll('button:not([disabled]),input,select,a[href]'),first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
document.addEventListener('visibilitychange',function(){if(!document.hidden){clock();if(city()&&(!weather||Date.now()-weather.saved>=prefs.refresh*60000)){fetchWeather();}resetRotation();}});
load();initMoon();if(city()){weather=cacheGet(city());pending=true;render();ensureTimezone(city());fetchWeather();}else{theme();}resetTimers();setInterval(function(){clock();theme();updateSky();if(weather&&enabledPages()[pageIndex]==='moon'&&!overlayOpen&&Date.now()-moonPageUpdated>60000){render();}},10000);
}());
