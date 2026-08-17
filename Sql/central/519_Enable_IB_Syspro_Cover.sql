USE RPMAssure_App;
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'IB')
BEGIN
  INSERT INTO dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName)
  VALUES (N'IB', N'Interbrand', 1, N'IB-SQL01');
  PRINT 'Dim_Customer IB inserted';
END
ELSE
  UPDATE dbo.Dim_Customer
    SET DisplayName = N'Interbrand',
        Active = 1,
        SqlInstanceName = COALESCE(NULLIF(LTRIM(RTRIM(SqlInstanceName)), N''), N'IB-SQL01')
  WHERE CustomerCode = N'IB';

IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarSyspro') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = N'IB')
    UPDATE dbo.Dim_Customer_AmsConfig
      SET AmsEnabled = 1, PillarSyspro = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'519_IB_syspro'
    WHERE CustomerCode = N'IB';
  ELSE
    INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro, UpdatedAt, UpdatedBy)
    VALUES (N'IB', 1, 1, SYSUTCDATETIME(), N'519_IB_syspro');
  PRINT 'IB PillarSyspro=1 SqlInstanceName=IB-SQL01';
END

/* Stamp IOPS rows that landed on the host but missed CustomerCode */
IF OBJECT_ID(N'dbo.Agent_DiskIops', N'U') IS NOT NULL
  UPDATE dbo.Agent_DiskIops
    SET CustomerCode = N'IB'
  WHERE (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'')
    AND (
      HostName LIKE N'IB-%'
      OR HostName IN (N'IB-SQL01', N'IB-TS01')
    );

SELECT c.CustomerCode, c.DisplayName, c.SqlInstanceName, a.AmsEnabled, a.PillarSyspro
FROM dbo.Dim_Customer c
LEFT JOIN dbo.Dim_Customer_AmsConfig a ON a.CustomerCode = c.CustomerCode
WHERE c.CustomerCode = N'IB';

SELECT TOP 5 SnapshotDate, InstanceName, ProductVersion, CompanyCount, CustomerCode
FROM dbo.Syspro_SystemLicense WITH (NOLOCK)
WHERE CustomerCode = N'IB' OR InstanceName LIKE N'IB%'
ORDER BY SnapshotDate DESC;

SELECT HostName, CustomerCode, COUNT(*) AS Vols, MAX(SnapshotUtc) AS LastUtc
FROM dbo.Agent_DiskIops WITH (NOLOCK)
WHERE CustomerCode = N'IB' OR HostName LIKE N'IB%'
GROUP BY HostName, CustomerCode;
GO
