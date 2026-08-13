/*
  Remove product name Datarapt from AMS seed titles; expand CB wording.
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i 315_Rename_Datarapt_Labels.sql
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;
GO

UPDATE dbo.Fact_Incident
SET Title = N'Cashbook out of balance elevated pre month-end',
    UpdatedAt = SYSUTCDATETIME()
WHERE Title LIKE N'%Datarapt%CB%'
   OR Title LIKE N'%Datarapt%out-of-balance%';
GO

UPDATE dbo.Fact_Incident
SET Title = REPLACE(Title, N'Datarapt', N'FinSight'),
    UpdatedAt = SYSUTCDATETIME()
WHERE Title LIKE N'%Datarapt%';
GO

UPDATE dbo.Fact_Incident
SET Title = REPLACE(Title, N' out-of-balance ', N' out of balance '),
    UpdatedAt = SYSUTCDATETIME()
WHERE Title LIKE N'%out-of-balance%';
GO

UPDATE dbo.Fact_Incident
SET BusinessImpact = REPLACE(BusinessImpact, N'Datarapt', N'FinSight')
WHERE BusinessImpact LIKE N'%Datarapt%';
GO

IF OBJECT_ID(N'dbo.Fact_Risk', N'U') IS NOT NULL
BEGIN
  UPDATE dbo.Fact_Risk
  SET Title = REPLACE(Title, N'Datarapt / finance', N'FinSight / finance')
  WHERE Title LIKE N'%Datarapt%';

  UPDATE dbo.Fact_Risk
  SET Title = REPLACE(Title, N'Datarapt', N'FinSight')
  WHERE Title LIKE N'%Datarapt%';
END
GO

IF OBJECT_ID(N'dbo.Fact_Issue', N'U') IS NOT NULL
BEGIN
  UPDATE dbo.Fact_Issue
  SET Title = REPLACE(Title, N'Datarapt', N'FinSight')
  WHERE Title LIKE N'%Datarapt%';
END
GO

IF OBJECT_ID(N'dbo.Fact_Priority', N'U') IS NOT NULL
BEGIN
  UPDATE dbo.Fact_Priority
  SET Title = REPLACE(Title, N'Datarapt', N'FinSight')
  WHERE Title LIKE N'%Datarapt%';
END
GO

/* Balance type catalog names if present */
IF OBJECT_ID(N'dbo.Dim_DtrBalanceType', N'U') IS NOT NULL
BEGIN
  UPDATE dbo.Dim_DtrBalanceType SET BalanceTypeName = N'Cashbook' WHERE BalanceTypeCode = N'CB';
END
GO

PRINT '315: Datarapt labels removed from AMS seed text.';
SELECT Title, Status FROM dbo.Fact_Incident WHERE CustomerCode = N'AHIC' ORDER BY OpenedAt DESC;
GO
