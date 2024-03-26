select 
    obj_code,
    obj_desc,
    obj_location,
    to_char(obj_commiss, 'mm/dd/yyyy') commiss,
    s.prv_value STRIP,
    t.prv_value QUAD,
    to_char(max(decode(to_char(evt_completed, 'yyyy'), '2021', evt_completed)), 'mm/dd/yyyy') "2021",
    to_char(max(decode(to_char(evt_completed, 'yyyy'), '2022', evt_completed)), 'mm/dd/yyyy') "2022",
    to_char(max(decode(to_char(evt_completed, 'yyyy'), '2023', evt_completed)), 'mm/dd/yyyy') "2023"
from
    r5objects
    join r5propertyvalues s
        on s.prv_code = obj_code || '#' || obj_org
        and s.prv_property = 'STRIPNO'
    join r5propertyvalues t
        on t.prv_code = obj_code || '#' || obj_org
        and t.prv_property = 'TVCLASS'
    join r5propertyvalues j
        on j.prv_code = obj_code || '#' || obj_org
        and j.prv_property = 'STATE'
    left join r5events
        on evt_object = obj_code
        and evt_type = 'PPM'
        and evt_due between date '2021-01-01' and date '2023-12-31'
where
    obj_status = 'I'
    and obj_class = 'TVLV'
    and obj_obtype = 'A'
    and j.prv_value = 'DC'
    and t.prv_value not in ('Tap', 'Stub', 'Division Valve (Closed)')
group by
    obj_code,
    obj_desc,
    obj_location,
    obj_commiss,
    s.prv_value,
    t.prv_value
order by 1