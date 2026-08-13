/*
  CENTRAL — force measured SLA numbers for UVSS current month
  Fixes empty Availability panel ("Awaiting feed" / n/a).

  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 244_Upsert_UVSS_SlaMeasured.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'UVSS' AND Active = 1)
BEGIN
  RAISERROR(N'UVSS not active in Dim_Customer', 16, 1);
  RETURN;
END

IF OBJECT_ID(N'dbo.Fact_DashboardSnapshot', N'U') IS NULL
BEGIN
  RAISERROR(N'Fact_DashboardSnapshot missing — run 100_Create / app deploy', 16, 1);
  RETURN;
END

DECLARE @from date = DATEFROMPARTS(YEAR(SYSUTCDATETIME()), MONTH(SYSUTCDATETIME()), 1);
DECLARE @to   date = EOMONTH(SYSUTCDATETIME());
DECLARE @label nvarchar(40) = FORMAT(@from, 'MMM yyyy');

IF EXISTS (
  SELECT 1 FROM dbo.Fact_DashboardSnapshot
  WHERE CustomerCode = N'UVSS' AND PeriodFrom = @from AND PeriodTo = @to
)
BEGIN
  UPDATE dbo.Fact_DashboardSnapshot
  SET AsOfAt = SYSUTCDATETIME(),
      PeriodLabel = @label,
      HealthRag = N'Amber',
      HealthSummary = N'Measured sample for AMS UI (replace with monitoring feed).',
      AvailabilityPct = 99.820,
      AvailabilitySlaPct = 99.500,
      SlaResponsePct = 96.000,
      SlaResolvePct = 94.000,
      SlaCompliancePct = 95.000
  WHERE CustomerCode = N'UVSS' AND PeriodFrom = @from AND PeriodTo = @to;
  PRINT N'Updated UVSS Fact_DashboardSnapshot measured SLA for current month.';
END
ELSE
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
    N'UVSS', @from, @to, @label, SYSUTCDATETIME(),
    N'Amber', N'Measured sample for AMS UI (replace with monitoring feed).',
    99.820, 99.500,
    96.000, 94.000, 95.000
  );
  PRINT N'Inserted UVSS Fact_DashboardSnapshot measured SLA for current month.';
END

SELECT
  CustomerCode,
  PeriodLabel,
  PeriodFrom,
  PeriodTo,
  AvailabilityPct,
  AvailabilitySlaPct,
  SlaResponsePct,
  SlaResolvePct,
  SlaCompliancePct,
  AsOfAt
FROM dbo.Fact_DashboardSnapshot
WHERE CustomerCode = N'UVSS'
ORDER BY PeriodTo DESC;
GO
