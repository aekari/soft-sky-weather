"""Build small offline IANA offset tables for ES5 browsers without Intl.
Uses the system's zoneinfo database. Rebuild periodically for rule changes.
"""
import datetime as dt
import json
from pathlib import Path
from zoneinfo import ZoneInfo, available_timezones
start=int(dt.datetime(2025,1,1,tzinfo=dt.timezone.utc).timestamp())
end=int(dt.datetime(2036,1,1,tzinfo=dt.timezone.utc).timestamp())
rules=[]; indexes={}; zones={}
def offset(zone,stamp):
 return int(dt.datetime.fromtimestamp(stamp,dt.timezone.utc).astimezone(zone).utcoffset().total_seconds())
for name in sorted(available_timezones()):
 if name.startswith(('posix/','right/')) or name in ('localtime','posixrules','Factory'):continue
 z=ZoneInfo(name); previous=offset(z,start); transitions=[[start,previous]]
 for stamp in range(start+43200,end,43200):
  current=offset(z,stamp)
  if current!=previous:
   lo=stamp-43200;hi=stamp
   while hi-lo>1:
    mid=(lo+hi)//2
    if offset(z,mid)==previous:lo=mid
    else:hi=mid
   transitions.append([hi,current]);previous=current
 key=json.dumps(transitions,separators=(',',':'))
 if key not in indexes:indexes[key]=len(rules);rules.append(transitions)
 zones[name]=indexes[key]
content={'start':start,'end':end,'zones':zones,'rules':rules}
Path('timezones.js').write_text('/* Generated IANA time-zone offsets, 2025–2035. See tools/build-timezones.py. */\nwindow.SOFT_SKY_TIMEZONES='+json.dumps(content,separators=(',',':'))+';\n')
print(len(zones),'zones;',len(rules),'unique rule sets;',Path('timezones.js').stat().st_size,'bytes')
