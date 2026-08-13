/*
  CENTRAL — ensure SLA targets exist; optional empty dashboard snapshot stub for AHIC
  Measured % stay NULL until monitoring writes real values.

  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 241_Ensure_SlaAvailability_Stubs.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

/* Global SLA targets if empty */
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_SlaPolicy)
INSERT dbo.Dim_SlaPolicy (CustomerCode, Priority, RespondMins, ResolveMins, AvailabilityPct) VALUES
(NULL, N'Critical', 60, 240, 99.500),
(NULL, N'High', 240, 480, 99.500),
(NULL, N'Medium', 480, 1440, 99.500),
(NULL, N'Low', 1440, 4320, 99.500);

/* Optional: period shell with NULL measured metrics (idempotent by period) */
IF EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'AHIC' AND Active = 1)
AND OBJECT_ID(N'dbo.Fact_DashboardSnapshot', N'U') IS NOT NULL
BEGIN
  DECLARE @from date = DATEFROMPARTS(YEAR(SYSUTCDATETIME()), MONTH(SYSUTCDATETIME()), 1);
  DECLARE @to date = EOMONTH(SYSUTCDATETIME());

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Fact_DashboardSnapshot
    WHERE CustomerCode = N'AHIC' AND PeriodFrom = @from AND PeriodTo = @to
  )
  BEGIN
    INSERT INTO dbo.Fact_DashboardSnapshot
    (
      CustomerCode, PeriodFrom, PeriodTo, PeriodLabel, AsOfAt,
      HealthRag, HealthSummary,
      AvailabilityPct, AvailabilitySlaPct,
      SlaResponsePct, SlaResolvePct, SlaCompliancePct
    )
    VALUES
    (
      N'AHIC', @from, @to, FORMAT(@from, 'MMM yyyy'), SYSUTCDATETIME(),
      N'Amber', N'Stub period - availability/SLA measured values not yet fed.',
      NULL, 99.500,
      NULL, NULL, NULL
    );
    PRINT N'Inserted AHIC Fact_DashboardSnapshot stub for current month.';
  END
  ELSE
    PRINT N'AHIC dashboard snapshot for period already exists.';
END

SELECT Priority, RespondMins, ResolveMins, AvailabilityPct
FROM dbo.Dim_SlaPolicy WHERE Active = 1 ORDER BY 1;

SELECT TOP 3 CustomerCode, PeriodLabel, AvailabilityPct, AvailabilitySlaPct, SlaCompliancePct
FROM dbo.Fact_DashboardSnapshot WHERE CustomerCode = N'AHIC' ORDER BY PeriodTo DESC;
GO
PRINT N'SLA / availability stubs ready.';
GO
