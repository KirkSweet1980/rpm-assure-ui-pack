/*
  AHIC collect — operators + LastLoginDate (deduped by OperatorCode)
  Run ON AHIC-SSQL-SRV as Rpm_collect.
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode   nvarchar(50)  = N'AHIC';
DECLARE @InstanceName   nvarchar(100) = N'AHIC-SSQL-SRV';
DECLARE @SnapshotDate   date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);

PRINT CONCAT(N'=== AHIC collect+login start ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
    SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
    WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
    RAISERROR(N'AHIC not found/active on central Dim_Customer.', 16, 1);
    RETURN;
END;

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer_SyncLog
    (ActionType, CustomerCode, Detail, DryRun)
VALUES (N'SysproCollectStart', @CustomerCode,
    CONCAT(N'AHIC operators+login snap=', CONVERT(char(10), @SnapshotDate, 23)), 0);

DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators
WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;

DECLARE @loginObj int = OBJECT_ID(N'Sysprodb.dbo.AdmOperatorLogin');
DECLARE @opCol sysname = NULL;
DECLARE @dtCol sysname = NULL;
DECLARE @sql nvarchar(max);
DECLARE @rc int;

IF @loginObj IS NOT NULL
BEGIN
    SELECT TOP (1) @opCol = c.name
    FROM Sysprodb.sys.columns c
    WHERE c.object_id = @loginObj
      AND c.name IN (N'Operator', N'OperatorCode', N'Oper', N'UserName', N'UserId')
    ORDER BY CASE c.name
        WHEN N'Operator' THEN 1 WHEN N'OperatorCode' THEN 2 ELSE 9 END;

    SELECT TOP (1) @dtCol = c.name
    FROM Sysprodb.sys.columns c
    JOIN Sysprodb.sys.types t ON t.user_type_id = c.user_type_id
    WHERE c.object_id = @loginObj
      AND t.name IN (N'datetime', N'datetime2', N'smalldatetime', N'date')
    ORDER BY CASE c.name
        WHEN N'LoginDateTime' THEN 0
        WHEN N'LoginDate' THEN 1
        WHEN N'LastLogin' THEN 2
        WHEN N'SystemDate' THEN 3
        WHEN N'LogDate' THEN 4
        WHEN N'DateTime' THEN 5
        ELSE 9 END;

    PRINT CONCAT(N'Login table: AdmOperatorLogin opCol=', ISNULL(@opCol,N'?'), N' dtCol=', ISNULL(@dtCol,N'?'));
END
ELSE
    PRINT N'No Sysprodb.dbo.AdmOperatorLogin — LastLoginDate will be NULL';

IF @loginObj IS NOT NULL AND @opCol IS NOT NULL AND @dtCol IS NOT NULL
BEGIN
    SET @sql = N'
INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators
(
    SnapshotDate, InstanceName, OperatorCode, OperatorName,
    GroupCode, Email, LastLoginDate, OperatorStatus, ImportedAt
)
SELECT
    @SnapshotDate,
    @InstanceName,
    o.OperatorCode,
    o.OperatorName,
    NULL,
    NULL,
    lg.LastLogin,
    N''Active'',
    SYSUTCDATETIME()
FROM (
    SELECT
        LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))) AS OperatorCode,
        MAX(LTRIM(RTRIM(CONVERT(nvarchar(200), Name)))) AS OperatorName
    FROM Sysprodb.dbo.AdmOperator
    WHERE Operator IS NOT NULL
      AND LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))) <> N''''
    GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), Operator)))
) AS o
OUTER APPLY (
    SELECT MAX(l.' + QUOTENAME(@dtCol) + N') AS LastLogin
    FROM Sysprodb.dbo.AdmOperatorLogin AS l
    WHERE LTRIM(RTRIM(CONVERT(nvarchar(50), l.' + QUOTENAME(@opCol) + N'))) = o.OperatorCode
) AS lg;';

    EXEC sys.sp_executesql @sql,
        N'@SnapshotDate date, @InstanceName nvarchar(100)',
        @SnapshotDate = @SnapshotDate,
        @InstanceName = @InstanceName;
    SET @rc = @@ROWCOUNT;
END
ELSE
BEGIN
    INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators
    (
        SnapshotDate, InstanceName, OperatorCode, OperatorName,
        GroupCode, Email, LastLoginDate, OperatorStatus, ImportedAt
    )
    SELECT
        @SnapshotDate,
        @InstanceName,
        LTRIM(RTRIM(CONVERT(nvarchar(50), o.Operator))),
        MAX(LTRIM(RTRIM(CONVERT(nvarchar(200), o.Name)))),
        NULL,
        NULL,
        NULL,
        N'Active',
        SYSUTCDATETIME()
    FROM Sysprodb.dbo.AdmOperator AS o
    WHERE o.Operator IS NOT NULL
      AND LTRIM(RTRIM(CONVERT(nvarchar(50), o.Operator))) <> N''
    GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), o.Operator)));
    SET @rc = @@ROWCOUNT;
END

PRINT CONCAT(N'Operators rows written: ', @rc);

DECLARE @withLogin int = (
    SELECT COUNT(*) FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators
    WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName
      AND LastLoginDate IS NOT NULL
);
PRINT CONCAT(N'Operators with LastLoginDate: ', @withLogin);

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer_SyncLog
    (ActionType, CustomerCode, Detail, DryRun)
VALUES (N'SysproCollectEnd', @CustomerCode,
    CONCAT(N'AHIC complete snap=', CONVERT(char(10), @SnapshotDate, 23),
           N' withLogin=', @withLogin), 0);

PRINT N'=== Done AHIC (operators+login) ===';
GO
