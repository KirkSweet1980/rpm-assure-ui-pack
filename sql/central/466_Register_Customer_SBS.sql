/*
  466 - Register Simply Bright as managed customer SBS
  App server: sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -i 466_Register_Customer_SBS.sql
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

DECLARE @Code nvarchar(50)  = N'SBS';
DECLARE @Name nvarchar(200) = N'Simply Bright';
DECLARE @Now  datetime2(0)  = SYSUTCDATETIME();

/* ---- Dim_Customer (Active=1; was Active=0 shell for Cove FK historically) ---- */
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @Code)
BEGIN
  IF COL_LENGTH(N'dbo.Dim_Customer', N'CreatedAt') IS NOT NULL
    AND COL_LENGTH(N'dbo.Dim_Customer', N'UpdatedAt') IS NOT NULL
    INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
    VALUES (@Code, @Name, 1, NULL, @Now, @Now);
  ELSE
    INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active)
    VALUES (@Code, @Name, 1);
  PRINT 'Dim_Customer SBS inserted Active=1';
END
ELSE
BEGIN
  IF COL_LENGTH(N'dbo.Dim_Customer', N'UpdatedAt') IS NOT NULL
    UPDATE dbo.Dim_Customer
    SET DisplayName = @Name, Active = 1, UpdatedAt = @Now
    WHERE CustomerCode = @Code;
  ELSE
    UPDATE dbo.Dim_Customer
    SET DisplayName = @Name, Active = 1
    WHERE CustomerCode = @Code;
  PRINT 'Dim_Customer SBS updated Active=1 DisplayName=Simply Bright';
END
GO

/* ---- AmsConfig: on cover for estate; pillars data-first except known Cove ---- */
DECLARE @Code nvarchar(50) = N'SBS';
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = @Code)
  BEGIN
    INSERT dbo.Dim_Customer_AmsConfig (CustomerCode)
    VALUES (@Code);
    PRINT 'Dim_Customer_AmsConfig SBS inserted';
  END

  IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'AmsEnabled') IS NOT NULL
    UPDATE dbo.Dim_Customer_AmsConfig SET AmsEnabled = 1 WHERE CustomerCode = @Code;
  IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarSyspro') IS NOT NULL
    UPDATE dbo.Dim_Customer_AmsConfig SET PillarSyspro = 0 WHERE CustomerCode = @Code;
  IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarPulseway') IS NOT NULL
    UPDATE dbo.Dim_Customer_AmsConfig SET PillarPulseway = 0 WHERE CustomerCode = @Code;
  IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarCove') IS NOT NULL
    UPDATE dbo.Dim_Customer_AmsConfig SET PillarCove = 1 WHERE CustomerCode = @Code;
  IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarBitdefender') IS NOT NULL
    UPDATE dbo.Dim_Customer_AmsConfig SET PillarBitdefender = 0 WHERE CustomerCode = @Code;
  IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarCsp') IS NOT NULL
    UPDATE dbo.Dim_Customer_AmsConfig SET PillarCsp = 0 WHERE CustomerCode = @Code;

  PRINT 'AmsConfig SBS: AmsEnabled=1 Syspro/RMM/EPP/CSP=0 Cove=1';
END
GO

/* ---- Cove partner map: ensure aliases active ---- */
IF OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Cove_PartnerMap AS t
  USING (VALUES
    (N'Simply Bright', N'SBS', CAST(2932715 AS bigint), N'SBS onboard alias'),
    (N'Simply Bright Consulting', N'SBS', CAST(2932715 AS bigint), N'SBS live Product name')
  ) AS s(PartnerName, CustomerCode, PartnerId, Notes)
    ON t.PartnerName = s.PartnerName
  WHEN MATCHED THEN UPDATE SET
    CustomerCode = s.CustomerCode,
    PartnerId = COALESCE(t.PartnerId, s.PartnerId),
    Active = 1,
    Notes = s.Notes,
    UpdatedAtUtc = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (PartnerName, CustomerCode, PartnerId, Active, Notes, UpdatedAtUtc)
    VALUES (s.PartnerName, s.CustomerCode, s.PartnerId, 1, s.Notes, SYSUTCDATETIME());

  IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NOT NULL
  BEGIN
    UPDATE d
    SET d.CustomerCode = N'SBS'
    FROM dbo.Cove_DeviceStatistics d
    INNER JOIN dbo.Dim_Cove_PartnerMap m
      ON m.Active = 1
     AND m.CustomerCode = N'SBS'
     AND (
       (d.PartnerId IS NOT NULL AND m.PartnerId = d.PartnerId)
       OR (d.Product IS NOT NULL AND d.Product = m.PartnerName)
     )
    WHERE ISNULL(d.CustomerCode, N'') <> N'SBS';
    PRINT CONCAT('Cove devices re-stamped to SBS: ', @@ROWCOUNT);
  END
  PRINT 'Cove partner map SBS ready';
END
GO

IF OBJECT_ID(N'dbo.Dim_Customer_SyncLog', N'U') IS NOT NULL
  INSERT INTO dbo.Dim_Customer_SyncLog (ActionType, CustomerCode, Detail, DryRun)
  VALUES (N'RegisterCustomer', N'SBS', N'DisplayName=Simply Bright Active=1 PillarCove=1', 0);
GO

SELECT c.CustomerCode, c.DisplayName, c.Active, c.SqlInstanceName
FROM dbo.Dim_Customer c WITH (NOLOCK)
WHERE c.CustomerCode = N'SBS';

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
  SELECT CustomerCode, AmsEnabled,
    CASE WHEN COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarSyspro') IS NOT NULL THEN 1 ELSE 0 END AS HasPillars
  FROM dbo.Dim_Customer_AmsConfig WITH (NOLOCK)
  WHERE CustomerCode = N'SBS';

IF OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NOT NULL
  SELECT PartnerName, CustomerCode, PartnerId, Active, Notes
  FROM dbo.Dim_Cove_PartnerMap WITH (NOLOCK)
  WHERE CustomerCode = N'SBS';

IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NOT NULL
  SELECT CustomerCode, COUNT(*) AS DeviceRows, MAX(SnapshotDate) AS MaxSnap
  FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
  WHERE CustomerCode = N'SBS'
  GROUP BY CustomerCode;
GO
