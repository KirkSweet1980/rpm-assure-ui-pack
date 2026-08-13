/*
  CENTRAL — staff roles for Portfolio auth mapping
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 231_Staff_Roles.sql
  (or -U sa / admin)

  Better Auth holds passwords; App_User holds authorisation by Email match.
*/
USE RPMAssure_App;
GO

IF COL_LENGTH(N'dbo.App_User', N'StaffRole') IS NULL
BEGIN
  ALTER TABLE dbo.App_User ADD StaffRole nvarchar(30) NULL;
  PRINT N'Added App_User.StaffRole';
END
GO

/* Drop old check if any, add new */
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_App_User_StaffRole')
  ALTER TABLE dbo.App_User DROP CONSTRAINT CK_App_User_StaffRole;
GO
ALTER TABLE dbo.App_User WITH NOCHECK
  ADD CONSTRAINT CK_App_User_StaffRole
  CHECK (StaffRole IS NULL OR StaffRole IN (
    N'PlatformAdmin', N'Operator', N'ExCo', N'TechnicalReadOnly'));
GO

/* Backfill admins */
UPDATE dbo.App_User
SET StaffRole = N'PlatformAdmin', IsPlatformAdmin = 1, UpdatedAt = SYSUTCDATETIME()
WHERE IsPlatformAdmin = 1 AND (StaffRole IS NULL OR StaffRole <> N'PlatformAdmin');
GO

/* Seed / upsert staff for local sign-in emails */
MERGE dbo.App_User AS t
USING (VALUES
  (N'administrator', N'administrator@rpm.local', N'Administrator', N'PlatformAdmin', 1),
  (N'admin',         N'admin@rpm.local',         N'Platform Admin', N'PlatformAdmin', 1),
  (N'operator',      N'operator@rpm.local',      N'Operator',       N'Operator', 0),
  (N'exco',          N'exco@rpm.local',          N'ExCo',           N'ExCo', 0),
  (N'techro',        N'tech@rpm.local',          N'Technical RO',   N'TechnicalReadOnly', 0)
) AS s(UserName, Email, DisplayName, StaffRole, IsPlatformAdmin)
ON t.Email = s.Email
WHEN MATCHED THEN UPDATE SET
  DisplayName = s.DisplayName,
  StaffRole = s.StaffRole,
  IsPlatformAdmin = s.IsPlatformAdmin,
  IsActive = 1,
  UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (UserName, Email, DisplayName, PasswordHash, IsPlatformAdmin, IsActive, StaffRole)
  VALUES (s.UserName, s.Email, s.DisplayName, NULL, s.IsPlatformAdmin, 1, s.StaffRole);
GO

SELECT UserName, Email, DisplayName, StaffRole, IsPlatformAdmin, IsActive
FROM dbo.App_User
ORDER BY StaffRole, Email;
GO

PRINT N'Done. Create matching Better Auth accounts at /login (same email).';
GO
