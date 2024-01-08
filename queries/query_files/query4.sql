SELECT
    DAE_DOCUMENT "Code",
    EVT_OBJECT || ' - Transmission Valve Inspection - ' || to_char(evt_due, 'mm-DD-yyyy') || '.pdf' "File Name"
FROM 
    R5DOCENTITIES
    JOIN R5EVENTS
        ON EVT_CODE = DAE_CODE
WHERE 
    EVT_OBJECT IN ('TVLV-0914', 'TVLV-0915', 'TVLV-0916', 'TVLV-0917', 'TVLV-0918', 'TVLV-0919', 'TVLV-2160')
    AND EVT_DUE >= DATE '2021-01-01'
ORDER BY EVT_OBJECT, EVT_DUE