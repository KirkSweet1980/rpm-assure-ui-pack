USE [RPMAssure_App];
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'OwnerName') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD OwnerName nvarchar(200) NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'SourceSystem') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD SourceSystem nvarchar(50) NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'FirstResponseAt') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD FirstResponseAt datetime2(3) NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'ResolvedAt') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ResolvedAt datetime2(3) NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'ClosedAt') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ClosedAt datetime2(3) NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'ResponseSlaMet') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ResponseSlaMet bit NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'ResolveSlaMet') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ResolveSlaMet bit NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'Priority') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD Priority nvarchar(20) NULL;
GO
IF COL_LENGTH(N'dbo.Fact_Incident', N'BusinessImpact') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD BusinessImpact nvarchar(max) NULL;
GO
SELECT name AS ColName FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Fact_Incident') ORDER BY column_id;
PRINT '313a OK';
GO
