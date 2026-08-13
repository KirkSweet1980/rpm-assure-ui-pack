/*
================================================================================
  RPM Assure — Seed v1
  - PlatformAdmin (Administrator)
  - Pilot customers: AHI Carriers, Sir Fruit, Redsun Raisins
  - Baseline report definitions
  - Sample open exceptions (demo)
================================================================================
  Password: set PasswordHash from the app (PBKDF2/bcrypt/argon2).
  Placeholder below is NOT a real login hash — replace before use.
================================================================================
*/

USE [RPMAssure];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRAN;

/* ---------- PlatformAdmin ---------- */
DECLARE @AdminId uniqueidentifier = 'A0000000-0000-4000-8000-000000000001';

IF NOT EXISTS (SELECT 1 FROM dbo.AppUser WHERE UserName = N'administrator')
BEGIN
    INSERT INTO dbo.AppUser
    (
        AppUserId, UserName, Email, DisplayName,
        PasswordHash, IsPlatformAdmin, IsActive,
        CreatedSast, ModifiedSast
    )
    VALUES
    (
        @AdminId,
        N'administrator',
        N'administrator@rpm.local',
        N'Administrator',
        N'REPLACE_WITH_APP_PASSWORD_HASH',  -- generate via app
        1,
        1,
        dbo.fn_SastNow(),
        dbo.fn_SastNow()
    );
END
ELSE
BEGIN
    SELECT @AdminId = AppUserId FROM dbo.AppUser WHERE UserName = N'administrator';
    UPDATE dbo.AppUser SET IsPlatformAdmin = 1, IsActive = 1 WHERE AppUserId = @AdminId;
END

/* ---------- Pilot customers ---------- */
DECLARE @Cus1 uniqueidentifier = 'C0000000-0000-4000-8000-000000000001';
DECLARE @Cus2 uniqueidentifier = 'C0000000-0000-4000-8000-000000000002';
DECLARE @Cus3 uniqueidentifier = 'C0000000-0000-4000-8000-000000000003';

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerCode = N'CUS-00001')
BEGIN
    INSERT INTO dbo.Customer
        (CustomerId, CustomerCode, Name, Status, CreatedByAppUserId, CreatedSast, ModifiedSast)
    VALUES
        (@Cus1, N'CUS-00001', N'AHI Carriers',     N'Active', @AdminId, dbo.fn_SastNow(), dbo.fn_SastNow()),
        (@Cus2, N'CUS-00002', N'Sir Fruit',         N'Active', @AdminId, dbo.fn_SastNow(), dbo.fn_SastNow()),
        (@Cus3, N'CUS-00003', N'Redsun Raisins',    N'Active', @AdminId, dbo.fn_SastNow(), dbo.fn_SastNow());
END
ELSE
BEGIN
    SELECT @Cus1 = CustomerId FROM dbo.Customer WHERE CustomerCode = N'CUS-00001';
    SELECT @Cus2 = CustomerId FROM dbo.Customer WHERE CustomerCode = N'CUS-00002';
    SELECT @Cus3 = CustomerId FROM dbo.Customer WHERE CustomerCode = N'CUS-00003';
END

/* ---------- Placeholder connections (NeverConnected) ---------- */
DECLARE @Sources TABLE (Source nvarchar(30), DisplayName nvarchar(200));
INSERT INTO @Sources (Source, DisplayName) VALUES
    (N'Rmm',            N'RPM RMM Ecosystem'),
    (N'Epp',            N'RPM End Point Protection'),
    (N'Cove',           N'RPM Cloud Backup'),
    (N'PartnerCenter',  N'RPM Microsoft CSP'),
    (N'Graph',          N'Microsoft 365');

DECLARE @Cid uniqueidentifier;
DECLARE ccur CURSOR LOCAL FAST_FORWARD FOR
    SELECT CustomerId FROM dbo.Customer
    WHERE CustomerCode IN (N'CUS-00001', N'CUS-00002', N'CUS-00003') AND IsDeleted = 0;

OPEN ccur;
FETCH NEXT FROM ccur INTO @Cid;
WHILE @@FETCH_STATUS = 0
BEGIN
    INSERT INTO dbo.Connection (CustomerId, Source, DisplayName, Status, CreatedSast, ModifiedSast)
    SELECT @Cid, s.Source, s.DisplayName, N'NeverConnected', dbo.fn_SastNow(), dbo.fn_SastNow()
    FROM @Sources s
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.Connection c
        WHERE c.CustomerId = @Cid AND c.Source = s.Source
    );
    FETCH NEXT FROM ccur INTO @Cid;
END
CLOSE ccur;
DEALLOCATE ccur;

/* ---------- Report definitions ---------- */
MERGE dbo.ReportDefinition AS t
USING (VALUES
    (N'Portfolio.Exceptions',     N'Portfolio exceptions',        N'Portfolio', N'Portfolio', N'Open exceptions across customers'),
    (N'Portfolio.ConnectionHealth', N'Connection health',         N'Portfolio', N'Portfolio', N'Connection status fleet view'),
    (N'Customer.Overview',        N'Customer overview',           N'Customer',  N'Customer',  N'Customer summary pack'),
    (N'Device.Inventory',         N'Device inventory',            N'Customer',  N'Device',    N'Devices for a customer'),
    (N'Device.Offline',           N'Offline devices',             N'Customer',  N'Device',    N'Stale or offline devices'),
    (N'Backup.FailedJobs',        N'Failed backup jobs',          N'Customer',  N'Backup',    N'Failed or missed backup jobs'),
    (N'Backup.CoverageGaps',      N'Backup coverage gaps',        N'Customer',  N'Backup',    N'Devices without backup'),
    (N'Security.CoverageGaps',    N'EPP coverage gaps',           N'Customer',  N'Security',  N'Devices without healthy EPP'),
    (N'License.Subscriptions',    N'CSP subscriptions',           N'Customer',  N'License',   N'Purchased seats by SKU'),
    (N'License.TrueUp',           N'License true-up',             N'Customer',  N'License',   N'Purchased vs assigned')
) AS s (ReportCode, Name, Scope, Area, Description)
ON t.ReportCode = s.ReportCode
WHEN NOT MATCHED THEN
    INSERT (ReportCode, Name, Scope, Area, Description, IsActive, CreatedSast)
    VALUES (s.ReportCode, s.Name, s.Scope, s.Area, s.Description, 1, dbo.fn_SastNow());

/* ---------- Demo devices + backup + exceptions (AHI Carriers) ---------- */
DECLARE @Dev1 uniqueidentifier = 'D0000000-0000-4000-8000-000000000001';
DECLARE @Dev2 uniqueidentifier = 'D0000000-0000-4000-8000-000000000002';

IF NOT EXISTS (SELECT 1 FROM dbo.Device WHERE CustomerId = @Cus1 AND Hostname = N'AHI-DC01')
BEGIN
    INSERT INTO dbo.Device
    (
        DeviceId, CustomerId, Source, ExternalDeviceId, Hostname, DeviceType,
        OperatingSystem, IsOnline, LastSeenSast, EppStatus, HasBackup,
        CreatedSast, ModifiedSast
    )
    VALUES
    (
        @Dev1, @Cus1, N'Rmm', N'rmm-ahi-dc01', N'AHI-DC01', N'Server',
        N'Windows Server 2022', 1, dbo.fn_SastNow(), N'Healthy', 1,
        dbo.fn_SastNow(), dbo.fn_SastNow()
    ),
    (
        @Dev2, @Cus1, N'Rmm', N'rmm-ahi-fs01', N'AHI-FS01', N'Server',
        N'Windows Server 2019', 0, DATEADD(HOUR, -26, dbo.fn_SastNow()), N'Unknown', 0,
        dbo.fn_SastNow(), dbo.fn_SastNow()
    );
END
ELSE
BEGIN
    SELECT @Dev1 = DeviceId FROM dbo.Device WHERE CustomerId = @Cus1 AND Hostname = N'AHI-DC01';
    SELECT @Dev2 = DeviceId FROM dbo.Device WHERE CustomerId = @Cus1 AND Hostname = N'AHI-FS01';
END

IF NOT EXISTS (SELECT 1 FROM dbo.BackupJob WHERE CustomerId = @Cus1)
BEGIN
    INSERT INTO dbo.BackupJob
        (CustomerId, DeviceId, DeviceName, Result, StartedSast, EndedSast, ErrorMessage, CreatedSast)
    VALUES
        (@Cus1, @Dev1, N'AHI-DC01', N'Succeeded', DATEADD(HOUR, -6, dbo.fn_SastNow()), DATEADD(HOUR, -5, dbo.fn_SastNow()), NULL, dbo.fn_SastNow()),
        (@Cus1, @Dev2, N'AHI-FS01', N'Failed',    DATEADD(HOUR, -5, dbo.fn_SastNow()), DATEADD(HOUR, -5, dbo.fn_SastNow()), N'Demo: destination unreachable', dbo.fn_SastNow());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Exception WHERE CustomerId = @Cus1 AND Fingerprint = N'demo-backup-fail-ahi-fs01')
BEGIN
    INSERT INTO dbo.Exception
    (
        CustomerId, Source, Category, Severity, Status, Title, Detail,
        EntityType, EntityId, Fingerprint, OpenedSast, CreatedSast, ModifiedSast
    )
    VALUES
    (
        @Cus1, N'Cove', N'Backup', N'Critical', N'Open',
        N'Backup failed: AHI-FS01',
        N'Demo exception for RPM Cloud Backup failure.',
        N'Device', @Dev2, N'demo-backup-fail-ahi-fs01',
        dbo.fn_SastNow(), dbo.fn_SastNow(), dbo.fn_SastNow()
    ),
    (
        @Cus1, N'Rmm', N'Device', N'High', N'Open',
        N'Device offline: AHI-FS01',
        N'Demo: no contact for over 24 hours.',
        N'Device', @Dev2, N'demo-offline-ahi-fs01',
        dbo.fn_SastNow(), dbo.fn_SastNow(), dbo.fn_SastNow()
    );
END

/* ---------- Light demo rows for other pilots ---------- */
IF NOT EXISTS (SELECT 1 FROM dbo.Device WHERE CustomerId = @Cus2)
BEGIN
    INSERT INTO dbo.Device
        (CustomerId, Source, Hostname, DeviceType, IsOnline, LastSeenSast, EppStatus, HasBackup, CreatedSast, ModifiedSast)
    VALUES
        (@Cus2, N'Rmm', N'SIR-APP01', N'Server', 1, dbo.fn_SastNow(), N'Healthy', 1, dbo.fn_SastNow(), dbo.fn_SastNow()),
        (@Cus3, N'Rmm', N'RED-DC01',  N'Server', 1, dbo.fn_SastNow(), N'Degraded', 1, dbo.fn_SastNow(), dbo.fn_SastNow());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Exception WHERE CustomerId = @Cus3 AND Fingerprint = N'demo-epp-red-dc01')
BEGIN
    INSERT INTO dbo.Exception
    (
        CustomerId, Source, Category, Severity, Status, Title, Detail,
        Fingerprint, OpenedSast, CreatedSast, ModifiedSast
    )
    VALUES
    (
        @Cus3, N'Epp', N'Security', N'Medium', N'Open',
        N'EPP degraded: RED-DC01',
        N'Demo: Bitdefender / RPM End Point Protection status degraded.',
        N'demo-epp-red-dc01',
        dbo.fn_SastNow(), dbo.fn_SastNow(), dbo.fn_SastNow()
    );
END

/* ---------- Audit ---------- */
INSERT INTO dbo.AuditEvent (CustomerId, AppUserId, Action, EntityType, DetailJson, CreatedSast)
VALUES
(
    NULL,
    @AdminId,
    N'SeedApplied',
    N'Database',
    N'{"script":"002_RPMAssure_Insight_Seed","product":"RPM Assure"}',
    dbo.fn_SastNow()
);

COMMIT TRAN;

PRINT N'Seed complete: administrator (PlatformAdmin), 3 pilots, connections, demo data.';
PRINT N'Replace AppUser.PasswordHash before enabling local login.';
GO

/* ---------- Verify ---------- */
SELECT CustomerCode, Name, Status, IsDeleted FROM dbo.Customer ORDER BY CustomerCode;
SELECT UserName, IsPlatformAdmin, IsActive FROM dbo.AppUser;
SELECT c.CustomerCode, x.Source, x.DisplayName, x.Status
FROM dbo.Connection x
JOIN dbo.Customer c ON c.CustomerId = x.CustomerId
ORDER BY c.CustomerCode, x.Source;
SELECT c.CustomerCode, e.Severity, e.Status, e.Title
FROM dbo.Exception e
JOIN dbo.Customer c ON c.CustomerId = e.CustomerId
WHERE e.Status = N'Open'
ORDER BY c.CustomerCode, e.Severity;
GO
