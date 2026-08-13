/*
================================================================================
  RPM Assure — SYSPRO collection → RPMAssure_App
  Product : RPM Assure | Collector login: Rpm_collect (password NOT in this file)
================================================================================
  RUN FROM: a session that can READ the customer SYSPRO company database
            and WRITE via linked server RPM_CENTRAL → 102.222.21.220,14333 / RPMAssure_App

  MODES
  -----
  A) Linked server to central (typical on customer SQL):
       Linked server RPM_CENTRAL → 102.222.21.220,14333
       Uses four-part: [RPM_CENTRAL].[RPMAssure_App].dbo.*

  B) Already connected TO RPMAssure_App with synonyms/linked server TO customer:
       Set @UseLocalCentral = 1 and @SourceFourPart = N'CUSTLINK.SysproCompany.dbo'

  PARAMETERS (edit below) — required each run
  --------------------------------------------
  @CustomerCode   — e.g. N'AHIC'  (must exist in Dim_Customer)
  @InstanceName   — e.g. N'AHI-SQL\SYSPRO'  (matches Dim_Customer.SqlInstanceName)
  @CompanyDb      — SYSPRO company database name on customer server
  @SnapshotDate   — date of this collection (usually CAST(GETDATE() AS date) in SAST)

  EXTRACTS → RPMAssure_App
  ------------------------
  1. Syspro_Operators     ← AdmOperator (+ last login if available)
  2. Syspro_JobLogging    ← job/program log (last @JobLogDays days)
  3. Syspro_HealthLog     ← health log if object exists
  4. Syspro_Dtr*Balances  ← Datarapt DTR tables if present (optional)

  Source object names differ by SYSPRO version / customisation.
  Defaults below match common naming; override with @Src* variables.
================================================================================
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

/* ========================= EDIT THESE ========================= */
DECLARE @CustomerCode   nvarchar(50)  = N'AHIC';              -- REQUIRED
DECLARE @InstanceName   nvarchar(100) = N'CHANGE_ME_INSTANCE'; -- REQUIRED (Dim_Customer.SqlInstanceName)
DECLARE @CompanyDb      sysname       = N'SysproCompany';      -- REQUIRED customer company DB
DECLARE @SnapshotDate   date          = CAST(
        CAST(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'South Africa Standard Time' AS date)
    AS date);

/* Central RPMAssure_App */
DECLARE @CentralFourPart nvarchar(256) = N'[RPM_CENTRAL].[RPMAssure_App]';  -- linked → 102.222.21.220,14333
/* If you are already IN RPMAssure_App and read customer via linked server: */
DECLARE @UseLocalCentral bit = 0;  -- 1 = central is local DB RPMAssure_App
DECLARE @SourceFourPart  nvarchar(256) = NULL;
/* Example when @UseLocalCentral = 1:
   SET @SourceFourPart = N'[CUSTOMER_LINK].[SysproCompany].dbo';
*/

/* How many days of job log to pull */
DECLARE @JobLogDays int = 14;

/* Source table/view names inside company DB (adjust per site) */
DECLARE @SrcOperator        sysname = N'AdmOperator';
DECLARE @SrcJobLog          sysname = N'AdmJobLogging';      -- change if yours differs
DECLARE @SrcHealthLog       sysname = N'AdmHealthLog';       -- optional; skip if missing
/* Datarapt balance tables (optional — often in same DB or Datarapt DB) */
DECLARE @SrcDtrPrefix       sysname = N'Dtr';               -- DtrApBalances, DtrArBalances, ...
DECLARE @CollectDtr         bit     = 1;                   -- 0 = skip DTR
/* ============================================================== */

DECLARE @sql nvarchar(max);

DECLARE @SrcDb sysname = @CompanyDb;
DECLARE @Central nvarchar(300) = CASE WHEN @UseLocalCentral = 1 THEN N'[RPMAssure_App]' ELSE @CentralFourPart END;
DECLARE @From nvarchar(400);

IF @UseLocalCentral = 1 AND (@SourceFourPart IS NULL OR @SourceFourPart = N'')
BEGIN
    RAISERROR('When @UseLocalCentral=1 set @SourceFourPart to customer linked server path.', 16, 1);
    RETURN;
END

IF @UseLocalCentral = 0
    SET @From = QUOTENAME(@CompanyDb) + N'.dbo.';
ELSE
    SET @From = @SourceFourPart;
    IF RIGHT(@From, 1) <> N'.' AND @From NOT LIKE N'%.dbo' AND @From NOT LIKE N'%.dbo.'
        SET @From = @From + CASE WHEN @From LIKE N'%.dbo' THEN N'.' ELSE N'.dbo.' END;

PRINT '=== RPM Assure SYSPRO collect ===';
PRINT 'CustomerCode = ' + @CustomerCode;
PRINT 'InstanceName = ' + @InstanceName;
PRINT 'SnapshotDate = ' + CONVERT(char(10), @SnapshotDate, 23);
PRINT 'Source From  = ' + @From;
PRINT 'Central      = ' + @Central;

/* ---------- Validate customer on central ---------- */
SET @sql = N'
IF NOT EXISTS (
    SELECT 1 FROM ' + @Central + N'.dbo.Dim_Customer
    WHERE CustomerCode = @c AND Active = 1
)
BEGIN
    RAISERROR(''CustomerCode not found/active in Dim_Customer on RPMAssure_App.'', 16, 1);
    RETURN;
END
';
EXEC sys.sp_executesql @sql, N'@c nvarchar(50)', @c = @CustomerCode;

/* ---------- Sync log start ---------- */
SET @sql = N'
INSERT INTO ' + @Central + N'.dbo.Dim_Customer_SyncLog (ActionType, CustomerCode, Detail, DryRun)
VALUES (N''SysproCollectStart'', @c, @d, 0);';
EXEC sys.sp_executesql @sql,
    N'@c nvarchar(50), @d nvarchar(500)',
    @c = @CustomerCode,
    @d = N'Instance=' + @InstanceName + N'; CompanyDb=' + @CompanyDb + N'; Snap=' + CONVERT(char(10), @SnapshotDate, 23);

/* ======================================================================== */
/*  1) OPERATORS → Syspro_Operators                                           */
/* ======================================================================== */
PRINT 'Collecting operators...';

SET @sql = N'
DELETE FROM ' + @Central + N'.dbo.Syspro_Operators
WHERE SnapshotDate = @snap AND InstanceName = @inst;

INSERT INTO ' + @Central + N'.dbo.Syspro_Operators
(
    SnapshotDate, InstanceName, OperatorCode, OperatorName, GroupCode,
    Email, LastLoginDate, OperatorStatus, ImportedAt
)
SELECT
    @snap,
    @inst,
    LTRIM(RTRIM(o.Operator)) AS OperatorCode,
    LTRIM(RTRIM(o.Name)) AS OperatorName,
    LTRIM(RTRIM(o.OperatorGroup)) AS GroupCode,
    NULLIF(LTRIM(RTRIM(o.Email)), N'''') AS Email,
    /* Last login: try common column names via COALESCE of optional cols — base uses NULL if missing */
    TRY_CONVERT(datetime2(3), NULL) AS LastLoginDate,
    N''Active'' AS OperatorStatus,
    SYSUTCDATETIME()
FROM ' + @From + QUOTENAME(@SrcOperator) + N' AS o
WHERE o.Operator IS NOT NULL
  AND LTRIM(RTRIM(o.Operator)) <> N'''';
';

BEGIN TRY
    EXEC sys.sp_executesql @sql,
        N'@snap date, @inst nvarchar(100)',
        @snap = @SnapshotDate, @inst = @InstanceName;
    PRINT 'Operators: OK';
END TRY
BEGIN CATCH
    PRINT 'Operators: FAILED — check @SrcOperator / column names (AdmOperator).';
    PRINT ERROR_MESSAGE();
END CATCH;

/* Optional: update LastLoginDate if your site has a login history table.
   Example (uncomment and adjust):
SET @sql = N'
UPDATE t SET LastLoginDate = x.LastLogin
FROM ' + @Central + N'.dbo.Syspro_Operators t
INNER JOIN (
  SELECT Operator, MAX(LogonDate) LastLogin
  FROM ' + @From + N'[AdmOperatorLogon] GROUP BY Operator
) x ON x.Operator = t.OperatorCode
WHERE t.SnapshotDate = @snap AND t.InstanceName = @inst;
';
*/

/* ======================================================================== */
/*  2) JOB LOGGING → Syspro_JobLogging                                        */
/*     Expected source columns (map if different):                            */
/*     ProgRunDate, ProgRunTime, ProgEndDate, ProgEndTime, ProgramName,       */
/*     Operator, GroupCode / OperatorGroup, ProgErrorCode, Message, ...       */
/* ======================================================================== */
PRINT 'Collecting job logging...';

SET @sql = N'
DELETE FROM ' + @Central + N'.dbo.Syspro_JobLogging
WHERE SnapshotDate = @snap AND InstanceName = @inst;

INSERT INTO ' + @Central + N'.dbo.Syspro_JobLogging
(
    SnapshotDate, InstanceName, CompanyDb,
    ProgramName, Operator, Message, ProgErrorCode, ErrorStatusCode,
    TransactionStatus, ProgRunDate, ImpactDate, ImportedAt
)
SELECT
    @snap,
    @inst,
    @cdb,
    LTRIM(RTRIM(j.ProgramName)),
    LTRIM(RTRIM(j.Operator)),
    j.Message,
    TRY_CONVERT(decimal(18,2), j.ProgErrorCode),
    NULL,
    j.TransactionStatus,
    TRY_CONVERT(datetime2(3), j.ProgRunDate),
    TRY_CONVERT(datetime2(3), j.ProgRunDate),
    SYSUTCDATETIME()
FROM ' + @From + QUOTENAME(@SrcJobLog) + N' AS j
WHERE TRY_CONVERT(datetime2(3), j.ProgRunDate) >= DATEADD(DAY, -@days, CAST(@snap AS datetime2))
   OR j.ProgRunDate IS NULL;
';

BEGIN TRY
    EXEC sys.sp_executesql @sql,
        N'@snap date, @inst nvarchar(100), @cdb nvarchar(100), @days int',
        @snap = @SnapshotDate, @inst = @InstanceName, @cdb = @CompanyDb, @days = @JobLogDays;
    PRINT 'JobLogging: OK';
END TRY
BEGIN CATCH
    PRINT 'JobLogging: FAILED — set @SrcJobLog to your real table (see site docs).';
    PRINT ERROR_MESSAGE();
END CATCH;

/* ======================================================================== */
/*  3) HEALTH LOG (optional)                                                  */
/* ======================================================================== */
PRINT 'Collecting health log (optional)...';

SET @sql = N'
IF OBJECT_ID(N''' + REPLACE(@From, N'''', N'''''') + @SrcHealthLog + N''', N''U'') IS NULL
   AND OBJECT_ID(N''' + REPLACE(@From, N'''', N'''''') + @SrcHealthLog + N''', N''V'') IS NULL
BEGIN
    PRINT ''HealthLog: source missing — skip'';
    RETURN;
END

DELETE FROM ' + @Central + N'.dbo.Syspro_HealthLog
WHERE SnapshotDate = @snap AND InstanceName = @inst;

INSERT INTO ' + @Central + N'.dbo.Syspro_HealthLog
(
    SnapshotDate, InstanceName, CompanyDb, RunDateTime, Operator,
    HealthFunction, Description, StatusFlag, Message, ImportedAt
)
SELECT
    @snap, @inst, @cdb,
    TRY_CONVERT(datetime2(3), h.RunDateTime),
    LTRIM(RTRIM(h.Operator)),
    h.HealthFunction,
    h.Description,
    h.StatusFlag,
    h.Message,
    SYSUTCDATETIME()
FROM ' + @From + QUOTENAME(@SrcHealthLog) + N' AS h;
';

BEGIN TRY
    /* Simpler health attempt without OBJECT_ID on four-part */
    SET @sql = N'
DELETE FROM ' + @Central + N'.dbo.Syspro_HealthLog
WHERE SnapshotDate = @snap AND InstanceName = @inst;

INSERT INTO ' + @Central + N'.dbo.Syspro_HealthLog
(
    SnapshotDate, InstanceName, CompanyDb, RunDateTime, Operator,
    HealthFunction, Description, StatusFlag, Message, ImportedAt
)
SELECT
    @snap, @inst, @cdb,
    TRY_CONVERT(datetime2(3), h.RunDateTime),
    LTRIM(RTRIM(h.Operator)),
    h.HealthFunction,
    h.Description,
    h.StatusFlag,
    h.Message,
    SYSUTCDATETIME()
FROM ' + @From + QUOTENAME(@SrcHealthLog) + N' AS h;
';
    EXEC sys.sp_executesql @sql,
        N'@snap date, @inst nvarchar(100), @cdb nvarchar(100)',
        @snap = @SnapshotDate, @inst = @InstanceName, @cdb = @CompanyDb;
    PRINT 'HealthLog: OK';
END TRY
BEGIN CATCH
    PRINT 'HealthLog: skipped or failed — ' + ERROR_MESSAGE();
END CATCH;

/* ======================================================================== */
/*  4) DATARAPT DTR (optional) — Level 3→2→1                                  */
/*     Source tables expected (same DB or change @From for Datarapt DB):      */
/*       DtrApBalances, DtrArBalances, DtrAssBalances, DtrCbBalances,          */
/*       DtrDnBalances, DtrGitBalances, DtrGrnBalances, DtrInvBalances,        */
/*       DtrWipBalances, DtrWpiBalances                                        */
/*     Columns (flexible mapping):                                            */
/*       GlYear, GlPeriod, InformationLevel, LevelKey, ParentLevelKey,        */
/*       GlCode, Branch/Warehouse/Dimension1, Description,                    */
/*       *OpenBalance/*CloseBalance or Sub*, GlOpenBalance, GlCloseBalance,   */
/*       Variance, RefreshDate                                                */
/* ======================================================================== */
IF @CollectDtr = 1
BEGIN
    PRINT 'Collecting Datarapt DTR balances...';

    DECLARE @Dtr TABLE (
        TypeCode nvarchar(10) NOT NULL,
        SrcTable sysname NOT NULL,
        DestTable sysname NOT NULL,
        Mode char(1) NOT NULL  -- A=Ap, R=Ar, I=Inv, S=Sub generic
    );
    INSERT INTO @Dtr (TypeCode, SrcTable, DestTable, Mode) VALUES
        (N'AP',  @SrcDtrPrefix + N'ApBalances',  N'Syspro_DtrApBalances',  'A'),
        (N'AR',  @SrcDtrPrefix + N'ArBalances',  N'Syspro_DtrArBalances',  'R'),
        (N'ASS', @SrcDtrPrefix + N'AssBalances', N'Syspro_DtrAssBalances', 'S'),
        (N'CB',  @SrcDtrPrefix + N'CbBalances',  N'Syspro_DtrCbBalances',  'S'),
        (N'DN',  @SrcDtrPrefix + N'DnBalances',  N'Syspro_DtrDnBalances',  'S'),
        (N'GIT', @SrcDtrPrefix + N'GitBalances', N'Syspro_DtrGitBalances', 'S'),
        (N'GRN', @SrcDtrPrefix + N'GrnBalances', N'Syspro_DtrGrnBalances', 'S'),
        (N'INV', @SrcDtrPrefix + N'InvBalances', N'Syspro_DtrInvBalances', 'I'),
        (N'WIP', @SrcDtrPrefix + N'WipBalances', N'Syspro_DtrWipBalances', 'S'),
        (N'WPI', @SrcDtrPrefix + N'WpiBalances', N'Syspro_DtrWpiBalances', 'S');

    DECLARE @TypeCode nvarchar(10), @SrcTable sysname, @DestTable sysname, @Mode char(1);
    DECLARE dcur CURSOR LOCAL FAST_FORWARD FOR
        SELECT TypeCode, SrcTable, DestTable, Mode FROM @Dtr;
    OPEN dcur;
    FETCH NEXT FROM dcur INTO @TypeCode, @SrcTable, @DestTable, @Mode;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            IF @Mode = 'A'
                SET @sql = N'
DELETE FROM ' + @Central + N'.dbo.' + QUOTENAME(@DestTable) + N'
WHERE SnapshotDate=@snap AND InstanceName=@inst AND CompanyDb=@cdb;
INSERT INTO ' + @Central + N'.dbo.' + QUOTENAME(@DestTable) + N'
(SnapshotDate,InstanceName,CompanyDb,CustomerCode,GlYear,GlPeriod,InformationLevel,LevelKey,ParentLevelKey,
 GlCode,Dimension1,Branch,Description,ApOpenBalance,ApCloseBalance,GlOpenBalance,GlCloseBalance,Variance,RefreshDate,ImportedAt)
SELECT @snap,@inst,@cdb,@cust,
    TRY_CONVERT(int,s.GlYear), TRY_CONVERT(int,s.GlPeriod),
    TRY_CONVERT(tinyint,s.InformationLevel), s.LevelKey, s.ParentLevelKey,
    s.GlCode, COALESCE(s.Branch,s.Dimension1), s.Branch, s.Description,
    TRY_CONVERT(decimal(18,2),s.ApOpenBalance), TRY_CONVERT(decimal(18,2),s.ApCloseBalance),
    TRY_CONVERT(decimal(18,2),s.GlOpenBalance), TRY_CONVERT(decimal(18,2),s.GlCloseBalance),
    TRY_CONVERT(decimal(18,2),s.Variance), TRY_CONVERT(datetime2(3),s.RefreshDate), SYSUTCDATETIME()
FROM ' + @From + QUOTENAME(@SrcTable) + N' s;';
            ELSE IF @Mode = 'R'
                SET @sql = N'
DELETE FROM ' + @Central + N'.dbo.' + QUOTENAME(@DestTable) + N'
WHERE SnapshotDate=@snap AND InstanceName=@inst AND CompanyDb=@cdb;
INSERT INTO ' + @Central + N'.dbo.' + QUOTENAME(@DestTable) + N'
(SnapshotDate,InstanceName,CompanyDb,CustomerCode,GlYear,GlPeriod,InformationLevel,LevelKey,ParentLevelKey,
 GlCode,Dimension1,Branch,Description,ArOpenBalance,ArCloseBalance,GlOpenBalance,GlCloseBalance,Variance,RefreshDate,ImportedAt)
SELECT @snap,@inst,@cdb,@cust,
    TRY_CONVERT(int,s.GlYear), TRY_CONVERT(int,s.GlPeriod),
    TRY_CONVERT(tinyint,s.InformationLevel), s.LevelKey, s.ParentLevelKey,
    s.GlCode, COALESCE(s.Branch,s.Dimension1), s.Branch, s.Description,
    TRY_CONVERT(decimal(18,2),s.ArOpenBalance), TRY_CONVERT(decimal(18,2),s.ArCloseBalance),
    TRY_CONVERT(decimal(18,2),s.GlOpenBalance), TRY_CONVERT(decimal(18,2),s.GlCloseBalance),
    TRY_CONVERT(decimal(18,2),s.Variance), TRY_CONVERT(datetime2(3),s.RefreshDate), SYSUTCDATETIME()
FROM ' + @From + QUOTENAME(@SrcTable) + N' s;';
            ELSE IF @Mode = 'I'
                SET @sql = N'
DELETE FROM ' + @Central + N'.dbo.' + QUOTENAME(@DestTable) + N'
WHERE SnapshotDate=@snap AND InstanceName=@inst AND CompanyDb=@cdb;
INSERT INTO ' + @Central + N'.dbo.' + QUOTENAME(@DestTable) + N'
(SnapshotDate,InstanceName,CompanyDb,CustomerCode,GlYear,GlPeriod,InformationLevel,LevelKey,ParentLevelKey,
 GlCode,Dimension1,Warehouse,Description,InvOpenBalance,InvCloseBalance,GlOpenBalance,GlCloseBalance,Variance,RefreshDate,ImportedAt)
SELECT @snap,@inst,@cdb,@cust,
    TRY_CONVERT(int,s.GlYear), TRY_CONVERT(int,s.GlPeriod),
    TRY_CONVERT(tinyint,s.InformationLevel), s.LevelKey, s.ParentLevelKey,
    s.GlCode, COALESCE(s.Warehouse,s.Dimension1), s.Warehouse, s.Description,
    TRY_CONVERT(decimal(18,2),s.InvOpenBalance), TRY_CONVERT(decimal(18,2),s.InvCloseBalance),
    TRY_CONVERT(decimal(18,2),s.GlOpenBalance), TRY_CONVERT(decimal(18,2),s.GlCloseBalance),
    TRY_CONVERT(decimal(18,2),s.Variance), TRY_CONVERT(datetime2(3),s.RefreshDate), SYSUTCDATETIME()
FROM ' + @From + QUOTENAME(@SrcTable) + N' s;';
            ELSE
                SET @sql = N'
DELETE FROM ' + @Central + N'.dbo.' + QUOTENAME(@DestTable) + N'
WHERE SnapshotDate=@snap AND InstanceName=@inst AND CompanyDb=@cdb;
INSERT INTO ' + @Central + N'.dbo.' + QUOTENAME(@DestTable) + N'
(SnapshotDate,InstanceName,CompanyDb,CustomerCode,GlYear,GlPeriod,InformationLevel,LevelKey,ParentLevelKey,
 GlCode,Dimension1,Description,SubOpenBalance,SubCloseBalance,GlOpenBalance,GlCloseBalance,Variance,RefreshDate,ImportedAt)
SELECT @snap,@inst,@cdb,@cust,
    TRY_CONVERT(int,s.GlYear), TRY_CONVERT(int,s.GlPeriod),
    TRY_CONVERT(tinyint,s.InformationLevel), s.LevelKey, s.ParentLevelKey,
    s.GlCode, COALESCE(s.Dimension1,s.Branch,s.Warehouse), s.Description,
    TRY_CONVERT(decimal(18,2),COALESCE(s.SubOpenBalance,s.OpenBalance)), TRY_CONVERT(decimal(18,2),COALESCE(s.SubCloseBalance,s.CloseBalance)),
    TRY_CONVERT(decimal(18,2),s.GlOpenBalance), TRY_CONVERT(decimal(18,2),s.GlCloseBalance),
    TRY_CONVERT(decimal(18,2),s.Variance), TRY_CONVERT(datetime2(3),s.RefreshDate), SYSUTCDATETIME()
FROM ' + @From + QUOTENAME(@SrcTable) + N' s;';

            EXEC sys.sp_executesql @sql,
                N'@snap date, @inst nvarchar(100), @cdb nvarchar(100), @cust nvarchar(50)',
                @snap=@SnapshotDate, @inst=@InstanceName, @cdb=@CompanyDb, @cust=@CustomerCode;
            PRINT 'DTR ' + @TypeCode + N': OK';
        END TRY
        BEGIN CATCH
            PRINT 'DTR ' + @TypeCode + N': skip/fail — ' + ERROR_MESSAGE();
        END CATCH;

        FETCH NEXT FROM dcur INTO @TypeCode, @SrcTable, @DestTable, @Mode;
    END
    CLOSE dcur; DEALLOCATE dcur;
END
ELSE
    PRINT 'DTR collection disabled (@CollectDtr=0).';

/* ---------- Sync log end ---------- */
SET @sql = N'
INSERT INTO ' + @Central + N'.dbo.Dim_Customer_SyncLog (ActionType, CustomerCode, Detail, DryRun)
VALUES (N''SysproCollectEnd'', @c, @d, 0);';
EXEC sys.sp_executesql @sql,
    N'@c nvarchar(50), @d nvarchar(500)',
    @c = @CustomerCode,
    @d = N'Completed snap=' + CONVERT(char(10), @SnapshotDate, 23);

PRINT '=== Collect finished for ' + @CustomerCode + N' ===';
PRINT 'Verify: SELECT * FROM RPMAssure_App.dbo.vw_Kpi_PortfolioDashboard WHERE CustomerCode = ''' + @CustomerCode + N''';';
GO
