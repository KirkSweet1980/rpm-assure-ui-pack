/*
  Ensure current-month SLA / availability snapshot for EVERY active customer.
  Does not overwrite non-seed measured rows that already have real percentages
  unless @Force = 1.

  sqlcmd ... -i 401_Upsert_Sla_All_Active.sql
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

DECLARE @Force bit = 0; -- set 1 to overwrite existing measured values
DECLARE @now datetime2(3) = SYSUTCDATETIME();
DECLARE @from date = DATEFROMPARTS(YEAR(@now), MONTH(@now), 1);
DECLARE @to date = EOMONTH(@now);
DECLARE @label nvarchar(40) = FORMAT(@from, 'MMM yyyy');

DECLARE c CURSOR LOCAL FAST_FORWARD FOR
  SELECT CustomerCode FROM dbo.Dim_Customer WHERE Active = 1;

DECLARE @code nvarchar(50);
OPEN c;
FETCH NEXT FROM c INTO @code;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF EXISTS (
    SELECT 1 FROM dbo.Fact_DashboardSnapshot
    WHERE CustomerCode = @code AND PeriodFrom = @from AND PeriodTo = @to
  )
  BEGIN
    IF @Force = 1
      OR EXISTS (
        SELECT 1 FROM dbo.Fact_DashboardSnapshot
        WHERE CustomerCode = @code AND PeriodFrom = @from AND PeriodTo = @to
          AND (SlaCompliancePct IS NULL OR AvailabilityPct IS NULL
               OR HealthSummary LIKE N'%[AMS seed]%'
               OR HealthSummary LIKE N'%Measured sample%')
      )
    BEGIN
      UPDATE dbo.Fact_DashboardSnapshot
      SET AsOfAt = @now,
          PeriodLabel = @label,
          HealthRag = COALESCE(HealthRag, N'Amber'),
          HealthSummary = COALESCE(
            NULLIF(HealthSummary, N''),
            N'Measured sample for AMS UI — replace with monitoring/ITSM feed. [AMS seed]'),
          AvailabilityPct = COALESCE(AvailabilityPct, 99.700),
          AvailabilitySlaPct = COALESCE(AvailabilitySlaPct, 99.500),
          SlaResponsePct = COALESCE(SlaResponsePct, 96.000),
          SlaResolvePct = COALESCE(SlaResolvePct, 94.000),
          SlaCompliancePct = COALESCE(SlaCompliancePct, 95.000)
      WHERE CustomerCode = @code AND PeriodFrom = @from AND PeriodTo = @to;
      PRINT CONCAT(N'Updated SLA snap ', @code);
    END
    ELSE
      PRINT CONCAT(N'Skip existing measured ', @code);
  END
  ELSE
  BEGIN
    INSERT INTO dbo.Fact_DashboardSnapshot (
      CustomerCode, PeriodFrom, PeriodTo, PeriodLabel, AsOfAt,
      HealthRag, HealthSummary,
      AvailabilityPct, AvailabilitySlaPct, SlaResponsePct, SlaResolvePct, SlaCompliancePct
    ) VALUES (
      @code, @from, @to, @label, @now,
      N'Amber',
      N'Measured sample for AMS UI — replace with monitoring/ITSM feed. [AMS seed]',
      99.700, 99.500, 96.000, 94.000, 95.000
    );
    PRINT CONCAT(N'Inserted SLA snap ', @code);
  END

  /* Default SLA policies per customer if none */
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_SlaPolicy WHERE CustomerCode = @code AND Active = 1)
  BEGIN
    INSERT INTO dbo.Dim_SlaPolicy (CustomerCode, Priority, RespondMins, ResolveMins, AvailabilityPct)
    VALUES
      (@code, N'Critical', 60, 240, 99.500),
      (@code, N'High', 240, 480, 99.500),
      (@code, N'Medium', 480, 1440, 99.500),
      (@code, N'Low', 1440, 4320, 99.500);
    PRINT CONCAT(N'SLA policies created ', @code);
  END

  FETCH NEXT FROM c INTO @code;
END
CLOSE c; DEALLOCATE c;

SELECT CustomerCode, PeriodLabel, AvailabilityPct, SlaResponsePct, SlaResolvePct, SlaCompliancePct, AsOfAt
FROM dbo.Fact_DashboardSnapshot
WHERE PeriodFrom = @from AND PeriodTo = @to
ORDER BY CustomerCode;
GO
