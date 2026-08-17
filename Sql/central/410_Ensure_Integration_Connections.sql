/*
  Dim_Connection — integration catalogue for Settings → Integrations.
  Reflects live collect legs (not “planned only”).

  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i 410_Ensure_Integration_Connections.sql
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Dim_Connection', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Connection
  (
    ConnectionId uniqueidentifier NOT NULL CONSTRAINT DF_Dim_Connection_Id DEFAULT (NEWSEQUENTIALID()),
    ConnectionCode nvarchar(40) NOT NULL,
    DisplayName nvarchar(120) NOT NULL,
    SourceKind nvarchar(40) NOT NULL, -- Erp | Rmm | Epp | Backup | Licensing
    Status nvarchar(20) NOT NULL CONSTRAINT DF_Dim_Connection_Status DEFAULT (N'Planned'),
    -- Planned | Configured | Active | Error | Disabled
    EndpointUrl nvarchar(500) NULL,
    Notes nvarchar(500) NULL,
    LastSyncAt datetime2(3) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Dim_Connection_Created DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetime2(3) NOT NULL CONSTRAINT DF_Dim_Connection_Updated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_Connection PRIMARY KEY (ConnectionId),
    CONSTRAINT UQ_Dim_Connection_Code UNIQUE (ConnectionCode),
    CONSTRAINT CK_Dim_Connection_Status CHECK (Status IN (N'Planned',N'Configured',N'Active',N'Error',N'Disabled'))
  );
  PRINT N'Created Dim_Connection';
END
GO

MERGE dbo.Dim_Connection AS t
USING (VALUES
  (N'SYSPRO',      N'SYSPRO Deployment',          N'Erp',       N'Active',
   N'SYSPRO collect — operators, jobs, FinSight, license, hotfixes, SQL backups'),
  (N'PULSEWAY',    N'RPM Remote Management',      N'Rmm',       N'Active',
   N'Pulseway collect — devices, patch, alerts (servers / workstations)'),
  (N'COVE',        N'RPM Cloud Backup',           N'Backup',    N'Active',
   N'Cove / N-Able collect — devices on cloud backup, recovery testing, retention'),
  (N'BITDEFENDER', N'RPM EPP',                    N'Epp',       N'Active',
   N'RPM EPP — endpoints, policies, incidents, quarantine'),
  (N'MS_CSP',      N'Microsoft 365 Tenant',       N'Licensing', N'Configured',
   N'M365 / CSP pilot (RPMINT seed) — tenant health, licenses, users; expand estate later'),
  (N'FRESHDESK',   N'Freshdesk Tickets',          N'Ams',       N'Configured',
   N'Helpdesk ticket pull for AMS / contract SLA clocks')
) AS s(ConnectionCode, DisplayName, SourceKind, Status, Notes)
ON t.ConnectionCode = s.ConnectionCode
WHEN MATCHED THEN UPDATE SET
  DisplayName = s.DisplayName,
  SourceKind  = s.SourceKind,
  Status      = s.Status,
  Notes       = s.Notes,
  UpdatedAt   = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
  INSERT (ConnectionCode, DisplayName, SourceKind, Status, Notes)
  VALUES (s.ConnectionCode, s.DisplayName, s.SourceKind, s.Status, s.Notes);

SELECT ConnectionCode, DisplayName, SourceKind, Status, Notes
FROM dbo.Dim_Connection
ORDER BY
  CASE SourceKind
    WHEN N'Erp' THEN 0 WHEN N'Rmm' THEN 1 WHEN N'Backup' THEN 2
    WHEN N'Epp' THEN 3 WHEN N'Licensing' THEN 4 ELSE 9 END,
  ConnectionCode;

PRINT N'410 Integration connections ready (live statuses).';
GO
