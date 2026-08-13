/*
  RSS — AdmTaskGroup + AdmTaskItem → central
*/
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CustomerCode nvarchar(50)  = N'RSS';
DECLARE @InstanceName nvarchar(100) = N'RSS-PROD';
DECLARE @SnapshotDate date = CAST(
    CAST(SYSUTCDATETIME() AT TIME ZONE N'UTC' AT TIME ZONE N'South Africa Standard Time' AS date) AS date);

PRINT CONCAT(N'=== RSS Tasks ', CONVERT(char(10), @SnapshotDate, 23), N' ===');

IF NOT EXISTS (
    SELECT 1 FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
    WHERE CustomerCode = @CustomerCode AND Active = 1)
BEGIN
    RAISERROR(N'RSS not active on central.', 16, 1);
    RETURN;
END;

DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_TaskGroup
WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;
DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_TaskItem
WHERE SnapshotDate = @SnapshotDate AND InstanceName = @InstanceName;

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_TaskGroup
(
    SnapshotDate, InstanceName, OperatorCode, TaskGroup,
    AutoRun, AutoCheck, AutoMarkComplete, PromptBetTasks, SuppressErrors,
    StopIfError, AutoLockout, KillAll, EmailLogFile, ImportedAt
)
SELECT
    @SnapshotDate, @InstanceName,
    LTRIM(RTRIM(CONVERT(nvarchar(50), g.Operator))),
    LTRIM(RTRIM(CONVERT(nvarchar(100), g.TaskGroup))),
    g.AutoRun, g.AutoCheck, g.AutoMarkComplete, g.PromptBetTasks, g.SuppressErrors,
    g.StopIfError, g.AutoLockout, g.KillAll, g.EmailLogFile,
    SYSUTCDATETIME()
FROM Sysprodb.dbo.AdmTaskGroup AS g;

PRINT CONCAT(N'TaskGroup rows: ', @@ROWCOUNT);

INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_TaskItem
(
    SnapshotDate, InstanceName, OperatorCode, TaskGroup, StartDate, SequenceNumber,
    Description, Comment, TaskType, ProgramName, StartFolder, Occurrance, ImportedAt
)
SELECT
    @SnapshotDate, @InstanceName,
    LTRIM(RTRIM(CONVERT(nvarchar(50), i.Operator))),
    LTRIM(RTRIM(CONVERT(nvarchar(100), i.TaskGroup))),
    i.StartDate,
    i.SequenceNumber,
    LTRIM(RTRIM(CONVERT(nvarchar(200), i.Description))),
    LTRIM(RTRIM(CONVERT(nvarchar(200), i.Comment))),
    LTRIM(RTRIM(CONVERT(nvarchar(20), i.TaskType))),
    LTRIM(RTRIM(CONVERT(nvarchar(200), i.Program))),
    LTRIM(RTRIM(CONVERT(nvarchar(200), i.StartFolder))),
    LTRIM(RTRIM(CONVERT(nvarchar(20), i.Occurrance))),
    SYSUTCDATETIME()
FROM Sysprodb.dbo.AdmTaskItem AS i;

PRINT CONCAT(N'TaskItem rows: ', @@ROWCOUNT);
PRINT N'=== Done RSS Tasks ===';
GO
