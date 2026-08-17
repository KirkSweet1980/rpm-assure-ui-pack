/* Register SBT (SBS Tanks) if missing. Map Freshdesk companies:
     SBS Tanks                  -> SBT
     Board of Healthcare Funders -> BHF
   Does not create BHF (already in Assure). Does not map SBS Tanks to SBS. */
SET NOCOUNT ON;
USE RPMAssure_App;
GO

DECLARE @Now datetime2(0) = SYSUTCDATETIME();

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'SBT')
BEGIN
  IF COL_LENGTH(N'dbo.Dim_Customer', N'CreatedAt') IS NOT NULL
    INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
    VALUES (N'SBT', N'SBS Tanks', 1, NULL, @Now, @Now);
  ELSE
    INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active)
    VALUES (N'SBT', N'SBS Tanks', 1);
  PRINT 'Dim_Customer SBT created (SBS Tanks)';
END
ELSE
BEGIN
  UPDATE dbo.Dim_Customer SET DisplayName = N'SBS Tanks', Active = 1 WHERE CustomerCode = N'SBT';
  PRINT 'Dim_Customer SBT already present - Active=1';
END

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = N'SBT')
BEGIN
  INSERT dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled)
  VALUES (N'SBT', 1);
  PRINT 'AmsConfig SBT inserted';
END
GO

IF OBJECT_ID(N'dbo.Dim_Freshdesk_CompanyMap', N'U') IS NULL
BEGIN
  RAISERROR(N'Dim_Freshdesk_CompanyMap missing - run 510 first', 16, 1);
  RETURN;
END

;WITH src AS (
  SELECT * FROM (VALUES
    (CONVERT(bigint, 48005599640), N'SBS Tanks', N'SBT'),
    (CAST(NULL AS bigint), N'Board of Healthcare Funders', N'BHF'),
    (CAST(NULL AS bigint), N'Board of Healthcare Funders (Pty) Ltd', N'BHF'),
    (CAST(NULL AS bigint), N'BHF', N'BHF'),
    (CAST(NULL AS bigint), N'BHF Global', N'BHF')
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
  t.CompanyId = COALESCE(s.CompanyId, t.CompanyId),
  t.Active = 1
WHEN NOT MATCHED THEN INSERT (CompanyId, CompanyName, CustomerCode, Notes, Active)
  VALUES (s.CompanyId, s.CompanyName, s.CustomerCode, N'512 SBT/BHF', 1);

UPDATE t SET t.CustomerCode = m.CustomerCode
FROM dbo.Freshdesk_Tickets t
JOIN dbo.Dim_Freshdesk_CompanyMap m ON m.Active = 1
 AND (
      (t.CompanyId IS NOT NULL AND t.CompanyId = m.CompanyId)
   OR LTRIM(RTRIM(t.CompanyName)) = LTRIM(RTRIM(m.CompanyName))
 );

SELECT CustomerCode, DisplayName, Active FROM dbo.Dim_Customer WHERE CustomerCode IN (N'SBT', N'BHF', N'SBS');
SELECT CompanyName, CustomerCode, CompanyId FROM dbo.Dim_Freshdesk_CompanyMap
WHERE CustomerCode IN (N'SBT', N'BHF', N'SBS') ORDER BY CustomerCode, CompanyName;
GO
