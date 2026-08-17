/* Seed only Freshdesk companies confirmed on Janine's scan that exist in Dim_Customer.
   Never creates customers. Never maps SBS Tanks. */
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Dim_Freshdesk_CompanyMap', N'U') IS NULL
BEGIN
  RAISERROR(N'Dim_Freshdesk_CompanyMap missing - run 510 first', 16, 1);
  RETURN;
END

;WITH src AS (
  SELECT * FROM (VALUES
    (CONVERT(bigint, 48001891723), N'AHI Carrier',              N'AHIC'),
    (CONVERT(bigint, 48002537448), N'Remote Site Solutions',    N'RSS'),
    (CONVERT(bigint, 48002073040), N'UVSS',                     N'UVSS'),
    (CONVERT(bigint, 48002532561), N'Interbrand',               N'IB'),
    (CONVERT(bigint, 48002600047), N'Medipos',                  N'MEDIPOS'),
    (CONVERT(bigint, 48001751035), N'RPM Resources',            N'RPMINT'),
    (CONVERT(bigint, 48002584815), N'RPM Resources (UK)',       N'RPMINT')
  ) v(CompanyId, CompanyName, CustomerCode)
)
MERGE dbo.Dim_Freshdesk_CompanyMap AS t
USING (
  SELECT s.CompanyId, s.CompanyName, s.CustomerCode
  FROM src s
  INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = s.CustomerCode AND c.Active = 1
) AS s
ON t.CompanyName = s.CompanyName
WHEN MATCHED THEN UPDATE SET
  t.CustomerCode = s.CustomerCode,
  t.CompanyId = s.CompanyId,
  t.Active = 1
WHEN NOT MATCHED THEN INSERT (CompanyId, CompanyName, CustomerCode, Notes, Active)
  VALUES (s.CompanyId, s.CompanyName, s.CustomerCode, N'seed from Janine scan', 1);

UPDATE t SET t.CustomerCode = m.CustomerCode
FROM dbo.Freshdesk_Tickets t
JOIN dbo.Dim_Freshdesk_CompanyMap m ON m.Active = 1
 AND (t.CompanyId = m.CompanyId OR LTRIM(RTRIM(t.CompanyName)) = LTRIM(RTRIM(m.CompanyName)));

SELECT m.CompanyName, m.CustomerCode, m.CompanyId
FROM dbo.Dim_Freshdesk_CompanyMap m
WHERE m.Active = 1
ORDER BY m.CustomerCode;
GO
