(function(){
'use strict';
var running=false;
function row(title,message){var n=document.createElement('div'),h=document.createElement('strong'),p=document.createElement('p');n.className='setting diagnostic-row';h.textContent=title;p.textContent=message;n.appendChild(h);n.appendChild(p);document.getElementById('check-results').appendChild(n);return p;}
function check(url,title,next){
 var output=row(title,'Checking…'),x,finished=false,timer,started=Date.now();
 function done(message){if(finished){return;}finished=true;clearTimeout(timer);output.textContent=message+' ('+Math.round((Date.now()-started)/1000)+' seconds)';next();}
 try{
  x=new XMLHttpRequest();x.open('GET',url,true);
  x.onreadystatechange=function(){if(x.readyState===4&&x.status){done(x.status===200?'PASS · HTTP 200':'FAIL · HTTP '+x.status);}};
  x.onload=function(){if(!finished){done(x.status===200?'PASS · HTTP 200':'FAIL · load event, HTTP '+x.status);}};
  x.onerror=function(){done('FAIL · network/security error, HTTP '+x.status);};
  timer=setTimeout(function(){done('FAIL · no response within 25 seconds, state '+x.readyState);x.abort();},25000);
  x.send();
 }catch(e){done('FAIL · '+e.name+': '+e.message);}
}
document.addEventListener('securitypolicyviolation',function(e){if(String(e.violatedDirective).indexOf('connect-src')===0){row('Browser security policy','Blocked '+e.blockedURI+' · '+e.violatedDirective);}});
document.getElementById('run-check').onclick=function(){
 if(running){return;}running=true;this.disabled=true;var results=document.getElementById('check-results');while(results.firstChild){results.removeChild(results.firstChild);}
 var tests=[['./diagnostic.json','1. Website connection'],['https://geocoding-api.open-meteo.com/v1/search?name=London&count=1','2. City search'],['https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m','3. Small weather request'],['https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=8&timeformat=unixtime&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,weather_code,visibility,uv_index,is_day,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration,precipitation_probability_max,uv_index_max','4. Full weather request']],index=0;
 function next(){if(index>=tests.length){running=false;document.getElementById('run-check').disabled=false;return;}var test=tests[index++];check(test[0],test[1],next);}next();
};
}());
