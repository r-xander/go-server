SELECT
    'REPLACE ANTENNA AT REG-' || SUBSTR(OBJ_CODE, 1, 4) "description",
    OBJ_CODE "equipment",
    'INSTALL' "type",
    '358' "department",
    obj_location "location",
    '3/6/2024' "date",
    1 "hours",
    1 "people"
from r5objects
where substr(obj_code, 1, 4) in (
    select substr(prv_code, 4, 4)
    from r5propertyvalues
    where prv_property = 'COMMTYPE'
    and prv_value = 'RADIO'
)
and obj_class = 'RFEPR'
and obj_status = 'I'
order by 2