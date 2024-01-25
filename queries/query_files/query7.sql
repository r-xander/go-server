SELECT
    UA.OSF_FIXEDSITECODE,
    OL.WG_OSF_RUNNUM,
    UA.OSF_FIXEDCODED,
    UA.OSF_FIXEDTYPE,
    UA.OSF_FIXEDJURISDICTION,
    UA.OSF_RESULT,
    TO_CHAR(MAX(UA.OSF_DATE), 'MM/DD/YYYY') OSF_DATE
FROM 
    U5ODORSAMPLELOCATIONS OL
    LEFT JOIN U5UTLODORSAMPLE UA
        ON OL.WG_OSF_SITECODE = UA.OSF_FIXEDSITECODE
WHERE OL.WG_OSF_NOTUSED = '-'
AND   OL.WG_OSF_TYPE IN ('FIXED', 'FARMTAP')
AND   UA.OSF_DATE >= trunc(sysdate, 'DAY')
GROUP BY
    UA.OSF_FIXEDSITECODE,
    OL.WG_OSF_RUNNUM,
    UA.OSF_FIXEDCODED,
    UA.OSF_FIXEDTYPE,
    UA.OSF_FIXEDJURISDICTION,
    UA.OSF_RESULT
ORDER BY
    TO_NUMBER(OL.WG_OSF_RUNNUM),
    OSF_FIXEDSITECODE