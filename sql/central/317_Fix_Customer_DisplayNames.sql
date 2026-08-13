/*
  317 — Fix Dim_Customer.DisplayName naming convention (estate list)
  Codes stay; display names match RPM master list.

  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i "C:\RPM-Assure\Sql\central\317_Fix_Customer_DisplayNames.sql"
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

/* Code -> official display name */
DECLARE @Map TABLE (
  CustomerCode nvarchar(50) NOT NULL PRIMARY KEY,
  DisplayName  nvarchar(200) NOT NULL
);

INSERT INTO @Map (CustomerCode, DisplayName) VALUES
  (N'RPMINT',  N'RPM Resources'),
  (N'AHIC',    N'AHI Carriers'),
  (N'IB',      N'Interbrand'),
  (N'MEDIPOS', N'MEDiPOS Medical Scheme'),
  (N'YLJ',     N'YLJ Health/ORA Touch'),
  (N'UVSS',    N'Unique Ventilation Systems'),
  (N'RSR',     N'Redsun Raisins'),
  (N'ABLE',    N'Able Tracers'),
  (N'BHF',     N'Board of Healthcare Funders'),
  (N'HYDRA',   N'Hydrasales'),
  (N'VAULT',   N'Vault Tech'),
  (N'RSS',     N'Remote Site Solutions');

/* Ensure rows exist (inactive OK if never used) — update only existing codes */
UPDATE c
SET
  c.DisplayName = m.DisplayName,
  c.UpdatedAt   = SYSUTCDATETIME()
FROM dbo.Dim_Customer AS c
INNER JOIN @Map AS m ON m.CustomerCode = c.CustomerCode;

PRINT CONCAT(N'Updated rows: ', @@ROWCOUNT);

/* Optional: insert missing codes as Active=0 so estate can enable later */
INSERT INTO dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
SELECT m.CustomerCode, m.DisplayName, 0, NULL, SYSUTCDATETIME(), SYSUTCDATETIME()
FROM @Map AS m
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.Dim_Customer c WHERE c.CustomerCode = m.CustomerCode
);

PRINT CONCAT(N'Inserted missing (Active=0): ', @@ROWCOUNT);

SELECT
  c.CustomerCode,
  c.DisplayName,
  c.Active,
  c.SqlInstanceName
FROM dbo.Dim_Customer AS c
INNER JOIN @Map AS m ON m.CustomerCode = c.CustomerCode
ORDER BY c.DisplayName;

/* Codes in Dim_Customer not on the master list (review only) */
SELECT c.CustomerCode, c.DisplayName, c.Active
FROM dbo.Dim_Customer AS c
WHERE NOT EXISTS (SELECT 1 FROM @Map m WHERE m.CustomerCode = c.CustomerCode)
ORDER BY c.CustomerCode;

PRINT N'317 OK — DisplayName convention applied.';
GO
