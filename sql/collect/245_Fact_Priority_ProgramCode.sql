/*
  CENTRAL — add ProgramCode to Fact_Priority + seed IMP010 for AHIC
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 245_...
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.Fact_Priority', N'ProgramCode') IS NULL
BEGIN
  ALTER TABLE dbo.Fact_Priority ADD ProgramCode nvarchar(50) NULL;
  PRINT N'Added Fact_Priority.ProgramCode';
END
ELSE
  PRINT N'ProgramCode already exists';
GO

/* Backfill from title/detail when program-like tokens appear */
UPDATE p
SET ProgramCode = CASE
  WHEN Title LIKE N'%IMP010%' OR Detail LIKE N'%IMP010%' THEN N'IMP010'
  WHEN Title LIKE N'%IMP041%' OR Detail LIKE N'%IMP041%' THEN N'IMP041'
  WHEN Title LIKE N'%IMPFRM%' OR Detail LIKE N'%IMPFRM%' THEN N'IMPFRM'
  ELSE ProgramCode
END
FROM dbo.Fact_Priority p
WHERE ProgramCode IS NULL
  AND (Title LIKE N'%IMP%' OR Detail LIKE N'%IMP%');
PRINT CONCAT(N'Backfilled rows: ', @@ROWCOUNT);
GO

/* Ensure AHIC IMP010 priority is explicit */
IF EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'AHIC')
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.Fact_Priority
    WHERE CustomerCode = N'AHIC' AND ProgramCode = N'IMP010' AND Status = N'Active'
  )
  BEGIN
    INSERT INTO dbo.Fact_Priority
      (CustomerCode, Title, Detail, SortOrder, Status, PeriodLabel, ProgramCode)
    VALUES
      (N'AHIC',
       N'Reduce import job failures',
       N'Root-cause transaction nesting / ProgErrorCode 99; coordinate with operators.',
       2, N'Active', N'Aug 2026', N'IMP010');
    PRINT N'Inserted AHIC priority with ProgramCode=IMP010';
  END
  ELSE
  BEGIN
    UPDATE dbo.Fact_Priority
    SET ProgramCode = N'IMP010',
        Title = CASE WHEN Title LIKE N'%[SEED]%' THEN N'Reduce import job failures' ELSE Title END,
        UpdatedAt = SYSUTCDATETIME()
    WHERE CustomerCode = N'AHIC' AND ProgramCode = N'IMP010' AND Status = N'Active';
    PRINT N'Updated AHIC IMP010 priority';
  END
END
GO

SELECT SortOrder, ProgramCode, Title, LEFT(Detail, 80) AS Detail, PeriodLabel, Status
FROM dbo.Fact_Priority
WHERE CustomerCode = N'AHIC' AND Status = N'Active'
ORDER BY SortOrder;
GO
