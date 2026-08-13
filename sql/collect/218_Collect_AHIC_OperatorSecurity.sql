/*
  AHIC security collect (site-tuned for discovered columns)
  - AdmOperGroup: GroupCode, Name  (group catalogue)
  - AdmOperGroupMult or AdmOperator: operator ↔ group membership
  - AdmOperAmendJnl: JnlDate, JnlTime, OperatorCode, ColumnName, Before, After

  sqlcmd -S "." -U Rpm_collect -P "..." -C -b -i thisfile.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'AHIC';
DECLARE @InstanceName nvarchar(100) = N'AHIC-SSQL-SRV';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);

PRINT CONCAT(N'=== AHIC operator security ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
    SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
    WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
    RAISERROR(N'AHIC not active.', 16, 1);
    RETURN;
END;

DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_OperGroup
WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;
DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_OperAmend
WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;

/* ---- 1) Operator memberships: prefer AdmOperGroupMult ---- */
DECLARE @mult int = OBJECT_ID(N'Sysprodb.dbo.AdmOperGroupMult');
DECLARE @memRows int = 0;

IF @mult IS NOT NULL
BEGIN
    PRINT N'AdmOperGroupMult columns:';
    SELECT c.name AS ColName FROM Sysprodb.sys.columns c WHERE c.object_id = @mult ORDER BY c.column_id;

    DECLARE @mOp sysname = (
        SELECT TOP 1 c.name FROM Sysprodb.sys.columns c WHERE c.object_id = @mult
          AND c.name IN (N'Operator', N'OperatorCode', N'Oper')
        ORDER BY CASE c.name WHEN N'Operator' THEN 1 WHEN N'OperatorCode' THEN 2 ELSE 3 END);
    DECLARE @mGrp sysname = (
        SELECT TOP 1 c.name FROM Sysprodb.sys.columns c WHERE c.object_id = @mult
          AND c.name IN (N'OperatorGroup', N'GroupCode', N'Group', N'OperGroup')
        ORDER BY CASE c.name WHEN N'GroupCode' THEN 1 WHEN N'OperatorGroup' THEN 2 ELSE 3 END);

    IF @mOp IS NULL OR @mGrp IS NULL
    BEGIN
        /* first two string cols */
        SELECT TOP 1 @mOp = c.name FROM Sysprodb.sys.columns c
        JOIN Sysprodb.sys.types t ON t.user_type_id = c.user_type_id
        WHERE c.object_id = @mult AND t.name IN (N'char',N'nchar',N'varchar',N'nvarchar')
        ORDER BY c.column_id;
        SELECT TOP 1 @mGrp = c.name FROM Sysprodb.sys.columns c
        JOIN Sysprodb.sys.types t ON t.user_type_id = c.user_type_id
        WHERE c.object_id = @mult AND t.name IN (N'char',N'nchar',N'varchar',N'nvarchar')
          AND c.name <> @mOp
        ORDER BY c.column_id;
    END

    PRINT CONCAT(N'Mult map: op=', ISNULL(@mOp,N'?'), N' grp=', ISNULL(@mGrp,N'?'));

    IF @mOp IS NOT NULL AND @mGrp IS NOT NULL
    BEGIN
        DECLARE @sqlM nvarchar(max) = N'
        INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_OperGroup
          (SnapshotDate, InstanceName, OperatorCode, GroupCode, GroupName, ImportedAt)
        SELECT @snap, @inst,
          LTRIM(RTRIM(CONVERT(nvarchar(50), m.' + QUOTENAME(@mOp) + N'))),
          LTRIM(RTRIM(CONVERT(nvarchar(50), m.' + QUOTENAME(@mGrp) + N'))),
          LTRIM(RTRIM(CONVERT(nvarchar(200), COALESCE(g.Name, m.' + QUOTENAME(@mGrp) + N')))),
          SYSUTCDATETIME()
        FROM Sysprodb.dbo.AdmOperGroupMult AS m
        LEFT JOIN Sysprodb.dbo.AdmOperGroup AS g
          ON LTRIM(RTRIM(CONVERT(nvarchar(50), g.GroupCode)))
           = LTRIM(RTRIM(CONVERT(nvarchar(50), m.' + QUOTENAME(@mGrp) + N')))
        WHERE m.' + QUOTENAME(@mOp) + N' IS NOT NULL;';
        BEGIN TRY
            EXEC sys.sp_executesql @sqlM, N'@snap date, @inst nvarchar(100)',
                @snap=@SnapshotDate, @inst=@InstanceName;
            SET @memRows = @@ROWCOUNT;
            PRINT CONCAT(N'OperGroup memberships (Mult): ', @memRows);
        END TRY
        BEGIN CATCH
            PRINT CONCAT(N'Mult FAIL: ', ERROR_MESSAGE());
        END CATCH
    END
END

/* ---- 2) Fallback: group code on AdmOperator ---- */
IF @memRows = 0 AND OBJECT_ID(N'Sysprodb.dbo.AdmOperator', N'U') IS NOT NULL
BEGIN
    DECLARE @opGrp sysname = (
        SELECT TOP 1 c.name FROM Sysprodb.sys.columns c
        WHERE c.object_id = OBJECT_ID(N'Sysprodb.dbo.AdmOperator')
          AND c.name IN (N'OperatorGroup', N'GroupCode', N'Group', N'DefaultGroup', N'SecurityGroup')
        ORDER BY 1);

    IF @opGrp IS NOT NULL
    BEGIN
        DECLARE @sqlO nvarchar(max) = N'
        INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_OperGroup
          (SnapshotDate, InstanceName, OperatorCode, GroupCode, GroupName, ImportedAt)
        SELECT @snap, @inst,
          LTRIM(RTRIM(CONVERT(nvarchar(50), o.Operator))),
          LTRIM(RTRIM(CONVERT(nvarchar(50), o.' + QUOTENAME(@opGrp) + N'))),
          LTRIM(RTRIM(CONVERT(nvarchar(200), COALESCE(g.Name, o.' + QUOTENAME(@opGrp) + N')))),
          SYSUTCDATETIME()
        FROM Sysprodb.dbo.AdmOperator AS o
        LEFT JOIN Sysprodb.dbo.AdmOperGroup AS g
          ON LTRIM(RTRIM(CONVERT(nvarchar(50), g.GroupCode)))
           = LTRIM(RTRIM(CONVERT(nvarchar(50), o.' + QUOTENAME(@opGrp) + N')))
        WHERE o.Operator IS NOT NULL
          AND o.' + QUOTENAME(@opGrp) + N' IS NOT NULL
          AND LTRIM(RTRIM(CONVERT(nvarchar(50), o.' + QUOTENAME(@opGrp) + N'))) <> N'''';';
        BEGIN TRY
            EXEC sys.sp_executesql @sqlO, N'@snap date, @inst nvarchar(100)',
                @snap=@SnapshotDate, @inst=@InstanceName;
            SET @memRows = @@ROWCOUNT;
            PRINT CONCAT(N'OperGroup memberships (AdmOperator.', @opGrp, N'): ', @memRows);
        END TRY
        BEGIN CATCH
            PRINT CONCAT(N'AdmOperator group FAIL: ', ERROR_MESSAGE());
        END CATCH
    END
    ELSE
        PRINT N'No group column on AdmOperator';
END

/* ---- 3) If still empty, store group catalogue as meta rows OperatorCode = *GROUP* ---- */
IF @memRows = 0 AND OBJECT_ID(N'Sysprodb.dbo.AdmOperGroup', N'U') IS NOT NULL
BEGIN
    INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_OperGroup
      (SnapshotDate, InstanceName, OperatorCode, GroupCode, GroupName, ImportedAt)
    SELECT @SnapshotDate, @InstanceName,
      N'*CATALOG*',
      LTRIM(RTRIM(CONVERT(nvarchar(50), g.GroupCode))),
      LTRIM(RTRIM(CONVERT(nvarchar(200), g.Name))),
      SYSUTCDATETIME()
    FROM Sysprodb.dbo.AdmOperGroup AS g
    WHERE g.GroupCode IS NOT NULL;
    PRINT CONCAT(N'OperGroup catalog rows (*CATALOG*): ', @@ROWCOUNT);
END

/* ---- 4) Amend journal ---- */
IF OBJECT_ID(N'Sysprodb.dbo.AdmOperAmendJnl', N'U') IS NOT NULL
BEGIN
    INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_OperAmend
      (SnapshotDate, InstanceName, OperatorCode, AmendDate, AmendType, Detail, ChangedBy, ImportedAt)
    SELECT TOP (500)
      @SnapshotDate,
      @InstanceName,
      LTRIM(RTRIM(CONVERT(nvarchar(50), j.OperatorCode))),
      TRY_CONVERT(datetime2(3), j.JnlDate),
      LTRIM(RTRIM(CONVERT(nvarchar(50), j.ColumnName))),
      LEFT(
        CONCAT(
          N'Before=', LTRIM(RTRIM(CONVERT(nvarchar(200), j.[Before]))),
          N' | After=', LTRIM(RTRIM(CONVERT(nvarchar(200), j.[After]))),
          N' | Tab=', LTRIM(RTRIM(CONVERT(nvarchar(50), j.TabPage)))
        ), 500),
      LTRIM(RTRIM(CONVERT(nvarchar(50), j.JnlOperator))),
      SYSUTCDATETIME()
    FROM Sysprodb.dbo.AdmOperAmendJnl AS j
    WHERE j.JnlDate IS NULL
       OR j.JnlDate >= DATEADD(DAY, -90, @SnapshotDate)
    ORDER BY j.JnlDate DESC, j.JnlTime DESC, j.JnlLine DESC;

    PRINT CONCAT(N'OperAmend rows: ', @@ROWCOUNT);
END
ELSE
    PRINT N'No AdmOperAmendJnl';

PRINT N'=== Done AHIC operator security ===';
GO
