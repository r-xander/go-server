select json_object(
    'id' value s.obj_code,
    'Description' value INITCAP(s.obj_desc), 
    'Class' value s.obj_class,
    'Category' value s.obj_category,
    'Commission Date' value to_char(s.obj_commiss, 'mm/dd/yyyy'),
    'Manufacturer' value s.obj_manufact,
    'Model' value s.obj_manufactmodel,
    'Serial' value s.obj_serialno,
    'Size' value s.obj_udfchar01,
    'Location' value s.obj_location,
    'attributes' value (
        select json_objectagg(pro_desc value coalesce(prv_value, to_char(prv_nvalue), to_char(prv_dvalue, 'mm/dd/yyy')) returning varchar2(32767))
        from r5propertiesobj where pcode = s.obj_code || '#' || s.obj_org
    ),
    'equipment' value (
        select json_arrayagg(json_object(
            'id' value a.obj_code,
            'Description' value INITCAP(a.obj_desc), 
            'Class' value a.obj_class,
            'Category' value a.obj_category,
            'Commission Date' value to_char(a.obj_commiss, 'mm/dd/yyyy'),
            'Manufacturer' value a.obj_manufact,
            'Model' value a.obj_manufactmodel,
            'Serial' value a.obj_serialno,
            'Size' value a.obj_udfchar01,
            'Location' value a.obj_location,
            'attributes' value (
                select json_objectagg(pro_desc value coalesce(prv_value, to_char(prv_nvalue), to_char(prv_dvalue, 'mm/dd/yyy')) returning varchar2(32767))
                from r5propertiesobj 
                where pcode = a.obj_code || '#' || a.obj_org
            ),
            'equipment' value (
                select json_arrayagg(json_object(
                    'id' value b.obj_code,
                    'Description' value INITCAP(b.obj_desc), 
                    'Class' value b.obj_class,
                    'Category' value b.obj_category,
                    'Commission Date' value to_char(b.obj_commiss, 'mm/dd/yyyy'),
                    'Manufacturer' value b.obj_manufact,
                    'Model' value b.obj_manufactmodel,
                    'Serial' value b.obj_serialno,
                    'Size' value b.obj_udfchar01,
                    'Location' value b.obj_location,
                    'attributes' value (
                        select json_objectagg(pro_desc value coalesce(prv_value, to_char(prv_nvalue), to_char(prv_dvalue, 'mm/dd/yyy')) returning varchar2(32767))
                        from r5propertiesobj 
                        where pcode = b.obj_code || '#' || b.obj_org
                    ),
                    'equipment' value (
                        select json_arrayagg(json_object(
                            'id' value c.obj_code,
                            'Description' value INITCAP(c.obj_desc), 
                            'Class' value c.obj_class,
                            'Category' value c.obj_category,
                            'Commission Date' value to_char(c.obj_commiss, 'mm/dd/yyyy'),
                            'Manufacturer' value c.obj_manufact,
                            'Model' value c.obj_manufactmodel,
                            'Serial' value c.obj_serialno,
                            'Size' value c.obj_udfchar01,
                            'Location' value c.obj_location,
                            'attributes' value (
                                select json_objectagg(pro_desc value coalesce(prv_value, to_char(prv_nvalue), to_char(prv_dvalue, 'mm/dd/yyy')) returning varchar2(32767))
                                from r5propertiesobj 
                                where pcode = c.obj_code || '#' || c.obj_org
                            ),
                            'equipment' value (
                                select json_arrayagg(json_object(
                                    'id' value d.obj_code,
                                    'Description' value INITCAP(d.obj_desc), 
                                    'Class' value d.obj_class,
                                    'Category' value d.obj_category,
                                    'Commission Date' value to_char(d.obj_commiss, 'mm/dd/yyyy'),
                                    'Manufacturer' value d.obj_manufact,
                                    'Model' value d.obj_manufactmodel,
                                    'Serial' value d.obj_serialno,
                                    'Size' value d.obj_udfchar01,
                                    'Location' value d.obj_location,
                                    'attributes' value (
                                        select json_objectagg(pro_desc value coalesce(prv_value, to_char(prv_nvalue), to_char(prv_dvalue, 'mm/dd/yyy')) returning varchar2(32767))
                                        from r5propertiesobj 
                                        where pcode = d.obj_code || '#' || d.obj_org
                                    ) returning varchar2(32767)
                                ) returning varchar2(32767))
                                from r5objects d, r5structures
                                where d.obj_code = stc_child
                                and stc_parent = c.obj_code
                                and d.obj_status <> 'D'
                                and d.obj_notused = '-'
                            ) returning varchar2(32767)
                        ) returning varchar2(32767))
                        from r5objects c, r5structures
                        where c.obj_code = stc_child
                        and stc_parent = b.obj_code
                        and c.obj_status <> 'D'
                        and c.obj_notused = '-'
                    ) returning varchar2(32767)
                ) returning varchar2(32767))
                from r5objects b, r5structures
                where b.obj_code = stc_child
                and stc_parent = a.obj_code
                and b.obj_status <> 'D'
                and b.obj_notused = '-'
            ) returning varchar2(32767)
        ) returning varchar2(32767))
        from r5objects a, r5structures
        where a.obj_code = stc_child
        and stc_parent = s.obj_code
        and a.obj_status <> 'D'
        and a.obj_notused = '-'
    ) returning varchar2(32767)
) JSON
from r5objects s
where s.obj_code in ('MD-0217-SYSTEM','VA-0546-SYSTEM','VA-4306-SYSTEM', 'MD-4206-SYSTEM','MD-012Y-SYSTEM','MD-0SGZ-SYSTEM','MD-5204-PIG-SYSTEM','VAHERN-GATE-SYSTEM','VANEWM-GATE-SYSTEM','MDWPLN-GATE-SYSTEM','MDPAND-GATE-SYSTEM','VAKENN-GATE-SYSTEM','MDFMFT-GATE-SYSTEM','MDBRAN-RCV-SYSTEM')
and s.obj_status <> 'D'
and s.obj_notused = '-'