/* Create Assure customers from Freshdesk company maps / ticket names.
   Does not invent random Freshdesk companies (Merlog, 4AT). Only known codes.
   Does not insert AmsConfig (defaults would hard-off pillars).
   Cover is inferred: tickets = Cover; other pillars = live data or No Cover. */
SET NOCOUNT ON;
IF DB_ID(N'RPMAssure_App') IS NOT NULL
  USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Dim_Customer', N'U') IS NULL
BEGIN
  PRINT '518 skip - Dim_Customer missing';
  RETURN;
END

DECLARE @Now datetime2(0) = SYSUTCDATETIME();

IF OBJECT_ID(N'tempdb..#FdCodes') IS NOT NULL DROP TABLE #FdCodes;
CREATE TABLE #FdCodes (
  CustomerCode nvarchar(32) NOT NULL PRIMARY KEY,
  DisplayName  nvarchar(200) NOT NULL
);

INSERT INTO #FdCodes (CustomerCode, DisplayName) VALUES
  (N'ABLE',    N'Able Tracers'),
  (N'AHIC',    N'AHI Carriers'),
  (N'BHF',     N'Board of Healthcare Funders'),
  (N'HYDRA',   N'Hydrasales'),
  (N'IB',      N'Interbrand'),
  (N'MEDIPOS', N'MEDiPOS Medical Scheme'),
  (N'METSI',   N'Metsi Water Solutions'),
  (N'RPMINT',  N'RPM Resources'),
  (N'RSR',     N'Redsun Raisins'),
  (N'RSS',     N'Remote Site Solutions'),
  (N'SBS',     N'Simply Bright'),
  (N'SBT',     N'SBS Tanks'),
  (N'SIRF',    N'Sir Fruit'),
  (N'UVSS',    N'Unique Ventilation Systems'),
  (N'VAULT',   N'Vault Tech'),
  (N'YLJ',     N'YLJ Health/ORA Touch');

/* Also take codes already on the company map (e.g. future customers). */
IF OBJECT_ID(N'dbo.Dim_Freshdesk_CompanyMap', N'U') IS NOT NULL
BEGIN
  INSERT INTO #FdCodes (CustomerCode, DisplayName)
  SELECT DISTINCT
    UPPER(LTRIM(RTRIM(m.CustomerCode))),
    LEFT(MAX(LTRIM(RTRIM(m.CompanyName))), 200)
  FROM dbo.Dim_Freshdesk_CompanyMap m
  WHERE m.Active = 1
    AND m.CustomerCode IS NOT NULL
    AND LTRIM(RTRIM(m.CustomerCode)) <> N''
    AND NOT EXISTS (
      SELECT 1 FROM #FdCodes x
      WHERE x.CustomerCode = UPPER(LTRIM(RTRIM(m.CustomerCode)))
    )
  GROUP BY UPPER(LTRIM(RTRIM(m.CustomerCode)));
END

DECLARE @Code nvarchar(32), @Name nvarchar(200);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR
  SELECT CustomerCode, DisplayName FROM #FdCodes;
OPEN c;
FETCH NEXT FROM c INTO @Code, @Name;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @Code)
  BEGIN
    IF COL_LENGTH(N'dbo.Dim_Customer', N'CreatedAt') IS NOT NULL
      INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
      VALUES (@Code, @Name, 1, NULL, @Now, @Now);
    ELSE
      INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active)
      VALUES (@Code, @Name, 1);
    PRINT '518 created Dim_Customer ' + @Code + ' = ' + @Name;
  END
  ELSE
  BEGIN
    UPDATE dbo.Dim_Customer
      SET Active = 1,
          DisplayName = CASE
            WHEN DisplayName IS NULL OR LTRIM(RTRIM(DisplayName)) = N'' THEN @Name
            ELSE DisplayName
          END
    WHERE CustomerCode = @Code AND (Active = 0 OR DisplayName IS NULL OR LTRIM(RTRIM(DisplayName)) = N'');
  END
  FETCH NEXT FROM c INTO @Code, @Name;
END
CLOSE c;
DEALLOCATE c;

/* Seed map rows so tickets restamp after the customer exists. */
IF OBJECT_ID(N'dbo.Dim_Freshdesk_CompanyMap', N'U') IS NOT NULL
BEGIN
  ;WITH seed AS (
    SELECT * FROM (VALUES
      (CONVERT(bigint, 48005599640), N'SBS Tanks', N'SBT'),
      (CONVERT(bigint, 48006116929), N'Simply Bright Solutions', N'SBS'),
      (CONVERT(bigint, 48006116932), N'Board of Healthcare Funders', N'BHF'),
      (CAST(NULL AS bigint), N'SBS Tanks', N'SBT')
    ) v(CompanyId, CompanyName, CustomerCode)
  )
  MERGE dbo.Dim_Freshdesk_CompanyMap AS t
  USING (
    SELECT s.CompanyId, s.CompanyName, s.CustomerCode
    FROM seed s
    INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = s.CustomerCode
  ) AS s
  ON t.CompanyName = s.CompanyName
  WHEN MATCHED THEN UPDATE SET
    t.CustomerCode = s.CustomerCode,
    t.CompanyId = COALESCE(s.CompanyId, t.CompanyId),
    t.Active = 1
  WHEN NOT MATCHED THEN INSERT (CompanyId, CompanyName, CustomerCode, Notes, Active)
    VALUES (s.CompanyId, s.CompanyName, s.CustomerCode, N'518 ensure customer', 1);
END

IF OBJECT_ID(N'dbo.Freshdesk_Tickets', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.Dim_Freshdesk_CompanyMap', N'U') IS NOT NULL
BEGIN
  UPDATE t SET t.CustomerCode = m.CustomerCode
  FROM dbo.Freshdesk_Tickets t
  JOIN dbo.Dim_Freshdesk_CompanyMap m ON m.Active = 1
   AND (
        (t.CompanyId IS NOT NULL AND m.CompanyId IS NOT NULL AND t.CompanyId = m.CompanyId)
     OR LTRIM(RTRIM(ISNULL(t.CompanyName,N''))) = LTRIM(RTRIM(m.CompanyName))
   )
  WHERE t.CustomerCode IS NULL OR t.CustomerCode <> m.CustomerCode;
END

PRINT '518 Freshdesk customers ensured';
SELECT c.CustomerCode, c.DisplayName, c.Active,
       (SELECT COUNT(*) FROM dbo.Freshdesk_Tickets t WHERE t.CustomerCode = c.CustomerCode) AS Tickets
FROM dbo.Dim_Customer c
WHERE c.CustomerCode IN (SELECT CustomerCode FROM #FdCodes)
ORDER BY c.CustomerCode;
GO
