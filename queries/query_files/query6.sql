SELECT
    DOC_CODE,
    UTSID,
    UTSFORM,
    COALESCE(UTSWO, U.UAT_VALUE) UTSWO,
    CASE WHEN COALESCE(UTSWO, U.UAT_VALUE) IS NOT NULL THEN 
        (SELECT EVT_MRC FROM R5EVENTS WHERE EVT_CODE = UTSWO)
    ELSE 
        '(SELECT )'
    END MRC
FROM 
    (SELECT
        DOC_CODE,
        TRIM(COALESCE(
            REGEXP_SUBSTR(DOC_DESC, '(UTSID:\s)(.*)(, FORM)', 1, 1, NULL, 2),
            REGEXP_SUBSTR(DOC_DESC, '(UTSID:\s)(.*)', 1, 1, NULL, 2),
            REGEXP_SUBSTR(DOC_DESC, '[^|]+')
        )) UTSID,
        TRIM(COALESCE(
            REGEXP_SUBSTR(DOC_DESC, '(FORM:\s)(.*)(, WO:)', 1, 1, NULL, 2),
            REGEXP_SUBSTR(DOC_DESC, '(FORM:\s)(.*)', 1, 1, NULL, 2),
            REGEXP_SUBSTR(DOC_DESC, '[^|]+', 1, 2)
        )) UTSFORM,
        TRIM(COALESCE(
            REGEXP_SUBSTR(DOC_DESC, '(WO:\s)(.*)', 1, 1, NULL, 2),
            REGEXP_SUBSTR(DOC_DESC, '[^|]+', 1, 3)
        )) UTSWO
    FROM R5DOCUMENTS
    WHERE DOC_CODE LIKE 'WG%'
    ORDER BY DOC_UPLOADED DESC) A
    
    LEFT JOIN (
        SELECT * FROM U5UTLATTRIBUTES
        WHERE UAT_NAME IN ('WO', 'WORK ORDER', 'INFOR WO', 'WO NUM')
    ) U
        ON U.UAT_UWICODE = UTSID