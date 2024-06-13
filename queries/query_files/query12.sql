with rws as (
    select 
        E.*,
        row_number () over (partition by EVT_OBJECT order by EVT_DUE desc) rn
    from  R5EVENTS E
)

select * from rws
where  rn <= 3
ORDER BY EVT_OBJECT, EVT_DUE